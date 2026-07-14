"""Security utilities for authentication and authorization."""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from passlib.handlers.bcrypt import bcrypt
from fastapi import HTTPException, status

from app.core.config import settings

# Password hashing context - using bcrypt directly
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=settings.BCRYPT_ROUNDS,
)

def truncate_password(password: str, max_length: int = 72) -> str:
    """
    Truncate password to bcrypt's 72-byte limit.
    
    Args:
        password: Plain text password
        max_length: Maximum length (72 bytes for bcrypt)
        
    Returns:
        Truncated password
    """
    # Truncate to 72 bytes to avoid bcrypt ValueError
    return password[:max_length]

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.
    
    Args:
        plain_password: Plain text password
        hashed_password: Hashed password from database
        
    Returns:
        True if password matches, False otherwise
    """
    # Truncate password before verification
    truncated_password = truncate_password(plain_password)
    try:
        return pwd_context.verify(truncated_password, hashed_password)
    except ValueError as e:
        if "password cannot be longer than 72 bytes" in str(e):
            truncated_password = plain_password[:64]
            return pwd_context.verify(truncated_password, hashed_password)
        raise e
    except Exception as e:
        # Handle bcrypt version compatibility issues
        if "bcrypt" in str(e).lower():
            # Try with direct bcrypt if passlib fails
            try:
                import bcrypt as bcrypt_lib
                return bcrypt_lib.checkpw(
                    truncate_password(plain_password).encode('utf-8'),
                    hashed_password.encode('utf-8')
                )
            except:
                return False
        raise e

def get_password_hash(password: str) -> str:
    """
    Hash a password.
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password
    """
    # Truncate password before hashing
    truncated_password = truncate_password(password)
    try:
        return pwd_context.hash(truncated_password)
    except ValueError as e:
        if "password cannot be longer than 72 bytes" in str(e):
            truncated_password = password[:64]
            return pwd_context.hash(truncated_password)
        raise e
    except Exception as e:
        # If passlib fails, use bcrypt directly
        if "bcrypt" in str(e).lower():
            import bcrypt as bcrypt_lib
            salt = bcrypt_lib.gensalt(rounds=settings.BCRYPT_ROUNDS)
            hashed = bcrypt_lib.hashpw(
                truncate_password(password).encode('utf-8'),
                salt
            )
            return hashed.decode('utf-8')
        raise e

def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Data to encode in token
        expires_delta: Optional custom expiration time
        
    Returns:
        JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode.update({"exp": expire})
    
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )

def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token data
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def validate_token_expiry(payload: Dict[str, Any]) -> None:
    """
    Validate that the token hasn't expired.
    
    Args:
        payload: Decoded token payload
        
    Raises:
        HTTPException: If token has expired
    """
    exp = payload.get("exp")
    if exp:
        current_time = datetime.utcnow()
        expiry_time = datetime.fromtimestamp(exp)
        if current_time > expiry_time:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
