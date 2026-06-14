/**
 * Copy rows from the pre-auth AppDataStore (syncKey PK) into LegacyAppDataStore.
 * Run once after upgrading schema: npm run db:legacy-import
 */
import { PrismaClient } from "@prisma/client";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

const prisma = new PrismaClient();

async function main() {
  type LegacyRow = { syncKey: string; payload: unknown; updatedAt: Date; createdAt: Date };

  let rows: LegacyRow[] = [];
  try {
    rows = await prisma.$queryRaw<LegacyRow[]>`
      SELECT "syncKey", payload, "updatedAt", "createdAt"
      FROM "AppDataStore"
      WHERE "syncKey" IS NOT NULL
    `;
  } catch (e) {
    console.log("No legacy AppDataStore table or already migrated.", e);
    return;
  }

  for (const row of rows) {
    await prisma.legacyAppDataStore.upsert({
      where: { syncKey: row.syncKey },
      create: {
        syncKey: row.syncKey,
        payload: row.payload as object,
        updatedAt: row.updatedAt,
        createdAt: row.createdAt,
      },
      update: {
        payload: row.payload as object,
        updatedAt: row.updatedAt,
      },
    });
    console.log(`Imported legacy sync key: ${row.syncKey}`);
  }

  const count = await prisma.legacyAppDataStore.count();
  console.log(`LegacyAppDataStore now has ${count} row(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
