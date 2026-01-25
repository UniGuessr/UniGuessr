"""S3 service for handling file uploads to AWS S3."""

import boto3
from botocore.exceptions import ClientError
from typing import Optional
import uuid
from pathlib import Path

from src.config import settings


class S3Service:
    """Service for uploading files to AWS S3."""
    
    def __init__(self):
        """Initialize S3 client."""
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region
        )
        self.bucket_name = settings.s3_bucket_name
        self.base_url = settings.s3_base_url
    
    def upload_image(
        self,
        file_content: bytes,
        filename: str,
        content_type: str = "image/jpeg"
    ) -> Optional[str]:
        """
        Upload an image to S3 and return the public URL.
        
        Args:
            file_content: The image file content as bytes
            filename: Original filename
            content_type: MIME type of the image
            
        Returns:
            Public URL of the uploaded image, or None if upload failed
        """
        try:
            # Generate unique filename to avoid collisions
            file_extension = Path(filename).suffix or '.jpg'
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            s3_key = f"locations/{unique_filename}"
            
            # Upload to S3
            # Note: Bucket must have public read policy configured
            # ACL is not used as most buckets have ACLs disabled by default
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_content,
                ContentType=content_type
            )
            
            # Return the public URL
            image_url = f"{self.base_url}/{s3_key}"
            return image_url
            
        except ClientError as e:
            print(f"Error uploading to S3: {e}")
            return None
    
    def delete_image(self, image_url: str) -> bool:
        """
        Delete an image from S3.
        
        Args:
            image_url: The full URL of the image to delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Extract the S3 key from the URL
            # URL format: https://conuguessr.s3.us-east-2.amazonaws.com/locations/filename.jpg
            s3_key = image_url.replace(f"{self.base_url}/", "")
            
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return True
            
        except ClientError as e:
            print(f"Error deleting from S3: {e}")
            return False
    
    def test_connection(self) -> bool:
        """
        Test if S3 connection and credentials are working.
        
        Returns:
            True if connection successful, False otherwise
        """
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            return True
        except ClientError:
            return False


# Singleton instance
s3_service = S3Service()
