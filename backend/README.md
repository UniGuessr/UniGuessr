# ConUGuessr Backend

Backend service for ConUGuessr - a campus geoguessr game.

## Tech Stack

- **Framework**: FastAPI
- **Database**: MongoDB (using Motor async driver)
- **Package Manager**: uv

## Project Structure

```
backend/
├── main.py              # FastAPI application entry point
├── src/
│   ├── config.py        # Configuration and settings
│   ├── database.py      # MongoDB connection management
│   ├── models/          # Pydantic models
│   │   ├── location.py  # Location models
│   │   └── session.py   # Session and game models
│   ├── services/        # Business logic layer
│   │   ├── location_service.py
│   │   └── session_service.py
│   └── routes/          # API endpoints
│       ├── locations.py
│       └── sessions.py
└── .env                 # Environment variables (create from sample.env)
```

## Setup

### Prerequisites

- Python 3.12+
- MongoDB (local instance or MongoDB Atlas)
- [uv](https://github.com/astral-sh/uv) package manager

### Installation

1. Install dependencies:
```bash
uv sync
```

2. Set up environment variables:
```bash
# Copy sample.env from root to backend/.env
cp ../sample.env .env
# Edit .env with your MongoDB connection details
```

For MongoDB Atlas, your `MONGODB_URL` should look like:
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
```

For local MongoDB:
```
mongodb://localhost:27017
```

3. Start MongoDB (only if running locally - skip if using Atlas):
```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Or run manually
mongod --config /usr/local/etc/mongod.conf
```

### Running the Application

```bash
# Run with auto-reload (development)
uv run main.py

# Or run with uvicorn directly
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Locations

- `POST /api/locations` - Create a new location
- `GET /api/locations` - Get all locations (with pagination)
- `GET /api/locations/count` - Get total count of locations
- `GET /api/locations/{id}` - Get a specific location
- `PUT /api/locations/{id}` - Update a location
- `DELETE /api/locations/{id}` - Delete a location

### Sessions

- `POST /api/sessions` - Create a new game session
- `GET /api/sessions/{id}` - Get session details
- `GET /api/sessions/{id}/current-location` - Get current location (without coordinates)
- `POST /api/sessions/{id}/guess` - Submit a guess for the current round

## Game Flow

1. **Create Session**: `POST /api/sessions` with number of rounds
2. **Get Current Location**: `GET /api/sessions/{id}/current-location` to see the image
3. **Submit Guess**: `POST /api/sessions/{id}/guess` with your lat/lng guess
4. **Repeat**: Steps 2-3 until all rounds are complete
5. **View Results**: `GET /api/sessions/{id}` to see final score and all guesses

## Adding Dependencies

```bash
# Add a production dependency
uv add <package-name>

# Add a development dependency
uv add --dev <package-name>
```

## Development

### Database Collections

- **locations**: Stores campus locations with coordinates and images
- **sessions**: Stores game sessions with guesses and scores

### Scoring System

Points are awarded based on distance accuracy:
- ≤10m: 5000 points
- ≤50m: 4000 points
- ≤100m: 3000 points
- ≤250m: 2000 points
- ≤500m: 1000 points
- ≤1000m: 500 points
- >1000m: Decreases with distance
