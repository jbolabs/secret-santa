import { MAX_BUDGET_LENGTH, readBudget } from "../budget";
import { EMAIL_PATTERN, MIN_DRAWING_PLAYERS, normalizeEmail } from "../players";
import type { Constraint, Player } from "../types";
import { toTitleCase } from "../utils";

export interface WebMCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    consequentialHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute: (input: Record<string, unknown>) => unknown;
}

export interface ModelContext {
  registerTool: (
    tool: WebMCPTool,
    options: { signal: AbortSignal }
  ) => void | Promise<void>;
}

export const emptySchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

export const exchangeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["participants"],
  properties: {
    partyName: { type: "string", maxLength: 200 },
    budget: {
      type: "string",
      maxLength: MAX_BUDGET_LENGTH,
      description:
        'Optional gift budget shown to every giver with their match, as written, e.g. "$30".',
    },
    participants: {
      type: "array",
      minItems: 3,
      maxItems: 100,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name"],
        properties: {
          name: { type: "string" },
          email: {
            type: "string",
            format: "email",
            description:
              "Optional. Omit for people without an inbox, such as kids; after the draw the page offers a printable QR card or a private link for each of them.",
          },
          isAdmin: {
            type: "boolean",
            description:
              "Organizer receives the full assignment summary if they have an email. Defaults to the first participant if none selected.",
          },
          sitsOut: {
            type: "boolean",
            description:
              "Organizers only: true means they run the exchange and get the summary but are not in the draw. At least 3 other people must draw.",
          },
        },
      },
    },
    exclusions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["giver", "receiver"],
        properties: {
          giver: { type: "string", description: "Exact participant name" },
          receiver: { type: "string", description: "Exact participant name" },
          bidirectional: { type: "boolean", default: true },
        },
      },
    },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validate the entire input before changing any draft state. */
export function parseExchange(input: Record<string, unknown>): {
  partyName: string;
  budget: string | undefined;
  players: Player[];
  constraints: Constraint[];
} {
  if (
    !Array.isArray(input.participants) ||
    input.participants.length < 3 ||
    input.participants.length > 100
  ) {
    throw new Error("Provide 3–100 participants.");
  }
  if (
    input.partyName !== undefined &&
    (typeof input.partyName !== "string" || input.partyName.length > 200)
  ) {
    throw new Error("Party name must be a string of at most 200 characters.");
  }
  const budget = readBudget(input.budget);
  const names = new Set<string>();
  const players = input.participants.map((value: unknown): Player => {
    if (
      !isRecord(value) ||
      typeof value.name !== "string" ||
      !value.name.trim() ||
      value.name.length > 200 ||
      (value.email !== undefined &&
        (typeof value.email !== "string" ||
          value.email.length > 254 ||
          (value.email.trim() !== "" &&
            !EMAIL_PATTERN.test(value.email.trim())))) ||
      (value.isAdmin !== undefined && typeof value.isAdmin !== "boolean") ||
      (value.sitsOut !== undefined && typeof value.sitsOut !== "boolean")
    ) {
      throw new Error(
        "Each participant needs a name; email is optional but must be valid when given; isAdmin and sitsOut must be booleans."
      );
    }
    if (value.sitsOut === true && value.isAdmin !== true) {
      throw new Error(
        `${value.name.trim()} can only sit out of the draw as an organizer (isAdmin: true).`
      );
    }
    const name = toTitleCase(value.name.trim());
    if (names.has(name.toLowerCase())) {
      throw new Error(
        `Duplicate participant name: ${name}. Use distinct names.`
      );
    }
    names.add(name.toLowerCase());
    return {
      id: crypto.randomUUID(),
      name,
      email: normalizeEmail(typeof value.email === "string" ? value.email : ""),
      isAdmin: value.isAdmin === true,
      ...(value.sitsOut === true && { sitsOut: true }),
    };
  });
  if (!players.some((player) => player.isAdmin)) {
    players[0].isAdmin = true;
  }
  if (
    players.filter((player) => !player.sitsOut).length < MIN_DRAWING_PLAYERS
  ) {
    throw new Error(
      "At least 3 participants must draw names; organizers who sit out don't count."
    );
  }
  if (input.exclusions !== undefined && !Array.isArray(input.exclusions)) {
    throw new Error("Exclusions must be an array.");
  }
  const constraints = ((input.exclusions ?? []) as unknown[]).map(
    (value): Constraint => {
      if (
        !isRecord(value) ||
        typeof value.giver !== "string" ||
        typeof value.receiver !== "string" ||
        (value.bidirectional !== undefined &&
          typeof value.bidirectional !== "boolean")
      ) {
        throw new Error(
          "Each exclusion needs giver and receiver names and an optional boolean bidirectional."
        );
      }
      const giver = players.find(
        (player) =>
          player.name.toLowerCase() === String(value.giver).trim().toLowerCase()
      );
      const receiver = players.find(
        (player) =>
          player.name.toLowerCase() ===
          String(value.receiver).trim().toLowerCase()
      );
      if (!giver || !receiver || giver.id === receiver.id) {
        throw new Error(
          "Exclusions must reference two different participants by name."
        );
      }
      return {
        id: crypto.randomUUID(),
        giverId: giver.id,
        receiverId: receiver.id,
        bidirectional: value.bidirectional !== false,
      };
    }
  );
  return {
    partyName: toTitleCase((input.partyName ?? "").toString().trim()),
    budget,
    players,
    constraints,
  };
}
