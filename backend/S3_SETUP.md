# AWS S3 Image Storage Setup

Complete guide for setting up S3 image storage for ConUGuessr.

## Overview

Images are stored on AWS S3 at: `https://uniguessr-dev.s3.us-east-1.amazonaws.com/locations/`

The backend automatically:
- ✅ Uploads images to S3 when creating locations
- ✅ Stores S3 URLs in PostgreSQL
- ✅ Frontend fetches images directly from S3 URLs

## Setup Steps

### 1. Get AWS Credentials

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **IAM** (Identity and Access Management)
3. Create a new user or use existing user
4. Create/Get **Access Keys**:
   - Click on your user
   - Go to "Security credentials"
   - Click "Create access key"
   - Choose "Application running on AWS compute service" or "Local code"
   - Save your:
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`

### 2. Configure S3 Bucket Permissions

Make sure your S3 bucket `uniguessr-dev` has:

**Bucket Policy** (allows public read access):
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::uniguessr-dev/*"
        }
    ]
}
```

**CORS Configuration**:
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

### 3. Update .env File

Edit `backend/app/config/secrets/.secrets.{APP_ENV}` and add your AWS credentials:

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=YOUR_ACTUAL_ACCESS_KEY_HERE
AWS_SECRET_ACCESS_KEY=YOUR_ACTUAL_SECRET_KEY_HERE
AWS_REGION=us-east-1
S3_BUCKET_NAME=uniguessr-dev
S3_BASE_URL=https://uniguessr-dev.s3.us-east-1.amazonaws.com
```

### 4. Restart the Server

```bash
cd backend
# Server will auto-reload if already running
# Or restart manually
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Usage

### Option 1: Upload Images via API

Create a location with image upload:

```bash
curl -X POST http://localhost:8000/api/locations \
  -F "name=Hall Building" \
  -F "latitude=45.497200" \
  -F "longitude=-73.578900" \
  -F "difficulty=easy" \
  -F "image=@/path/to/your/image.jpg"
```

### Option 2: Seed from Local Images

If you have images in the `backend/Pics/` folder:

```bash
cd backend
uv run scripts/seed_with_local_images.py
```

This will:
1. Read images from `Pics/` folder
2. Upload each to S3
3. Create locations in PostgreSQL with S3 URLs

**Edit the script** `scripts/seed_with_local_images.py` to match your images and locations!

### Option 3: Just Upload Images (Manual)

Upload images to S3 first, then use URLs later:

```bash
cd backend
uv run scripts/upload_images_to_s3.py
```

This outputs S3 URLs you can use in your seed script or API calls.

## API Endpoints

### Create Location with Image Upload
```
POST /api/locations
Content-Type: multipart/form-data

Fields:
- name (string)
- latitude (float)
- longitude (float)
- difficulty (string)
- image (file)
```

### Create Location with Existing URL
```
POST /api/locations/with-url
Content-Type: application/json

Body:
{
  "name": "Building Name",
  "latitude": 45.497,
  "longitude": -73.578,
  "image_url": "https://uniguessr-dev.s3.us-east-1.amazonaws.com/locations/image.jpg",
  "difficulty": "easy"
}
```

## Frontend Integration

The frontend automatically fetches images from S3 URLs stored in the database:

```typescript
// Example from your location response
{
  "_id": "...",
  "name": "Hall Building",
  "image_url": "https://uniguessr-dev.s3.us-east-1.amazonaws.com/locations/abc123.jpg",
  "latitude": 45.497,
  "longitude": -73.578
}

// Frontend just uses the image_url directly:
<img src={location.image_url} alt={location.name} />
```

## Troubleshooting

### "S3 connection failed"

**Problem**: Can't connect to S3  
**Solutions**:
- Check AWS credentials in `.env`
- Verify bucket exists and is in `us-east-1` region
- Check IAM user has S3 permissions

### "Failed to upload image to S3"

**Problem**: Upload fails  
**Solutions**:
- Check bucket permissions (needs PutObject permission)
- Verify ACL settings allow public-read
- Check bucket policy

### Images not loading in frontend

**Problem**: 403 Forbidden errors  
**Solutions**:
- Check bucket policy allows public GetObject
- Verify CORS configuration
- Ensure images were uploaded with `ACL='public-read'`

## File Structure

```
backend/
├── Pics/                          # Local images (optional)
│   ├── sample_1.jpg
│   └── sample_2.jpg
├── scripts/
│   ├── upload_images_to_s3.py    # Upload Pics to S3
│   └── seed_with_local_images.py # Upload & create locations
├── app/
│   ├── services/
│   │   └── s3_service.py         # S3 upload/delete logic
│   ├── api/
│   │   └── locations.py          # Image upload endpoint
│   └── config/
│       ├── env/.env.{APP_ENV}        # non-secret config
│       └── secrets/.secrets.{APP_ENV} # AWS creds (git-ignored)
```

## S3 Bucket Structure

```
uniguessr-dev/
└── locations/
    ├── abc123-uuid.jpg
    ├── def456-uuid.jpg
    └── ...
```

Each image gets a unique UUID filename to avoid collisions.

## Security Notes

- ✅ Images are public-read (required for frontend display)
- ✅ Write access requires AWS credentials (backend only)
- ✅ Never commit `.env` file to git
- ✅ Consider CloudFront CDN for production
- ✅ Monitor S3 costs (free tier: 5GB storage, 20k GET requests/month)
