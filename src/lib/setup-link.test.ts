import { describe, expect, it } from "vitest";

import { readSetupLink, setupUrl } from "./setup-link";

const input = {
  partyName: "família",
  budget: "  under 50 €  ",
  participants: [
    { name: "Sam", email: "sam@example.com" },
    { name: "Alex" },
    { name: "Zoë 🎄", email: "zoe@example.com" },
  ],
  exclusions: [{ giver: "Sam", receiver: "Alex" }],
};

describe(readSetupLink, () => {
  it("round-trips an exchange through the link", () => {
    const url = new URL(setupUrl("https://example.com", input));
    expect(url.pathname).toBe("/assign");
    const result = readSetupLink(url.hash);
    if (!result || !("draft" in result)) {
      throw new Error("expected a draft");
    }
    const { draft } = result;
    expect(draft.partyName).toBe("Família");
    expect(draft.players.map((player) => player.name)).toStrictEqual([
      "Sam",
      "Alex",
      "Zoë 🎄",
    ]);
    expect(draft.players[0].isAdmin).toBeTruthy();
    expect(draft.constraints).toHaveLength(1);
  });

  it("accepts raw JSON the browser left unencoded", () => {
    const result = readSetupLink(`#setup=${JSON.stringify(input)}`);
    expect(result).toHaveProperty("draft");
  });

  it("ignores hashes without a setup", () => {
    expect(readSetupLink("")).toBeNull();
    expect(readSetupLink("#people")).toBeNull();
  });

  it("explains a truncated link", () => {
    const url = setupUrl("https://example.com", input);
    const result = readSetupLink(new URL(url.slice(0, -20)).hash);
    expect(result).toStrictEqual({
      error: "This setup link is damaged. Check that it was copied in full.",
    });
  });

  it("keeps the budget as typed, treats blank as none and rejects a long one", () => {
    const withBudget = (budget: string) =>
      readSetupLink(
        new URL(setupUrl("https://example.com", { ...input, budget })).hash
      );
    expect(withBudget(input.budget)).toHaveProperty(
      "draft.budget",
      "under 50 €"
    );
    const blank = withBudget(" ");
    expect(blank && "draft" in blank && blank.draft.budget).toBeUndefined();
    expect(withBudget("$".repeat(41))).toStrictEqual({
      error: "Budget must be text of at most 40 characters.",
    });
  });

  it("passes along validation errors", () => {
    const result = readSetupLink(
      `#setup=${encodeURIComponent(JSON.stringify({ participants: [{ name: "Sam" }] }))}`
    );
    expect(result).toStrictEqual({ error: "Provide 3–100 participants." });
  });
});
