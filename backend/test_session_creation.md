# Session Creation Endpoint

## Endpoint: `POST /api/sessions`

Creates a new game session with randomly selected locations.

### Request Body

```json
{
  "rounds": 5,           // int (1-20), default: 5
  "difficulty": "easy"   // enum: "easy", "normal", "hard", default: "easy"
}
```

### Parameters

- **rounds** (integer, 1-20): Number of locations/rounds to play
  - Default: 5
  - Min: 1
  - Max: 20

- **difficulty** (string enum): Game difficulty level
  - Options: `"easy"`, `"normal"`, `"hard"`
  - Default: `"easy"`
  - Note: Difficulty filtering is not yet implemented, but the value is stored for future use

### Response

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "rounds": 5,
  "difficulty": "easy",
  "location_ids": [
    "507f191e810c19729de860ea",
    "507f191e810c19729de860eb",
    "507f191e810c19729de860ec",
    "507f191e810c19729de860ed",
    "507f191e810c19729de860ee"
  ],
  "current_round": 0,
  "guesses": [],
  "total_score": 0,
  "status": "active",
  "started_at": "2026-01-24T12:00:00.000Z",
  "completed_at": null
}
```

### Response Fields

- **_id**: Unique session identifier (save this for subsequent API calls)
- **rounds**: Total number of rounds in this session
- **difficulty**: Difficulty level selected
- **location_ids**: Array of randomly selected location IDs (one per round)
- **current_round**: Current round index (0-based, starts at 0)
- **guesses**: Array of guesses made so far (empty at start)
- **total_score**: Cumulative score (starts at 0)
- **status**: Session status (`"active"` or `"completed"`)
- **started_at**: ISO timestamp when session was created
- **completed_at**: ISO timestamp when session was completed (null while active)

## Examples

### cURL

```bash
# Create a session with defaults (5 rounds, easy difficulty)
curl -X POST http://localhost:8000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{}'

# Create a 10-round game on hard difficulty
curl -X POST http://localhost:8000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "rounds": 10,
    "difficulty": "hard"
  }'

# Create a quick 3-round game
curl -X POST http://localhost:8000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "rounds": 3,
    "difficulty": "normal"
  }'
```

### Python

```python
import requests

BASE_URL = "http://localhost:8000"

# Create session
response = requests.post(
    f"{BASE_URL}/api/sessions",
    json={
        "rounds": 5,
        "difficulty": "easy"
    }
)

session = response.json()
print(f"Session created: {session['_id']}")
print(f"Playing {session['rounds']} rounds on {session['difficulty']} difficulty")
print(f"Location IDs: {session['location_ids']}")
```

### JavaScript/TypeScript

```typescript
const createSession = async (rounds: number = 5, difficulty: string = 'easy') => {
  const response = await fetch('http://localhost:8000/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rounds, difficulty })
  });
  
  const session = await response.json();
  return session;
};

// Usage
const session = await createSession(5, 'easy');
console.log('Session ID:', session._id);
```

## Error Responses

### Not Enough Locations

**Status:** `400 Bad Request`

```json
{
  "detail": "Not enough locations available to create a session"
}
```

This occurs when the database doesn't have enough locations to fulfill the requested number of rounds. For example, if you request 10 rounds but only have 5 locations in the database.

**Solution:** Add more locations using `POST /api/locations` or reduce the number of rounds.

### Validation Errors

**Status:** `422 Unprocessable Entity`

```json
{
  "detail": [
    {
      "loc": ["body", "rounds"],
      "msg": "ensure this value is less than or equal to 20",
      "type": "value_error.number.not_le"
    }
  ]
}
```

Common validation errors:
- rounds < 1 or rounds > 20
- difficulty not in ["easy", "normal", "hard"]

## Next Steps After Creating a Session

1. **Get Current Location**: `GET /api/sessions/{session_id}/current-location`
   - Returns the image and info for the current round (without coordinates)

2. **Submit a Guess**: `POST /api/sessions/{session_id}/guess`
   - Submit your latitude/longitude guess
   - Receive points and see the actual location

3. **Repeat** steps 1-2 for each round

4. **View Final Results**: `GET /api/sessions/{session_id}`
   - See all guesses, final score, and game summary
