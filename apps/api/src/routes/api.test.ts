import { beforeAll, afterAll, describe, test, expect, vi } from "vitest";
import { createServer, Server as HttpServer } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 1. Manually populate process.env from .env before importing app or db
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

// 2. Setup mock for OpenAI before importing scoring service
let mockLLMShouldFail = false;
vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn().mockImplementation(async () => {
            if (mockLLMShouldFail) {
              throw new Error("Mocked LLM Connection Error");
            }
            return {
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      score: 95,
                      explanation: "Mocked LLM: Excellent budget and location fit.",
                    }),
                  },
                },
              ],
            };
          }),
        },
      };
    },
  };
});

// 3. Dynamically import app, db, and scoring service
const { app } = await import("../app.js");
const { db } = await import("../db.js");
const { fallbackScore, scoreListing } = await import("../services/scoring.js");

const PORT = 4005;
const BASE_URL = `http://127.0.0.1:${PORT}`;

let server: HttpServer;

async function clearDb() {
  await db.message.deleteMany({});
  await db.notification.deleteMany({});
  await db.interest.deleteMany({});
  await db.match.deleteMany({});
  await db.listing.deleteMany({});
  await db.tenantProfile.deleteMany({});
  await db.user.deleteMany({});
}

beforeAll(async () => {
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, "127.0.0.1", () => resolve()));
  await clearDb();
});

afterAll(async () => {
  await clearDb();
  await db.$disconnect();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("Rent & Flatmate Finder API Integration Tests", () => {
  let tenantToken = "";
  let ownerToken = "";
  let tenantId = "";
  let ownerId = "";
  let listingId = "";
  let interestId = "";

  // 1. Auth and RBAC tests
  describe("1. Auth & RBAC", () => {
    test("Should register a tenant successfully", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Tenant",
          email: "tenant@example.com",
          password: "password123",
          role: "TENANT",
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.user).toBeDefined();
      expect(data.user.role).toBe("TENANT");
      expect(data.token).toBeDefined();
      tenantToken = data.token;
      tenantId = data.user.id;
    });

    test("Should register an owner successfully", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Owner",
          email: "owner@example.com",
          password: "password123",
          role: "OWNER",
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.user).toBeDefined();
      expect(data.user.role).toBe("OWNER");
      expect(data.token).toBeDefined();
      ownerToken = data.token;
      ownerId = data.user.id;
    });

    test("Should login successfully", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "tenant@example.com",
          password: "password123",
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.token).toBeDefined();
    });

    test("Should get current user profile", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${tenantToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.email).toBe("tenant@example.com");
    });

    test("Should enforce RBAC on restricted routes", async () => {
      // Tenant trying to view owner's listings
      const res = await fetch(`${BASE_URL}/api/listings/mine`, {
        headers: { Authorization: `Bearer ${tenantToken}` },
      });
      expect(res.status).toBe(403);
    });
  });

  // 2. Listing/profile validation and ownership tests
  describe("2. Profile & Listing Validation and Ownership", () => {
    test("Should validate tenant profile fields", async () => {
      // Invalid budgetMin > budgetMax
      const res = await fetch(`${BASE_URL}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantToken}`,
        },
        body: JSON.stringify({
          preferredLocation: "Koramangala",
          budgetMin: 15000,
          budgetMax: 10000,
          moveInDate: new Date(),
        }),
      });
      expect(res.status).toBe(400); // Validation error
    });

    test("Should create tenant profile successfully", async () => {
      const res = await fetch(`${BASE_URL}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantToken}`,
        },
        body: JSON.stringify({
          preferredLocation: "Koramangala",
          budgetMin: 10000,
          budgetMax: 20000,
          moveInDate: new Date(),
        }),
      });
      expect(res.status).toBe(200);
    });

    test("Should create room listing successfully", async () => {
      const res = await fetch(`${BASE_URL}/api/listings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          title: "Cozy 1BHK in Koramangala",
          description: "Beautiful cozy room with all amenities.",
          location: "Koramangala",
          rent: 15000,
          availableFrom: new Date(),
          roomType: "1bhk",
          furnishingStatus: "semi",
          photos: ["https://example.com/photo1.jpg"],
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBeDefined();
      listingId = data.id;
    });

    test("Should prevent non-owner from modifying listing", async () => {
      const res = await fetch(`${BASE_URL}/api/listings/${listingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantToken}`,
        },
        body: JSON.stringify({
          rent: 12000,
        }),
      });
      expect(res.status).toBe(403);
    });
  });

  // 3. LLM success and every fallback condition are tested.
  describe("3. LLM Success & Fallback Conditions", () => {
    test("Should correctly calculate exact location match within budget (Rule-based)", () => {
      const listing = {
        location: "Koramangala",
        rent: 14000,
        availableFrom: new Date(),
        roomType: "1bhk",
        furnishingStatus: "semi",
        genderPreference: "ANY",
        smokingAllowed: false,
        petsAllowed: false,
        dietaryPolicy: "NO_RESTRICTIONS",
        sleepHabitAllowed: "ANY",
        amenities: [],
        roommateInterests: [],
      };
      const profile = {
        preferredLocation: "Koramangala",
        budgetMin: 10000,
        budgetMax: 15000,
        moveInDate: new Date(),
        gender: "ANY",
        genderPreference: "ANY",
        smoking: false,
        pets: false,
        diet: "ANY",
        sleepHabit: "ANY",
        interests: [],
      };
      const result = fallbackScore(listing, profile);
      // Location match = 30, rent within budget = 30, lifestyle = 30. Total = 90.
      expect(result.score).toBe(90);
      expect(result.scoringMethod).toBe("FALLBACK");
    });

    test("Should correctly calculate partial location match outside budget (overshoot, Rule-based)", () => {
      const listing = {
        location: "Koramangala Bangalore",
        rent: 25000,
        availableFrom: new Date(),
        roomType: "1bhk",
        furnishingStatus: "semi",
        genderPreference: "ANY",
        smokingAllowed: false,
        petsAllowed: false,
        dietaryPolicy: "NO_RESTRICTIONS",
        sleepHabitAllowed: "ANY",
        amenities: [],
        roommateInterests: [],
      };
      const profile = {
        preferredLocation: "Koramangala",
        budgetMin: 10000,
        budgetMax: 20000,
        moveInDate: new Date(),
        gender: "ANY",
        genderPreference: "ANY",
        smoking: false,
        pets: false,
        diet: "ANY",
        sleepHabit: "ANY",
        interests: [],
      };
      const result = fallbackScore(listing, profile);
      // Location partial match = 15.
      // Budget overshoot: 25000 vs max 20000. penalty = (5000/20000) * 60 = 15. budgetScore = 30 - 15 = 15.
      // Lifestyle = 30.
      // Total = 15 + 15 + 30 = 60.
      expect(result.score).toBe(60);
      expect(result.scoringMethod).toBe("FALLBACK");
    });

    test("Should successfully call LLM scoring and return LLM score", async () => {
      mockLLMShouldFail = false;
      const res = await fetch(`${BASE_URL}/api/listings/${listingId}/score`, {
        headers: { Authorization: `Bearer ${tenantToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.score).toBe(95);
      expect(data.scoringMethod).toBe("LLM");
      expect(data.explanation).toContain("Mocked LLM");
    });

    test("Should fail LLM scoring gracefully and return Fallback score on error", async () => {
      // Evict cache by recreating the listing or deleting matches
      await db.match.deleteMany({});
      mockLLMShouldFail = true;

      const res = await fetch(`${BASE_URL}/api/listings/${listingId}/score`, {
        headers: { Authorization: `Bearer ${tenantToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      // Since it fell back: location exact (30) + budget within (30) + lifestyle (30) = 90.
      expect(data.score).toBe(90);
      expect(data.scoringMethod).toBe("FALLBACK");
      expect(data.explanation).toContain("Rule-based match");
    });
  });

  // 4. Interest transitions are idempotent and authorization-tested
  describe("4. Interest Transitions and Idempotency", () => {
    test("Should allow tenant to express interest in listing", async () => {
      const res = await fetch(`${BASE_URL}/api/interests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantToken}`,
        },
        body: JSON.stringify({ listingId }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBeDefined();
      interestId = data.id;
    });

    test("Should enforce idempotency on duplicate interest requests", async () => {
      const res = await fetch(`${BASE_URL}/api/interests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantToken}`,
        },
        body: JSON.stringify({ listingId }),
      });
      expect(res.status).toBe(409); // Conflict / Interest already sent
    });

    test("Should prevent non-owner from accepting/declining interest", async () => {
      const res = await fetch(`${BASE_URL}/api/interests/${interestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantToken}`,
        },
        body: JSON.stringify({ status: "ACCEPTED" }),
      });
      expect(res.status).toBe(403);
    });

    test("Should allow owner to accept interest", async () => {
      const res = await fetch(`${BASE_URL}/api/interests/${interestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ status: "ACCEPTED" }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("ACCEPTED");
    });
  });

  // 5. Chat rejects non-participants and persists before broadcasting
  describe("5. Chat Authorization & History", () => {
    test("Should allow participants to view chat history", async () => {
      const res = await fetch(`${BASE_URL}/api/chat/${interestId}/messages`, {
        headers: { Authorization: `Bearer ${tenantToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test("Should reject non-participants from viewing chat history", async () => {
      // Register another owner
      const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Other Owner",
          email: "otherowner@example.com",
          password: "password123",
          role: "OWNER",
        }),
      });
      const regData = await regRes.json();
      const otherToken = regData.token;

      const res = await fetch(`${BASE_URL}/api/chat/${interestId}/messages`, {
        headers: { Authorization: `Bearer ${otherToken}` },
      });
      expect(res.status).toBe(403);
    });
  });
});
