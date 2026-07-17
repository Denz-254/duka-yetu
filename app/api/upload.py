"""Image upload routes for Duka Yetu."""

from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from fastapi.responses import JSONResponse
from app.core.dependencies import get_current_user
from app.core.config import settings

router = APIRouter()

# Try to import cloudinary, but handle gracefully if not installed
try:
    import cloudinary
    import cloudinary.uploader
    
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET
    )
    CLOUDINARY_AVAILABLE = True
except ImportError:
    CLOUDINARY_AVAILABLE = False
    print("⚠️ Cloudinary not installed - upload endpoint disabled")

@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """Upload an image to Cloudinary."""
    if not CLOUDINARY_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Cloudinary service is not available"
        )
    
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="File must be an image"
            )
        
        # Validate file size (max 5MB)
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        if size > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="Image must be less than 5MB"
            )
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            file.file,
            folder=f"duka_yetu/{current_user.business_id}/products",
            transformation=[
                {'width': 500, 'height': 500, 'crop': 'limit', 'quality': 'auto'}
            ]
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "url": result["secure_url"],
                "public_id": result["public_id"]
            }
        )
    except Exception as e:
        print(f"Upload error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(e)}"
        )
