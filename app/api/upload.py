"""File upload routes using Cloudinary."""

from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
import cloudinary
import cloudinary.uploader
from typing import List
import os
import re
import uuid

from app.core.config import settings
from app.core.dependencies import require_owner
from app.models.user import User

router = APIRouter()

# Configure Cloudinary only if credentials are provided
if all([
    settings.CLOUDINARY_CLOUD_NAME,
    settings.CLOUDINARY_API_KEY,
    settings.CLOUDINARY_API_SECRET,
]):
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
    )
    print("✅ Cloudinary configured successfully")
else:
    print("⚠️ Cloudinary not configured - uploads will be disabled")

@router.post("/single")
async def upload_single_file(
    file: UploadFile = File(...),
    current_user: User = Depends(require_owner),
):
    """Upload a single file to Cloudinary."""
    if not all([settings.CLOUDINARY_CLOUD_NAME, settings.CLOUDINARY_API_KEY, settings.CLOUDINARY_API_SECRET]):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudinary is not configured"
        )

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file.content_type} not allowed. Allowed: {', '.join(allowed_types)}"
        )

    try:
        # Read file content
        contents = await file.read()
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Image must be 5 MB or smaller.",
            )
        safe_name = re.sub(r"[^a-zA-Z0-9_-]+", "-", os.path.splitext(file.filename or "image")[0]).strip("-")
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            contents,
            folder=f"duka_yetu/{current_user.business_id}",
            public_id=f"{safe_name or 'image'}-{uuid.uuid4().hex}",
            resource_type="image",
        )
        
        return {
            "url": result.get("secure_url"),
            "public_id": result.get("public_id"),
            "format": result.get("format"),
            "width": result.get("width"),
            "height": result.get("height"),
            "bytes": result.get("bytes"),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )

@router.post("/multiple")
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(require_owner),
):
    """Upload multiple files to Cloudinary."""
    if not all([settings.CLOUDINARY_CLOUD_NAME, settings.CLOUDINARY_API_KEY, settings.CLOUDINARY_API_SECRET]):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudinary is not configured"
        )

    uploaded_files = []
    failed_files = []
    if len(files) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A maximum of 10 images can be uploaded at once.",
        )

    for file in files:
        try:
            if file.content_type not in ["image/jpeg", "image/png", "image/gif", "image/webp"]:
                raise ValueError(f"File type {file.content_type} is not allowed.")
            contents = await file.read()
            if len(contents) > 5 * 1024 * 1024:
                raise ValueError("Image must be 5 MB or smaller.")
            safe_name = re.sub(r"[^a-zA-Z0-9_-]+", "-", os.path.splitext(file.filename or "image")[0]).strip("-")
            result = cloudinary.uploader.upload(
                contents,
                folder=f"duka_yetu/{current_user.business_id}",
                public_id=f"{safe_name or 'image'}-{uuid.uuid4().hex}",
                resource_type="image",
            )
            uploaded_files.append({
                "filename": file.filename,
                "url": result.get("secure_url"),
                "public_id": result.get("public_id"),
            })
        except Exception as e:
            failed_files.append({
                "filename": file.filename,
                "error": str(e)
            })

    return {
        "uploaded": uploaded_files,
        "failed": failed_files,
        "total": len(files),
        "success_count": len(uploaded_files),
        "failed_count": len(failed_files),
    }

@router.delete("/{public_id:path}")
async def delete_file(
    public_id: str,
    current_user: User = Depends(require_owner),
):
    """Delete a file from Cloudinary."""
    if not all([settings.CLOUDINARY_CLOUD_NAME, settings.CLOUDINARY_API_KEY, settings.CLOUDINARY_API_SECRET]):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudinary is not configured"
        )
    expected_prefix = f"duka_yetu/{current_user.business_id}/"
    if not public_id.startswith(expected_prefix):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete images owned by your business.",
        )

    try:
        result = cloudinary.uploader.destroy(public_id)
        return {"message": "File deleted successfully", "result": result}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Delete failed: {str(e)}"
        )
