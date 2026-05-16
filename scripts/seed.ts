import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../src/lib/env";
import {
  executives,
  interactions,
  pipelineEntries,
  searches,
  users,
} from "../src/lib/db/schema";

// Deterministic UUIDs so reruns are idempotent against seed-only rows.
const U = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;

const userRows = [
  { id: U(1), name: "Aiko Tanaka", role: "partner" as const, avatarUrl: "/avatars/1.svg" },
  { id: U(2), name: "Ravi Patel", role: "partner" as const, avatarUrl: "/avatars/2.svg" },
  { id: U(3), name: "Eleanor Cho", role: "partner" as const, avatarUrl: "/avatars/3.svg" },
  { id: U(4), name: "Diego Hernández", role: "associate" as const, avatarUrl: "/avatars/4.svg" },
  { id: U(5), name: "Priya Shah", role: "associate" as const, avatarUrl: "/avatars/5.svg" },
  { id: U(6), name: "Marcus Bell", role: "associate" as const, avatarUrl: "/avatars/6.svg" },
];

const executiveRows = [
  {
    id: U(101),
    name: "Jordan Reyes",
    email: "jordan.reyes@example.com",
    currentRole: "VP of Engineering, Nimbus Logistics",
  },
  {
    id: U(102),
    name: "Sasha Lin",
    email: "sasha.lin@example.com",
    currentRole: "CFO, Helios Health",
  },
  {
    id: U(103),
    name: "Mateo Alvarez",
    email: "mateo.alvarez@example.com",
    currentRole: "Chief Revenue Officer, Vector Foods",
  },
];

const searchRows = [
  {
    id: U(201),
    portfolioCompany: "Nimbus Logistics",
    roleTitle: "Chief Technology Officer",
    hiringManager: "Karen Wells",
    status: "open" as const,
  },
  {
    id: U(202),
    portfolioCompany: "Helios Health",
    roleTitle: "Chief Financial Officer",
    hiringManager: "Tomás Riveros",
    status: "open" as const,
  },
];

const pipelineRows = [
  {
    id: U(301),
    executiveId: U(101),
    searchId: U(201),
    ownerId: U(1),
    stage: "partner_interview" as const,
    baseSalaryCents: 35_000_000,
    targetBonusCents: 17_500_000,
    equityBps: 75,
  },
  {
    id: U(302),
    executiveId: U(102),
    searchId: U(202),
    ownerId: U(2),
    stage: "screening" as const,
    baseSalaryCents: 40_000_000,
    targetBonusCents: 20_000_000,
    equityBps: 50,
  },
  {
    id: U(303),
    executiveId: U(103),
    searchId: U(201),
    ownerId: U(4),
    stage: "contacted" as const,
  },
];

const interactionRows = [
  {
    id: U(401),
    executiveId: U(101),
    pipelineEntryId: U(301),
    senderId: U(1),
    senderRole: "partner" as const,
    direction: "outbound" as const,
    occurredAt: new Date("2026-05-08T16:00:00Z"),
    subject: "Intro to Nimbus CTO search",
  },
  {
    id: U(402),
    executiveId: U(101),
    pipelineEntryId: U(301),
    senderId: null,
    senderRole: "partner" as const,
    direction: "inbound" as const,
    occurredAt: new Date("2026-05-09T14:12:00Z"),
    subject: "Re: Intro to Nimbus CTO search",
    postmarkMessageId: "seed-msg-401",
  },
  {
    id: U(403),
    executiveId: U(102),
    pipelineEntryId: U(302),
    senderId: U(2),
    senderRole: "partner" as const,
    direction: "outbound" as const,
    occurredAt: new Date("2026-05-10T18:30:00Z"),
    subject: "Helios CFO conversation",
  },
];

async function main() {
  const client = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(client);

  await db.insert(users).values(userRows).onConflictDoNothing();
  await db.insert(executives).values(executiveRows).onConflictDoNothing();
  await db.insert(searches).values(searchRows).onConflictDoNothing();
  await db.insert(pipelineEntries).values(pipelineRows).onConflictDoNothing();
  await db.insert(interactions).values(interactionRows).onConflictDoNothing();

  await client.end();
  console.log(
    `seeded ${userRows.length} users, ${executiveRows.length} executives, ` +
      `${searchRows.length} searches, ${pipelineRows.length} pipeline entries, ` +
      `${interactionRows.length} interactions`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
