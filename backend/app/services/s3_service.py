"""s3 service: upload and manage location images in aws s3."""

import re
import uuid
from pathlib import Path
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings


def _slugify(value: str) -> str:
    """lowercase, keep alnum + hyphen, collapse other runs to single hyphen."""
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "_unsorted"


class S3Service:
    def __init__(self):
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
        )
        self.bucket_name = settings.s3_bucket_name
        self.base_url = settings.s3_base_url

    def upload_image(
        self,
        file_content: bytes,
        filename: str,
        content_type: str = "image/jpeg",
        university: Optional[str] = None,
    ) -> Optional[str]:
        try:
            ext = Path(filename).suffix or ".jpg"
            prefix = _slugify(university) if university else "_unsorted"
            s3_key = f"locations/{prefix}/{uuid.uuid4()}{ext}"
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_content,
                ContentType=content_type,
            )
            return f"{self.base_url}/{s3_key}"
        except ClientError as e:
            print(f"S3 upload error: {e}")
            return None

    def delete_image(self, image_url: str) -> bool:
        try:
            s3_key = image_url.replace(f"{self.base_url}/", "")
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except ClientError as e:
            print(f"S3 delete error: {e}")
            return False

    def test_connection(self) -> bool:
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            return True
        except ClientError:
            return False


s3_service = S3Service()
