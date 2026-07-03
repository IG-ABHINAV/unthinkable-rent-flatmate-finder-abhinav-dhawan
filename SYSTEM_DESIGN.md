# System Design Write-Up

## Overview

The Rent & Flatmate Finder platform (Roomly) is an AI-powered rental matching application built with Node.js, Express, TypeScript, Socket.IO, PostgreSQL, and React. The system is designed to be highly reliable, ensuring that LLM outages, network failures, or email service drops never block core user flows.

---

## 1. Compatibility Scoring Design

Every tenant–listing pair is scored **exactly once** and cached in a dedicated `matches` table rather than recomputed on each page view.

When a tenant opens a listing (or browses filtered results) for the first time:
1. The backend queries the `matches` table for an existing row matching `(tenantId, listingId)`.
2. If a cached row exists and neither the listing nor the tenant profile has been updated since `computedAt`, the cached match record is immediately returned.
3. If no match exists (or if listing/profile was modified), the backend triggers a new score computation via the LLM (or fallback algorithm) and upserts the result into the database along with a `computed_at` timestamp and `scoringMethod` (`LLM` or `FALLBACK`).

Subsequent page loads read directly from the database cache, keeping LLM API latency and API costs completely off the hot read path for listing browsing.

---

## 2. LLM Integration and Fallback Engine

The scoring service interfaces with LLM providers (e.g. OpenAI `gpt-4o-mini`, Gemini, or OpenRouter) using structured JSON mode.

### Defensive Error Handling
If the LLM call times out (8-second threshold), returns a non-2xx status, or fails schema validation, the application **does not fail or return an error to the user**. Instead, it seamlessly invokes a deterministic rule-based fallback algorithm.

### Fallback Rule-Based Formula
1. **Gender Hard Constraint**: If a listing specifies a non-ANY gender requirement and the tenant does not match, the score is forced to `0%` with a clear explanation.
2. **Location Matching (up to 30 points)**:
   - Exact text match: +30 points
   - Partial text match: +15 points
3. **Budget Alignment (up to 30 points)**:
   - Within budget range (`budgetMin` to `budgetMax`): +30 points
   - Below minimum: Smoothly penalized based on distance under minimum
   - Above maximum: Smoothly penalized based on overshoot distance
4. **Lifestyle Alignment (up to 30 points)**:
   - Smoking allowance match: +7.5 points
   - Pet policy match: +7.5 points
   - Dietary restriction match (veg vs non-veg): +7.5 points
   - Sleep schedule alignment (early bird / night owl): +7.5 points
5. **Shared Hobbies & Interests (up to 10 points)**:
   - +2.5 points per overlapping tag between tenant interests and listing roommate preferences

The `scoringMethod` field (`LLM` vs `FALLBACK`) is recorded on every match row for full auditability and to demonstrate graceful degradation during evaluation.

---

## 3. Real-Time Chat Architecture

A chat thread is created **implicitly** once an interest request transitions to `ACCEPTED` status.

### Room & Channel Management
- The `interestId` serves directly as the chat room identifier, ensuring a clean 1-to-1 relationship between an accepted request and a conversation thread (no extra "conversation" table required).
- Both clients authenticate their WebSocket connection using the same JWT issued during login.
- When connected, clients emit `join_room` with `{ interestId }`. The server verifies that `req.user.id` is either the tenant or the listing owner before allowing socket room entry.

### Message Persistence & Delivery
1. Client emits `send_message` with `{ interestId, content }`.
2. The server authorizes the user, persists the message synchronously to the `messages` table (`id`, `interestId`, `senderId`, `content`, `createdAt`), and then broadcasts `message_received` to all active sockets in the room.
3. A REST endpoint (`GET /api/chat/:interestId/messages`) backs initial page loading and history pagination, ensuring chat history survives page refreshes even before WebSockets finish connecting.

---

## 4. Notification Flow & Asynchronous Email Delivery

Two key events trigger platform notifications:
1. **Tenant Expresses Interest**: If the cached compatibility score for the pair is **>80%**, a notification is generated for the listing owner.
2. **Owner Accepts / Declines Interest**: A notification is generated for the tenant unconditionally.

### Delivery Lifecycle
- **Synchronous Database Persistence**: A row is immediately created in the `notifications` table (`id`, `userId`, `type`, `payload`, `emailSent: false`) inside the request transaction.
- **Asynchronous Best-Effort Email**: Nodemailer attempts email delivery in the background via SMTP. If email delivery succeeds, `emailSent` is updated to `true`. If the email fails (e.g. SMTP server down), the failure is logged without rolling back the user's action.

This design guarantees that tenant interest submission and owner accept/decline actions are never blocked by external email infrastructure outages.

---

## 5. Data Modeling Summary

Seven normalized database tables maintain clean separation of concerns:
- `users`: Core account data and role tags (`TENANT`, `OWNER`, `ADMIN`).
- `tenant_profiles`: Preferences and lifestyle parameters (1-to-1 with tenant user).
- `listings`: Room details, pricing, policies, and amenities (owned by user).
- `matches`: Cached compatibility scores and reasoning (keyed by tenant + listing).
- `interests`: Request lifecycle (`PENDING`, `ACCEPTED`, `DECLINED`).
- `messages`: Chat message history (keyed off accepted `interestId`).
- `notifications`: Audit log for notifications and email delivery tracking.
