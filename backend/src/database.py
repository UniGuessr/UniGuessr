import certifi
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from src.config import settings


class Database:
    """MongoDB database connection manager."""
    
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None
    
    @classmethod
    async def connect(cls):
        """Connect to MongoDB."""
        # Use certifi for SSL certificates (fixes MongoDB Atlas SSL issues)
        cls.client = AsyncIOMotorClient(
            settings.mongodb_url,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=5000,
            retryWrites=True,
            w='majority'
        )
        cls.db = cls.client[settings.mongodb_db_name]
        print(f"Connected to MongoDB at {settings.mongodb_url}")
        # Test the connection
        try:
            await cls.client.admin.command('ping')
            print("✓ MongoDB connection successful")
        except Exception as e:
            print(f"❌ MongoDB connection failed: {e}")
    
    @classmethod
    async def disconnect(cls):
        """Disconnect from MongoDB."""
        if cls.client:
            cls.client.close()
            print("Disconnected from MongoDB")
    
    @classmethod
    def get_database(cls) -> AsyncIOMotorDatabase:
        """Get the database instance."""
        return cls.db


# Convenience function to get database
def get_db() -> AsyncIOMotorDatabase:
    return Database.get_database()
