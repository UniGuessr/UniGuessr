"""
Test MongoDB connection to diagnose issues.

Usage:
    cd backend
    uv run scripts/test_connection.py
"""

import sys
import asyncio
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from src.config import settings
import certifi


async def test_connection():
    """Test MongoDB connection with detailed diagnostics."""
    
    print("="*70)
    print("MongoDB Connection Diagnostic Tool")
    print("="*70)
    
    print(f"\n📋 Configuration:")
    print(f"   Database URL: {settings.mongodb_url[:50]}...")
    print(f"   Database Name: {settings.mongodb_db_name}")
    print(f"   Using certifi: {certifi.where()}")
    
    print(f"\n🔌 Attempting to connect...")
    
    try:
        # Try to connect with minimal options first
        client = AsyncIOMotorClient(
            settings.mongodb_url,
            serverSelectionTimeoutMS=10000,
        )
        
        print("✓ Client created")
        
        # Try to ping the server
        print("   Pinging server...")
        await client.admin.command('ping')
        print("✓ Server responded to ping!")
        
        # Try to list databases
        print("   Listing databases...")
        dbs = await client.list_database_names()
        print(f"✓ Found {len(dbs)} databases: {dbs}")
        
        # Try to access our specific database
        db = client[settings.mongodb_db_name]
        print(f"\n   Accessing database '{settings.mongodb_db_name}'...")
        collections = await db.list_collection_names()
        print(f"✓ Found {len(collections)} collections: {collections}")
        
        # Try to count documents in locations collection
        if "locations" in collections:
            count = await db.locations.count_documents({})
            print(f"✓ Locations collection has {count} documents")
        else:
            print("⚠️  No 'locations' collection found yet")
        
        client.close()
        
        print("\n" + "="*70)
        print("✅ SUCCESS: MongoDB connection is working!")
        print("="*70)
        return True
        
    except Exception as e:
        print(f"\n❌ CONNECTION FAILED")
        print("="*70)
        print(f"\nError: {type(e).__name__}")
        print(f"Message: {str(e)}")
        
        # Provide specific guidance based on error type
        if "SSL" in str(e) or "TLS" in str(e):
            print("\n🔧 SSL/TLS Error Detected:")
            print("   This usually means one of these issues:")
            print("   1. Wrong username or password")
            print("   2. Your IP address is not whitelisted in MongoDB Atlas")
            print("   3. The cluster is paused or doesn't exist")
            print("\n   Solutions:")
            print("   → Go to MongoDB Atlas: https://cloud.mongodb.com/")
            print("   → Check 'Network Access' and add your IP (0.0.0.0/0 for testing)")
            print("   → Check 'Database Access' for correct username/password")
            print("   → Make sure cluster is running (not paused)")
            
        elif "authentication failed" in str(e).lower():
            print("\n🔧 Authentication Error:")
            print("   Wrong username or password")
            print("   → Check MongoDB Atlas 'Database Access' for credentials")
            
        elif "connection refused" in str(e).lower():
            print("\n🔧 Connection Refused:")
            print("   → Check if MongoDB cluster is running")
            print("   → Verify the connection string is correct")
        
        print("="*70)
        return False


def main():
    """Run the connection test."""
    result = asyncio.run(test_connection())
    sys.exit(0 if result else 1)


if __name__ == "__main__":
    main()
