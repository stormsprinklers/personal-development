/**
 * One-time migration: move old syncKey-based AppDataStore rows into LegacyAppDataStore,
 * then drop the old table so prisma db push can apply the user-scoped schema.
 */
import { PrismaClient } from "@prisma/client";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

const prisma = new PrismaClient();

type LegacyRow = {
  syncKey: string;
  payload: unknown;
  updatedAt: Date;
  createdAt: Date;
};

async function main() {
  const tables = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  console.log("Tables:", tables.map((t) => t.table_name).join(", ") || "(none)");

  const hasAppDataStore = tables.some((t) => t.table_name === "AppDataStore");
  if (!hasAppDataStore) {
    console.log("No AppDataStore table — nothing to migrate.");
    return;
  }

  const columns = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'AppDataStore'
    ORDER BY ordinal_position
  `;
  const columnNames = columns.map((c) => c.column_name);
  console.log("AppDataStore columns:", columnNames.join(", "));

  if (!columnNames.includes("syncKey")) {
    console.log("AppDataStore already uses the new schema — skipping migration.");
    return;
  }

  const rows = await prisma.$queryRaw<LegacyRow[]>`
    SELECT "syncKey", payload, "updatedAt", "createdAt"
    FROM "AppDataStore"
    WHERE "syncKey" IS NOT NULL
  `;
  console.log(`Found ${rows.length} legacy AppDataStore row(s).`);

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "LegacyAppDataStore" (
      "syncKey" TEXT NOT NULL,
      payload JSONB NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LegacyAppDataStore_pkey" PRIMARY KEY ("syncKey")
    )
  `;

  for (const row of rows) {
    const payloadJson = JSON.stringify(row.payload);
    await prisma.$executeRaw`
      INSERT INTO "LegacyAppDataStore" ("syncKey", payload, "updatedAt", "createdAt")
      VALUES (${row.syncKey}, ${payloadJson}::jsonb, ${row.updatedAt}, ${row.createdAt})
      ON CONFLICT ("syncKey") DO UPDATE SET
        payload = EXCLUDED.payload,
        "updatedAt" = EXCLUDED."updatedAt"
    `;
    console.log(`Migrated sync key: ${row.syncKey}`);
  }

  await prisma.$executeRaw`DROP TABLE "AppDataStore"`;
  console.log("Dropped legacy AppDataStore table. Run npm run db:push next.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
