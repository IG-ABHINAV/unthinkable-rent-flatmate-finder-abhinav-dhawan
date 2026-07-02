import { z } from "zod";

const blankToUndefined = (value: unknown) => value === "" ? undefined : value;

export const config = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  LLM_API_KEY: z.preprocess(blankToUndefined, z.string().optional()),
  LLM_MODEL: z.string().default("gpt-4o-mini"),
  SMTP_HOST: z.preprocess(blankToUndefined, z.string().optional()),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.preprocess(blankToUndefined, z.string().optional()),
  SMTP_PASS: z.preprocess(blankToUndefined, z.string().optional()),
  SMTP_FROM: z.string().default("Rent Finder <noreply@example.com>"),
  APP_URL: z.string().url().default("http://localhost:5173")
}).parse(process.env);

