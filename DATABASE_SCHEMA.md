# Database Schema Documentation

The application uses PostgreSQL managed via Prisma ORM.

---

## Enums

### `Role`
- `TENANT`: User looking for a room listing.
- `OWNER`: User listing rooms.
- `ADMIN`: Platform administrator for moderation and analytics.

### `ListingStatus`
- `ACTIVE`: Available room listing (visible in search).
- `FILLED`: Room listing has been filled (hidden from search).

### `InterestStatus`
- `PENDING`: Initial tenant interest request awaiting owner response.
- `ACCEPTED`: Owner accepted interest (unlocks real-time chat).
- `DECLINED`: Owner declined interest.

### `ScoringMethod`
- `LLM`: Score calculated using LLM provider (OpenAI / Gemini / OpenRouter).
- `FALLBACK`: Score calculated using deterministic rule-based formula.

### `NotificationType`
- `HIGH_MATCH_INTEREST`: Sent to owner when tenant with >80% match expresses interest.
- `INTEREST_ACCEPTED`: Sent to tenant when owner accepts interest.
- `INTEREST_DECLINED`: Sent to tenant when owner declines interest.

---

## Models & Tables

### 1. `User`
Stores account authentication and identity data.

| Field | Type | Attributes / Default | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `@id @default(uuid())` | Primary key |
| `name` | `String` | | User display name |
| `email` | `String` | `@unique` | Login email address |
| `passwordHash` | `String` | | Bcrypt password hash |
| `role` | `Role` | | Account role |
| `active` | `Boolean` | `@default(true)` | Account active status |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Modification timestamp |

---

### 2. `TenantProfile`
Stores tenant search preferences and lifestyle habits (1-to-1 relationship with `User`).

| Field | Type | Attributes / Default | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `@id @default(uuid())` | Primary key |
| `userId` | `UUID` | `@unique` | Foreign key -> `User.id` (Cascade) |
| `preferredLocation` | `String` | | Preferred area |
| `budgetMin` | `Int` | | Minimum budget |
| `budgetMax` | `Int` | | Maximum budget |
| `moveInDate` | `Date` | | Desired move-in date |
| `gender` | `String` | `@default("ANY")` | Tenant gender |
| `genderPreference` | `String` | `@default("ANY")` | Roommate gender preference |
| `smoking` | `Boolean` | `@default(false)` | Smoking preference |
| `pets` | `Boolean` | `@default(false)` | Pet owner status |
| `diet` | `String` | `@default("ANY")` | Dietary habit |
| `sleepHabit` | `String` | `@default("ANY")` | Sleep cycle |
| `interests` | `String[]` | `@default([])` | Array of hobby/interest tags |

---

### 3. `Listing`
Stores room listings posted by owners.

| Field | Type | Attributes / Default | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `@id @default(uuid())` | Primary key |
| `ownerId` | `UUID` | | Foreign key -> `User.id` (Cascade) |
| `title` | `String` | | Listing title |
| `description` | `String` | | Full description |
| `location` | `String` | | City / Area |
| `rent` | `Int` | | Monthly rent amount |
| `availableFrom` | `Date` | | Available start date |
| `roomType` | `String` | | Single, shared, 1BHK, etc. |
| `furnishingStatus` | `String` | | Fully, semi, unfurnished |
| `photos` | `String[]` | | Photo URLs |
| `genderPreference` | `String` | `@default("ANY")` | Required roommate gender |
| `smokingAllowed` | `Boolean` | `@default(false)` | Smoking allowed flag |
| `petsAllowed` | `Boolean` | `@default(false)` | Pets allowed flag |
| `dietaryPolicy` | `String` | `@default("NO_RESTRICTIONS")` | Dietary rule |
| `sleepHabitAllowed` | `String` | `@default("ANY")` | Sleep schedule rule |
| `amenities` | `String[]` | `@default([])` | Included amenities |
| `roommateInterests` | `String[]` | `@default([])` | Preferred hobbies |
| `status` | `ListingStatus` | `@default(ACTIVE)` | Listing status |

- **Indexes**: `@@index([status, location, rent])`

---

### 4. `Match`
Caches computed compatibility scores for tenant–listing pairs.

| Field | Type | Attributes / Default | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `@id @default(uuid())` | Primary key |
| `tenantId` | `UUID` | | Foreign key -> `User.id` (Cascade) |
| `listingId` | `UUID` | | Foreign key -> `Listing.id` (Cascade) |
| `score` | `Int` | | Compatibility score (0-100) |
| `explanation` | `String` | | Reasoning explanation |
| `scoringMethod` | `ScoringMethod` | | `LLM` or `FALLBACK` |
| `computedAt` | `DateTime` | `@default(now())` | Computation timestamp |

- **Constraints & Indexes**:
  - `@@unique([tenantId, listingId])`
  - `@@index([tenantId, score])`

---

### 5. `Interest`
Tracks tenant interest requests and owner responses.

| Field | Type | Attributes / Default | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `@id @default(uuid())` | Primary key (doubles as Chat Room ID) |
| `tenantId` | `UUID` | | Foreign key -> `User.id` (Cascade) |
| `listingId` | `UUID` | | Foreign key -> `Listing.id` (Cascade) |
| `status` | `InterestStatus` | `@default(PENDING)` | `PENDING`, `ACCEPTED`, `DECLINED` |
| `createdAt` | `DateTime` | `@default(now())` | Request timestamp |
| `respondedAt` | `DateTime?` | | Response timestamp |

- **Constraints & Indexes**:
  - `@@unique([tenantId, listingId])`
  - `@@index([listingId, status])`

---

### 6. `Message`
Stores persistent real-time chat messages between tenant and owner.

| Field | Type | Attributes / Default | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `@id @default(uuid())` | Primary key |
| `interestId` | `UUID` | | Foreign key -> `Interest.id` (Cascade) |
| `senderId` | `UUID` | | Foreign key -> `User.id` (Cascade) |
| `content` | `String` | | Chat message text |
| `createdAt` | `DateTime` | `@default(now())` | Sent timestamp |

- **Indexes**: `@@index([interestId, createdAt])`

---

### 7. `Notification`
Audit log for in-app notifications and email tracking.

| Field | Type | Attributes / Default | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `@id @default(uuid())` | Primary key |
| `userId` | `UUID` | | Foreign key -> `User.id` (Cascade) |
| `type` | `NotificationType` | | Notification category |
| `payload` | `Json` | | Event metadata payload |
| `emailSent` | `Boolean` | `@default(false)` | SMTP email delivery status |
| `createdAt` | `DateTime` | `@default(now())` | Event timestamp |

- **Indexes**: `@@index([userId, createdAt])`
