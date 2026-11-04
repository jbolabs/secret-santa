// Type definitions for Secret Santa app

export interface Player {
  id: string;
  name: string;
  /** Empty or missing: no inbox, so they get a reveal card instead of an email. */
  email?: string;
  isAdmin: boolean;
  /** An organizer who runs the exchange but isn't in the draw. Only organizers sit out. */
  sitsOut?: boolean;
}

export interface Constraint {
  id: string;
  // Player who cannot give
  giverId: string;
  // Player who cannot receive from giver
  receiverId: string;
  // If true, receiver also cannot give to giver
  bidirectional: boolean;
}

export interface Assignment {
  giverId: string;
  receiverId: string;
}

/** Step 1 of setup: both optional, blank means none. */
export interface EventDetails {
  partyName: string;
  budget: string;
}

export interface SecretSantaData {
  players: Player[];
  constraints: Constraint[];
  assignments: Assignment[];
  partyName?: string;
  /** Free text, e.g. "$30"; see `src/lib/budget.ts`. */
  budget?: string;
}
