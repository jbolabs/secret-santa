import {
  readPersistedJson,
  removePersisted,
  writePersistedJson,
} from "./client-persist";
import type {
  Assignment,
  Constraint,
  EventDetails,
  Player,
  SecretSantaData,
} from "./types";

const STORAGE_KEY = "secret-santa-data";

const defaultData: SecretSantaData = {
  assignments: [],
  budget: undefined,
  constraints: [],
  partyName: undefined,
  players: [],
};

export function getData(): SecretSantaData {
  return readPersistedJson(STORAGE_KEY, defaultData);
}

export function saveData(data: SecretSantaData): void {
  writePersistedJson(STORAGE_KEY, data);
}

export function getPlayers(): Player[] {
  return getData().players;
}

export function savePlayers(players: Player[]): void {
  const data = getData();
  data.players = players;
  saveData(data);
}

export function addPlayer(player: Player): void {
  const data = getData();
  data.players.push(player);
  saveData(data);
}

export function removePlayer(playerId: string): void {
  const data = getData();
  data.players = data.players.filter((p) => p.id !== playerId);
  data.constraints = data.constraints.filter(
    (c) => c.giverId !== playerId && c.receiverId !== playerId
  );
  const hasAdmin = data.players.some((p) => p.isAdmin);
  if (!hasAdmin && data.players.length > 0) {
    data.players[0].isAdmin = true;
  }
  saveData(data);
}

export function toggleAdmin(playerId: string): void {
  const data = getData();
  const player = data.players.find((p) => p.id === playerId);
  if (!player) {
    return;
  }

  player.isAdmin = !player.isAdmin;
  if (!player.isAdmin) {
    // Only organizers may sit out; a former organizer rejoins the draw.
    player.sitsOut = false;
  }

  const hasAdmin = data.players.some((p) => p.isAdmin);
  if (!hasAdmin && data.players.length > 0) {
    data.players[0].isAdmin = true;
  }

  saveData(data);
}

/** Organizers only: toggle between drawing names and just running the exchange. */
export function toggleSitsOut(playerId: string): void {
  const data = getData();
  const player = data.players.find((p) => p.id === playerId);
  if (!player?.isAdmin) {
    return;
  }
  player.sitsOut = !player.sitsOut;
  data.assignments = [];
  saveData(data);
}

export function replacePlayers(players: Player[]): void {
  const data = getData();
  data.players = players;
  data.constraints = [];
  data.assignments = [];
  saveData(data);
}

export function getConstraints(): Constraint[] {
  return getData().constraints;
}

export function saveConstraints(constraints: Constraint[]): void {
  const data = getData();
  data.constraints = constraints;
  saveData(data);
}

export function addConstraint(constraint: Constraint): void {
  const data = getData();
  data.constraints.push(constraint);
  saveData(data);
}

export function removeConstraint(constraintId: string): void {
  const data = getData();
  data.constraints = data.constraints.filter((c) => c.id !== constraintId);
  saveData(data);
}

export function getAssignments(): Assignment[] {
  return getData().assignments;
}

export function saveAssignments(assignments: Assignment[]): void {
  const data = getData();
  data.assignments = assignments;
  saveData(data);
}

export function clearAssignments(): void {
  const data = getData();
  data.assignments = [];
  saveData(data);
}

export function saveEvent(event: EventDetails): void {
  const data = getData();
  data.partyName = event.partyName;
  data.budget = event.budget;
  saveData(data);
}

export function clearAllData(): void {
  removePersisted(STORAGE_KEY);
}
