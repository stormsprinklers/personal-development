import { AccountabilityLinkStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * On link fromUserId=A, toUserId=B:
 * - fromShares: A shares progress with B
 * - toShares: B shares progress with A
 */
export async function canViewPartnerData(viewerId: string, ownerId: string): Promise<boolean> {
  if (viewerId === ownerId) return true;

  const link = await prisma.accountabilityLink.findFirst({
    where: {
      status: AccountabilityLinkStatus.active,
      OR: [
        { fromUserId: ownerId, toUserId: viewerId, fromShares: true },
        { fromUserId: viewerId, toUserId: ownerId, toShares: true },
      ],
    },
  });
  return Boolean(link);
}

export async function getPartnersSharingWith(userId: string) {
  const links = await prisma.accountabilityLink.findMany({
    where: {
      status: AccountabilityLinkStatus.active,
      OR: [
        { toUserId: userId, fromShares: true },
        { fromUserId: userId, toShares: true },
      ],
    },
    include: {
      fromUser: { select: { id: true, displayName: true, accountabilityCode: true } },
      toUser: { select: { id: true, displayName: true, accountabilityCode: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return links.map((link) => {
    const partner = link.toUserId === userId ? link.fromUser : link.toUser;
    const theyShareWithMe =
      (link.toUserId === userId && link.fromShares) || (link.fromUserId === userId && link.toShares);
    const iShareWithThem =
      (link.fromUserId === userId && link.fromShares) || (link.toUserId === userId && link.toShares);
    return {
      linkId: link.id,
      userId: partner.id,
      displayName: partner.displayName,
      accountabilityCode: partner.accountabilityCode,
      theyShareWithMe,
      iShareWithThem,
    };
  });
}
