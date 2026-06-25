"""upload local images to s3 and update the database with s3 urls."""

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.s3_service import s3_service


async def upload_images():
    print("testing s3 connection...")
    if not s3_service.test_connection():
        print("s3 connection failed — check aws credentials in .secrets.{APP_ENV}")
        return False
    print("s3 ok")

    pics_dir = Path(__file__).parent.parent / "Pics"
    if not pics_dir.exists():
        print(f"pics directory not found: {pics_dir}")
        return False

    image_files = sorted(
        list(pics_dir.glob("*.jpg")) + list(pics_dir.glob("*.jpeg")) + list(pics_dir.glob("*.png"))
    )
    if not image_files:
        print(f"no images found in {pics_dir}")
        return False

    print(f"found {len(image_files)} images")
    uploaded = []

    for img_file in image_files:
        print(f"  uploading {img_file.name}...")
        with open(img_file, "rb") as f:
            content = f.read()
        content_type = "image/jpeg" if img_file.suffix.lower() in (".jpg", ".jpeg") else "image/png"
        url = s3_service.upload_image(file_content=content, filename=img_file.name, content_type=content_type)
        if url:
            print(f"    -> {url}")
            uploaded.append(url)
        else:
            print(f"    failed: {img_file.name}")

    print(f"\nuploaded {len(uploaded)}/{len(image_files)} images")
    return True


def main():
    result = asyncio.run(upload_images())
    sys.exit(0 if result else 1)


if __name__ == "__main__":
    main()
