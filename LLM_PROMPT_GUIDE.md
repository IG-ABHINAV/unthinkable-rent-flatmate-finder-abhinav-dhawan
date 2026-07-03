# LLM Prompt & Compatibility Scoring Guide

## Overview

The Roomly platform uses an AI compatibility engine to calculate a match score (0 to 100) and a human-readable explanation for every tenant–listing pair. The engine supports OpenAI models (e.g. `gpt-4o-mini`), Google Gemini, and OpenRouter models, and features a fallback rule-based formula if the LLM is unavailable or fails validation.

---

## LLM System Instruction

```text
You are a professional flatmate matching assistant. Calculate compatibility from 0 to 100 between a tenant and a room listing. Return a JSON object with keys: score (number) and explanation (string, max 600 chars). The explanation should be a concise, friendly, and structured summary detailing why they are a good fit or if there are conflicts, highlighting shared hobbies, budget, location, and lifestyle habits.
```

---

## User Prompt Template

```text
Room listing: {{listing_json_data}}
Tenant profile: {{profile_json_data}}

Requirements:
1. If listing genderPreference is not "ANY", and tenant gender is not "ANY", and they do not match, score MUST be 0 and explanation must state the gender mismatch.
2. Consider budget alignment, location proximity, smoking preference, pet allowance, vegetarian/non-vegetarian alignment, sleeping patterns, and shared hobbies/interests. Shared interests should boost the score.
3. Return JSON: { "score": number, "explanation": string }
```

---

## Response JSON Schema Validation

Responses are strictly parsed and validated using Zod:
```typescript
const responseSchema = z.object({
  score: z.number().min(0).max(100),
  explanation: z.string().min(1).max(600)
});
```

---

## Example Input / Output

### Input Room Listing
```json
{
  "title": "Modern Room in Koramangala 4th Block",
  "location": "Koramangala",
  "rent": 14000,
  "roomType": "Single Room",
  "furnishingStatus": "Fully Furnished",
  "genderPreference": "ANY",
  "smokingAllowed": false,
  "petsAllowed": false,
  "dietaryPolicy": "VEG_ONLY",
  "sleepHabitAllowed": "ANY",
  "roommateInterests": ["coding", "reading", "gaming"]
}
```

### Input Tenant Profile
```json
{
  "preferredLocation": "Koramangala",
  "budgetMin": 10000,
  "budgetMax": 16000,
  "gender": "MALE",
  "genderPreference": "ANY",
  "smoking": false,
  "pets": false,
  "diet": "VEG",
  "sleepHabit": "NIGHT_OWL",
  "interests": ["coding", "gaming", "music"]
}
```

### Expected Output JSON
```json
{
  "score": 92,
  "explanation": "Great fit! Location is an exact match in Koramangala, and the ₹14,000 rent fits nicely within your budget range. You share non-smoking and vegetarian lifestyle habits, plus 2 common interests (coding, gaming)."
}
```

---

## Fallback Rule-Based Formula (When LLM is Unavailable)

If an LLM call times out (8 seconds), returns a non-2xx status, or fails JSON parsing, the scoring service automatically computes the score using a deterministic formula:

1. **Gender Hard Constraint**:
   - If `listing.genderPreference !== 'ANY'` and `profile.gender !== 'ANY'` and `listing.genderPreference !== profile.gender`:
     - `score = 0`
     - `explanation = "Gender mismatch: listing requires a {{genderPreference}} roommate..."`
2. **Location Match (0 to 30 pts)**:
   - Exact text match: +30
   - Partial text match: +15
3. **Budget Match (0 to 30 pts)**:
   - Within `[budgetMin, budgetMax]`: +30
   - Under budget: `max(0, 30 - ((budgetMin - rent) / budgetMin) * 30)`
   - Over budget: `max(0, 30 - ((rent - budgetMax) / budgetMax) * 60)`
4. **Lifestyle Match (0 to 30 pts)**:
   - Smoking alignment: +7.5
   - Pet alignment: +7.5
   - Dietary alignment (Veg vs Non-Veg): +7.5
   - Sleep schedule alignment: +7.5
5. **Shared Interests (0 to 10 pts)**:
   - `min(10, overlapping_interest_count * 2.5)`

The resulting score is clamped `[0, 100]` and tagged with `scoringMethod: "FALLBACK"`.
