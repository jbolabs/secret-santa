/**
 * A private, self-contained link to one person's match, for people without
 * email. Nothing is stored: the match travels in the URL, encoded so it isn't
 * readable at a glance on a printed card or in a text message.
 */
import { drawsNames, hasEmail } from "./players";
import type { Assignment, Player } from "./types";

export interface RevealCard {
  readonly giver: string;
  readonly receiver: string;
  readonly partyName?: string;
  readonly budget?: string;
}

interface EncodedCard {
  g: string;
  r: string;
  p?: string;
  b?: string;
}

const toBase64Url = (text: string): string => {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) {
    binary += String.fromCodePoint(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
};

const fromBase64Url = (value: string): string => {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.codePointAt(0) ?? 0);
  return new TextDecoder().decode(bytes);
};

export const encodeReveal = (card: RevealCard): string => {
  const encoded: EncodedCard = { g: card.giver, r: card.receiver };
  if (card.partyName) {
    encoded.p = card.partyName;
  }
  if (card.budget) {
    encoded.b = card.budget;
  }
  return toBase64Url(JSON.stringify(encoded));
};

/** Returns null for anything that isn't a card this site made. */
export const decodeReveal = (value: string | undefined): RevealCard | null => {
  if (!value) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(value));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as EncodedCard).g !== "string" ||
      typeof (parsed as EncodedCard).r !== "string"
    ) {
      return null;
    }
    const { g, r, p, b } = parsed as EncodedCard;
    return {
      budget: typeof b === "string" && b ? b : undefined,
      giver: g,
      receiver: r,
      partyName: typeof p === "string" && p ? p : undefined,
    };
  } catch {
    return null;
  }
};

export const revealUrl = (origin: string, card: RevealCard): string =>
  `${origin}/reveal?d=${encodeReveal(card)}`;

/** One card per giver in the draw who has no email, in list order. */
export const planRevealCards = (input: {
  readonly players: readonly Player[];
  readonly assignments: readonly Assignment[];
  readonly partyName: string | undefined;
  readonly budget: string | undefined;
}): RevealCard[] => {
  const { players, assignments, partyName, budget } = input;
  const byId = new Map(players.map((p) => [p.id, p]));
  const receiverIdByGiver = new Map(
    assignments.map((a) => [a.giverId, a.receiverId])
  );
  const cards: RevealCard[] = [];
  for (const giver of players) {
    if (hasEmail(giver) || !drawsNames(giver)) {
      continue;
    }
    const receiverId = receiverIdByGiver.get(giver.id);
    const receiver = receiverId ? byId.get(receiverId) : undefined;
    if (receiver) {
      cards.push({
        budget: budget || undefined,
        giver: giver.name,
        partyName: partyName || undefined,
        receiver: receiver.name,
      });
    }
  }
  return cards;
};
