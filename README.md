# Rent & Flatmate Finder (Roomly)

An AI-powered room and flatmate matching platform. Roomly connects owners listing rooms and tenants seeking accommodation by calculating a compatibility score based on locations, budgets, lifestyle habits, and roommate expectations. When interest is mutually accepted, a real-time persistent chat room is established.

---

## 📚 Dedicated Documentation Files

- 🚀 **[SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)** — Comprehensive System Architecture, Compatibility Engine Design, Chat Architecture & Notification Flow Write-up (≤ 800 words).
- 🔌 **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** — Full REST API Endpoints Reference, Query Parameters, Headers, Auth Rules & Socket.IO Events.
- 🗄️ **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** — Relational PostgreSQL Schema (Prisma Models, Attributes, Foreign Keys & Indexes).
- 🤖 **[LLM_PROMPT_GUIDE.md](./LLM_PROMPT_GUIDE.md)** — AI Prompt Templates, System Instructions, Response JSON Schema & Fallback Scoring Logic.

---


## 🔗 Live Application Links

- **🌐 Live Frontend (Vercel)**: [https://unthinkable-rent-flatmate-finder-abhinav-dhawan.vercel.app](https://unthinkable-rent-flatmate-finder-abhinav-dhawan.vercel.app)
- **⚙️ Live Backend API (Render)**: [https://rent-finder-api.onrender.com](https://rent-finder-api.onrender.com)
  - *Health Endpoint*: `https://rent-finder-api.onrender.com/api/health`

---

## 🛠️ Local Development Setup

Follow these steps to run the complete workspace locally.

### Prerequisites
- Node.js (v20+ recommended)
- pnpm (v10+ recommended)
- A running PostgreSQL database instance

### 1. Configure Environment Variables
Copy `.env.example` in the root and `apps/api/.env` to configure your connection parameters:
```bash
# apps/api/.env
POSTGRES_DB=rentfinder
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/rentfinder
JWT_SECRET=change-this-to-at-least-32-random-characters-long
LLM_API_KEY=your-openai-or-gemini-api-key
LLM_MODEL=gpt-4o-mini
```

### 2. Install Workspace Dependencies
Install dependencies using pnpm:
```bash
pnpm install
```

### 3. Initialize the Database (Prisma Migrations & Seeding)
Sync the database schema using Prisma and seed realistic user, listing, and match data:
```bash
# Generate Prisma Client and apply migrations
pnpm --filter @rent-finder/api exec prisma migrate dev --name init

# Seed the database
pnpm --filter @rent-finder/api run prisma:seed
```

### 4. Run the Dev Servers
Start both the React frontend and Express backend concurrently:
```bash
pnpm dev
```
- **Frontend** runs at: [http://localhost:5173](http://localhost:5173)
- **Backend API** runs at: [http://localhost:4000](http://localhost:4000)

---

## 🔑 Default Seed Credentials for Manual Testing
All seeded accounts share the password: `password123`

- **Tenant**: `abhinav@roomly.com`
- **Owner**: `vikram@roomly.com`
- **Admin**: `admin@roomly.com`

---

## 🚀 System Design Write-Up

### Compatibility Scoring Design
Every tenant–listing pair is scored exactly once and cached in a dedicated `matches` table rather than recomputed on each page view. When a tenant opens a listing (or browses filtered results) for the first time, the backend checks for an existing match row; if none exists, it calls the LLM with the listing and tenant-profile fields and stores the returned score and explanation, along with a `scoring_method` flag (`LLM` or `FALLBACK`) and a `computed_at` timestamp. Subsequent views simply read the cached row, which keeps LLM costs and latency off the hot read path and gives predictable response times for the browse/filter endpoint even under load.

### LLM Integration and Fallback
The scoring service sends a single structured prompt asking the model to return strict JSON (`{score, explanation}`) given the listing and tenant fields, with the system instruction constraining output to JSON only. Responses are parsed defensively: if the call times out, returns a non-success status, or the body fails JSON parsing/schema validation, the service does not propagate the failure to the user. Instead, it falls back to a deterministic rule-based formula that awards up to 60 points for location match (exact vs partial text match) and up to 40 points for budget fit (full credit inside the tenant's budget range, smoothly penalized for rent below the minimum or above the maximum). This guarantees a score and explanation are always returned, and the `scoring_method` field lets reviewers/admins audit how often the fallback was used — directly demonstrating graceful degradation rather than simply mocking it.

### Chat Implementation
A chat room only exists once an interest request moves to "accepted" status; the interest's own ID doubles as the chat room ID, so there is a clean one-to-one mapping between an accepted match and a conversation — no separate "conversation" table is needed. Both clients authenticate their WebSocket connection using the same JWT issued at login, then join the room keyed by `interest_id`. Sending a message is a two-step operation on the server: persist the row to the messages table (`sender_id`, `interest_id`, `content`, `createdAt`), then broadcast it to all sockets currently in that room. Message history is also exposed over a plain REST endpoint (`/api/chat/:interestId/messages`) so the conversation loads correctly on page refresh or before the socket has finished connecting, and so pagination/search can be added later without touching the real-time path. Authorization on both the REST and WebSocket layers verifies the requesting user is actually one of the two participants in that interest record before allowing reads or writes.

### Notification Flow
Two events generate notifications. First, when a tenant sends an interest request, the server checks the cached compatibility score for that pair; if it exceeds 80, it writes a notification row for the owner and triggers an email via Nodemailer/SMTP highlighting the high-match interest. Second, when an owner accepts or declines an interest, a notification row and email are generated for the tenant unconditionally. In both cases, the database write (the notification row) happens synchronously within the same request/transaction as the triggering action, while the actual email send is treated as a best-effort side effect: failures are logged and flagged via an `emailSent` boolean rather than rolling back or blocking the primary action. This means a tenant's interest is recorded and an owner's accept/decline always succeeds even if the SMTP provider is temporarily down, with the option to add a retry worker later without changing the core flow.

---

## 🗄️ Database Schema (Prisma Models)

```prisma
model User {
  id            String         @id @default(uuid()) @db.Uuid
  name          String
  email         String         @unique
  passwordHash  String
  role          Role
  active        Boolean        @default(true)
  createdAt     DateTime       @default(now())
  profile       TenantProfile?
  listings      Listing[]
  matches       Match[]        @relation("TenantMatches")
  interests     Interest[]     @relation("TenantInterests")
  messages      Message[]
  notifications Notification[]
}

model TenantProfile {
  id                String   @id @default(uuid()) @db.Uuid
  userId            String   @unique @db.Uuid
  preferredLocation String
  budgetMin         Int
  budgetMax         Int
  moveInDate        DateTime @db.Date
  gender            String   @default("ANY")
  genderPreference  String   @default("ANY")
  smoking           Boolean  @default(false)
  pets              Boolean  @default(false)
  diet              String   @default("ANY")
  sleepHabit        String   @default("ANY")
  interests         String[] @default([])
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Listing {
  id                String        @id @default(uuid()) @db.Uuid
  ownerId           String        @db.Uuid
  title             String
  description       String
  location          String
  rent              Int
  availableFrom     DateTime      @db.Date
  roomType          String
  furnishingStatus  String
  photos            String[]
  genderPreference  String        @default("ANY")
  smokingAllowed    Boolean       @default(false)
  petsAllowed       Boolean       @default(false)
  dietaryPolicy     String        @default("NO_RESTRICTIONS")
  sleepHabitAllowed String        @default("ANY")
  amenities         String[]      @default([])
  roommateInterests String[]      @default([])
  status            ListingStatus @default(ACTIVE)
  owner             User          @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  matches           Match[]
  interests         Interest[]
}

model Match {
  id            String        @id @default(uuid()) @db.Uuid
  tenantId      String        @db.Uuid
  listingId     String        @db.Uuid
  score         Int
  explanation   String
  scoringMethod ScoringMethod
  computedAt    DateTime      @default(now())
  tenant        User          @relation("TenantMatches", fields: [tenantId], references: [id], onDelete: Cascade)
  listing       Listing       @relation(fields: [listingId], references: [id], onDelete: Cascade)
}

model Interest {
  id          String         @id @default(uuid()) @db.Uuid
  tenantId    String         @db.Uuid
  listingId   String         @db.Uuid
  status      InterestStatus @default(PENDING)
  createdAt   DateTime       @default(now())
  respondedAt DateTime?
  tenant      User           @relation("TenantInterests", fields: [tenantId], references: [id], onDelete: Cascade)
  listing     Listing        @relation(fields: [listingId], references: [id], onDelete: Cascade)
  messages    Message[]
}
```

---

## 🔌 API Documentation

### Authentication
- `POST /api/auth/register` - Create account (roles: `TENANT`, `OWNER`)
- `POST /api/auth/login` - Login to account (returns JWT token and user metadata)
- `GET /api/auth/me` - Retrieve currently authenticated user profile
- `GET /api/auth/notifications` - Retrieve in-app notifications log

### Tenant Profile
- `GET /api/profile` - Fetch current tenant preferences
- `PUT /api/profile` - Create/update tenant preferences (location, budget, sleeping cycle, diet, hobbies, etc.)

### Listings
- `GET /api/listings` - Browse available rooms, ranked by AI compatibility score (Tenant only)
- `GET /api/listings/mine` - Retrieve owner's posted listings (Owner only)
- `POST /api/listings` - Publish a new listing (Owner only)
- `PATCH /api/listings/:id` - Edit listing details (Owner only)
- `PATCH /api/listings/:id/fill` - Mark listing as filled and hide from search results (Owner only)
- `GET /api/listings/:id/score` - Retrieve a computed compatibility score for a listing

### Interest Requests
- `GET /api/interests/mine` - Fetch user's interest history
- `POST /api/interests` - Express interest in a listing (Tenant only)
- `PATCH /api/interests/:id` - Accept/decline incoming interest requests (Owner only)

### Real-Time Chat
- `GET /api/chat/:interestId/messages` - Retrieve chat history for accepted interest

---

## 🤖 LLM Prompt & Example I/O

The platform uses the following structured template to query configured LLM models (e.g. Gemini, OpenAI) in strict JSON mode:

### System Instruction
```
You are a professional flatmate matching assistant. Calculate compatibility from 0 to 100 between a tenant and a room listing. Return a JSON object with keys: score (number) and explanation (string, max 600 chars). The explanation should be a concise, friendly, and structured summary detailing why they are a good fit or if there are conflicts, highlighting shared hobbies, budget, location, and lifestyle habits.
```

### User Input Structure
```
Room listing: { ...listingDetails }
Tenant profile: { ...profilePreferences }

Requirements:
1. If listing genderPreference is not "ANY", and tenant gender is not "ANY", and they do not match, score MUST be 0.
2. Consider budget alignment, location, smoking habits, pets, diet, sleep patterns, and shared hobbies/interests.
```

### Example I/O
- **Input Listing**: Location: "Indiranagar", Rent: `15000`, Pets Allowed: `false`, Smoking Allowed: `false`.
- **Input Tenant Profile**: Preferred Area: "Indiranagar", Budget Max: `18000`, Pets: `false`, Smoking: `false`.
- **JSON Response**:
  ```json
  {
    "score": 95,
    "explanation": "Excellent match! The location is exactly in Indiranagar, and the rent is well within your budget limit. Both parties align on a non-smoking house rule and no pet preferences."
  }
  ```
