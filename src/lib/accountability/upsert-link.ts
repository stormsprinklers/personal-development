import { AccountabilityLinkStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

type LinkInput = {
  fromUserId: string;
  toUserId: string;
  initiatedByUserId: string;
  fromShares: boolean;
  toShares: boolean;
  status: AccountabilityLinkStatus;
};

export async function upsertAccountabilityLink(input: LinkInput, db: Db = prisma) {
  const existing = await db.accountabilityLink.findFirst({
    where: {
      OR: [
        { fromUserId: input.fromUserId, toUserId: input.toUserId },
        { fromUserId: input.toUserId, toUserId: input.fromUserId },
      ],
      status: { in: [AccountabilityLinkStatus.pending, AccountabilityLinkStatus.active] },
    },
  });

  if (existing) {
    throw new Error("A pending or active link already exists between these users.");
  }

  const endedLinks = await db.accountabilityLink.findMany({
    where: {
      OR: [
        { fromUserId: input.fromUserId, toUserId: input.toUserId },
        { fromUserId: input.toUserId, toUserId: input.fromUserId },
      ],
      status: { in: [AccountabilityLinkStatus.revoked, AccountabilityLinkStatus.rejected] },
    },
  });

  const reusableLink = endedLinks.find(
    (row) => row.fromUserId === input.fromUserId && row.toUserId === input.toUserId,
  );

  if (reusableLink) {
    return db.accountabilityLink.update({
      where: { id: reusableLink.id },
      data: {
        status: input.status,
        fromShares: input.fromShares,
        toShares: input.toShares,
        initiatedByUserId: input.initiatedByUserId,
      },
    });
  }

  if (endedLinks.length) {
    await db.accountabilityLink.deleteMany({
      where: { id: { in: endedLinks.map((row) => row.id) } },
    });
  }

  return db.accountabilityLink.create({
    data: {
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      initiatedByUserId: input.initiatedByUserId,
      status: input.status,
      fromShares: input.fromShares,
      toShares: input.toShares,
    },
  });
}
