import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: z.string().default("info"),
  APP_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  POSTMARK_SERVER_TOKEN: z.string().min(1),
  POSTMARK_FROM_ADDRESS: z
    .string()
    .email()
    .default("search@skyknightcapital.com"),
  POSTMARK_INBOUND_WEBHOOK_SECRET: z.string().min(1),
  INBOUND_MAILBOX_ADDRESS: z
    .string()
    .email()
    .default("search@skyknightcapital.com"),
  CRON_SECRET: z.string().min(1),
});
