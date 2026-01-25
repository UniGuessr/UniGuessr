"""
Script to upload local images to S3 and update database with S3 URLs.

Usage:
    cd backend
    uv run scripts/upload_images_to_s3.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from src.config import settings
from src.services.s3_service import s3_service


async def upload_images():
    """Upload images from Pics folder to S3 and update database."""
    
    print("="*70)
    print("Upload Images to S3")
    print("="*70)
    
    # Test S3 connection first
    print("\n🔌 Testing S3 connection...")
    if not s3_service.test_connection():
        print("❌ S3 connection failed!")
        print("Please check your AWS credentials in .env")
        return False
    print("✓ S3 connection successful!")
    
    # Find Pics directory
    pics_dir = Path(__file__).parent.parent / "Pics"
    if not pics_dir.exists():
        print(f"\n❌ Pics directory not found at: {pics_dir}")
        return False
    
    # Get all image files
    image_files = list(pics_dir.glob("*.jpg")) + list(pics_dir.glob("*.jpeg")) + list(pics_dir.glob("*.png"))
    
    if not image_files:
        print(f"\n❌ No image files found in {pics_dir}")
        return False
    
    print(f"\n📁 Found {len(image_files)} images in Pics folder")
    
    # Upload each image
    uploaded_urls = []
    for img_file in image_files:
        print(f"\n   Uploading {img_file.name}...")
        try:
            with open(img_file, 'rb') as f:
                image_content = f.read()
            
            # Determine content type
            content_type = "image/jpeg" if img_file.suffix.lower() in ['.jpg', '.jpeg'] else "image/png"
            
            # Upload to S3
            image_url = s3_service.upload_image(
                file_content=image_content,
                filename=img_file.name,
                content_type=content_type
            )
            
            if image_url:
                print(f"   ✓ Uploaded: {image_url}")
                uploaded_urls.append(image_url)
            else:
                print(f"   ❌ Failed to upload {img_file.name}")
        
        except Exception as e:
            print(f"   ❌ Error uploading {img_file.name}: {e}")
    
    print(f"\n✓ Successfully uploaded {len(uploaded_urls)}/{len(image_files)} images")
    
    # Print URLs for reference
    print("\n" + "="*70)
    print("Uploaded Image URLs:")
    print("="*70)
    for url in uploaded_urls:
        print(f"  {url}")
    
    print("\n" + "="*70)
    print("✅ Upload complete!")
    print("="*70)
    print("\nYou can now use these URLs in your seed_locations.py script")
    print("or create locations via the API endpoint.")
    
    return True


def main():
    """Run the upload script."""
    result = asyncio.run(upload_images())
    sys.exit(0 if result else 1)


if __name__ == "__main__":
    main()
