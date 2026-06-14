/** What accountability partners can view (matches partner snapshot filter). */
export const ACCOUNTABILITY_SHARED_ITEMS =
  "goals, habits, workouts, and daily AI summaries";

export type AccountabilityLinkParties = {
  fromShares: boolean;
  toShares: boolean;
  fromUser: { id: string; displayName: string };
  toUser: { id: string; displayName: string };
};

/** What the initiator asked for on a pending or active link. */
export function describeOutgoingRequest(link: AccountabilityLinkParties, viewerUserId: string): string[] {
  const iAmFrom = link.fromUser.id === viewerUserId;
  const partnerName = iAmFrom ? link.toUser.displayName : link.fromUser.displayName;
  const lines: string[] = [];

  if (iAmFrom) {
    if (link.fromShares) {
      lines.push(`You offered to share your ${ACCOUNTABILITY_SHARED_ITEMS} with ${partnerName}.`);
    }
    if (link.toShares) {
      lines.push(`You asked to see ${partnerName}'s ${ACCOUNTABILITY_SHARED_ITEMS}.`);
    }
  } else {
    if (link.fromShares) {
      lines.push(`${partnerName} offered to share their ${ACCOUNTABILITY_SHARED_ITEMS} with you.`);
    }
    if (link.toShares) {
      lines.push(`${partnerName} asked to see your ${ACCOUNTABILITY_SHARED_ITEMS}.`);
    }
  }

  return lines.length ? lines : ["No sharing requested yet."];
}

/** Incoming request lines for the recipient (toUser). */
export function describeIncomingRequest(link: AccountabilityLinkParties): {
  requesterName: string;
  wantsToSeeYours: boolean;
  wantsToShareWithYou: boolean;
} {
  return {
    requesterName: link.fromUser.displayName,
    wantsToSeeYours: link.toShares,
    wantsToShareWithYou: link.fromShares,
  };
}

/** Lines shown on the register screen for an accountability invite. */
export function describeInviteSetup(
  inviterName: string,
  fromShares: boolean,
  toShares: boolean,
): string[] {
  const lines: string[] = [];
  if (fromShares) {
    lines.push(`${inviterName} will share their ${ACCOUNTABILITY_SHARED_ITEMS} with you.`);
  }
  if (toShares) {
    lines.push(`You will share your ${ACCOUNTABILITY_SHARED_ITEMS} with ${inviterName}.`);
  }
  return lines.length ? lines : ["You will be connected as accountability partners."];
}

export function describeActiveLink(link: AccountabilityLinkParties, viewerUserId: string): string[] {
  const iAmFrom = link.fromUser.id === viewerUserId;
  const partnerName = iAmFrom ? link.toUser.displayName : link.fromUser.displayName;
  const lines: string[] = [];

  if (iAmFrom) {
    if (link.toShares) lines.push(`${partnerName} can see your ${ACCOUNTABILITY_SHARED_ITEMS}.`);
    if (link.fromShares) lines.push(`You share your ${ACCOUNTABILITY_SHARED_ITEMS} with ${partnerName}.`);
  } else {
    if (link.fromShares) lines.push(`You can see ${partnerName}'s ${ACCOUNTABILITY_SHARED_ITEMS}.`);
    if (link.toShares) lines.push(`${partnerName} can see your ${ACCOUNTABILITY_SHARED_ITEMS}.`);
  }

  return lines.length ? lines : ["Connected, but no sharing is enabled."];
}
