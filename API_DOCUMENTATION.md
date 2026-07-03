# API Documentation

The Roomly API is a RESTful API built with Express 5, TypeScript, Zod validation, and Socket.IO real-time WebSocket events.

## Base URLs
- **Local Development**: `http://localhost:4000/api`
- **Render Production**: `https://rent-finder-api.onrender.com/api`

---

## Authentication & Headers

All endpoints except `/api/auth/register` and `/api/auth/login` require an `Authorization` header containing a valid Bearer JWT:
```http
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints Reference

### 1. Authentication (`/api/auth`)

#### `POST /api/auth/register`
Creates a new tenant or owner account.
- **Request Body**:
  ```json
  {
    "name": "Priya Sharma",
    "email": "priya@example.com",
    "password": "password123",
    "role": "TENANT" // or "OWNER"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "user": { "id": "uuid", "name": "Priya Sharma", "email": "priya@example.com", "role": "TENANT" },
    "token": "jwt_token_string"
  }
  ```

#### `POST /api/auth/login`
Authenticates user credentials.
- **Request Body**:
  ```json
  {
    "email": "priya@example.com",
    "password": "password123"
  }
  ```
- **Response (200 OK)**: Returns user details and Bearer token.

#### `GET /api/auth/me`
Fetches current authenticated user profile.
- **Response (200 OK)**: `{ "id": "uuid", "name": "...", "email": "...", "role": "...", "active": true }`

#### `GET /api/auth/notifications`
Retrieves in-app notifications log for the logged-in user.

---

### 2. Tenant Preferences Profile (`/api/profile`)

#### `GET /api/profile` *(Tenant Only)*
Fetches current tenant preferences.

#### `PUT /api/profile` *(Tenant Only)*
Creates or updates tenant preferences. Invalidates existing cached compatibility scores for this tenant.
- **Request Body**:
  ```json
  {
    "preferredLocation": "Koramangala",
    "budgetMin": 10000,
    "budgetMax": 20000,
    "moveInDate": "2026-08-01",
    "gender": "FEMALE",
    "genderPreference": "FEMALE",
    "smoking": false,
    "pets": false,
    "diet": "VEG",
    "sleepHabit": "EARLY_BIRD",
    "interests": ["reading", "yoga"]
  }
  ```

---

### 3. Room Listings (`/api/listings`)

#### `GET /api/listings` *(Tenant Only)*
Returns active listings ranked by calculated AI compatibility scores.
- **Query Parameters**:
  - `location` (optional string): Filter by location snippet.
  - `budgetMin` (optional number): Minimum rent filter.
  - `budgetMax` (optional number): Maximum rent filter.

#### `GET /api/listings/mine` *(Owner Only)*
Returns all listings published by the logged-in owner.

#### `POST /api/listings` *(Owner Only)*
Publishes a new room listing.
- **Request Body**:
  ```json
  {
    "title": "Cozy Single Room in Indiranagar",
    "description": "Spacious room with attached balcony and fast WiFi.",
    "location": "Indiranagar",
    "rent": 14000,
    "availableFrom": "2026-07-15",
    "roomType": "Single Room",
    "furnishingStatus": "Fully Furnished",
    "photos": ["https://example.com/photo1.jpg"],
    "genderPreference": "ANY",
    "smokingAllowed": false,
    "petsAllowed": false,
    "dietaryPolicy": "NO_RESTRICTIONS",
    "sleepHabitAllowed": "ANY",
    "amenities": ["Wifi", "AC"],
    "roommateInterests": ["coding", "gaming"]
  }
  ```

#### `PATCH /api/listings/:id` *(Owner Only)*
Updates listing parameters. Invalidates cached match rows for this listing.

#### `PATCH /api/listings/:id/fill` *(Owner Only)*
Marks listing status as `FILLED` (hides listing from tenant search).

#### `GET /api/listings/:id/score` *(Tenant Only)*
Retrieves or triggers calculation of the compatibility score for a specific listing.

---

### 4. Interest Requests (`/api/interests`)

#### `GET /api/interests/mine`
Lists interest requests associated with the current user (sent requests for tenants, incoming requests for owners).

#### `POST /api/interests` *(Tenant Only)*
Sends an interest request to a room owner. Triggers owner notification if score >80%.
- **Request Body**: `{ "listingId": "uuid" }`

#### `PATCH /api/interests/:id` *(Owner Only)*
Accepts or declines an interest request. Triggers tenant notification and unlocks real-time chat if accepted.
- **Request Body**: `{ "status": "ACCEPTED" }` or `{ "status": "DECLINED" }`

---

### 5. Chat & WebSockets (`/api/chat` & Socket.IO)

#### `GET /api/chat/:interestId/messages`
Returns paginated message history for an accepted interest thread.
- **Query Parameters**: `before` (optional ISO date), `limit` (default 50).

#### WebSockets (Socket.IO)
- **Authentication**: Pass token in handshake: `{ auth: { token: "<jwt_token>" } }`
- **Events**:
  - `join_room` (`{ interestId }`): Joins socket room after verifying authorization.
  - `send_message` (`{ interestId, content }`): Persists message to DB and broadcasts to room.
  - `message_received` (listener): Received by clients when a new message is posted in the room.

---

### 6. Administration (`/api/admin`) *(Admin Only)*

#### `GET /api/admin/users`
Lists all platform users.

#### `PATCH /api/admin/users/:id`
Enables or disables a user account (`{ "active": false }`).

#### `GET /api/admin/listings`
Lists all listings across all owners for moderation.

#### `DELETE /api/admin/listings/:id`
Deletes a listing.

#### `GET /api/admin/activity`
Returns platform stats (`users`, `listings`, `activeListings`, `interests`, `acceptedInterests`, `matches`, `messages`).
