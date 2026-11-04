/**
 * Who gets which email after a draw. Pure: rendering and sending happen in
 * `src/routes/api/send-emails.ts`, so this is testable without a Worker.
 */
import { hasEmail } from "./players";
import type { Assignment, Player } from "./types";

export interface AssignmentMail {
  readonly kind: "assignment";
  readonly to: string;
  readonly subject: string;
  readonly giverName: string;
  readonly receiverName: string;
  readonly partyName: string | undefined;
  readonly budget: string | undefined;
}

export interface AdminMail {
  readonly kind: "admin";
  readonly to: string;
  readonly subject: string;
  readonly adminName: string;
  readonly resultsUrl: string;
  readonly partyName: string | undefined;
}

export type OutgoingMail = AssignmentMail | AdminMail;

/** "Jane Q Doe" → "Jane D", so the admin link never carries full names. */
const compactName = (name: string): string => {
  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    return name;
  }
  const [firstName] = parts;
  const lastInitial = parts.at(-1)?.[0] ?? "";
  return `${firstName} ${lastInitial}`;
};

/** The `data` query value `/results` decodes with `atob`. */
export const encodeResults = (
  assignments: readonly Assignment[],
  players: readonly Player[],
  partyName: string | undefined
): string => {
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const compactData = {
    assignments: assignments.map((a) => ({
      giver: compactName(playerMap.get(a.giverId)?.name ?? "Unknown"),
      receiver: compactName(playerMap.get(a.receiverId)?.name ?? "Unknown"),
    })),
    partyName,
  };
  return Buffer.from(JSON.stringify(compactData)).toString("base64");
};

/**
 * One assignment email per giver with an inbox, then one summary per admin with
 * an inbox linking to the full results. Givers without email get reveal cards
 * on the page instead (`src/lib/reveal-link.ts`). Throws when an assignment
 * names a player who isn't in the list.
 */
export const planMail = (input: {
  readonly players: readonly Player[];
  readonly assignments: readonly Assignment[];
  readonly partyName: string | undefined;
  readonly budget: string | undefined;
  readonly origin: string;
}): { participants: AssignmentMail[]; admins: AdminMail[] } => {
  const { players, assignments, partyName, budget, origin } = input;
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const event = partyName ?? "Secret Santa";

  const participants: AssignmentMail[] = [];
  for (const assignment of assignments) {
    const giver = playerMap.get(assignment.giverId);
    const receiver = playerMap.get(assignment.receiverId);
    if (!(giver && receiver)) {
      throw new Error("Invalid assignment: player not found");
    }
    if (hasEmail(giver)) {
      participants.push({
        budget,
        giverName: giver.name,
        kind: "assignment",
        partyName,
        receiverName: receiver.name,
        subject: `Hey ${giver.name}! You've been assigned for ${event}...`,
        to: giver.email,
      });
    }
  }

  const resultsUrl = `${origin}/results?data=${encodeResults(assignments, players, partyName)}`;
  const admins: AdminMail[] = [];
  for (const player of players) {
    if (player.isAdmin && hasEmail(player)) {
      admins.push({
        adminName: player.name,
        kind: "admin",
        partyName,
        resultsUrl,
        subject: `Admin: ${event} Results`,
        to: player.email,
      });
    }
  }

  return { admins, participants };
};
