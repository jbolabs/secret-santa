import { describe, expect, it } from "vitest";

import {
  decodeReveal,
  encodeReveal,
  planRevealCards,
  revealUrl,
} from "./reveal-link";

describe(encodeReveal, () => {
  it("round-trips non-Latin names through a URL-safe value", () => {
    const card = {
      budget: "under 50 €",
      giver: "Zoë 🎄",
      partyName: "Família",
      receiver: "李雷",
    };
    const value = encodeReveal(card);
    expect(value).toMatch(/^[\w-]+$/u);
    expect(value).not.toContain("Zo");
    expect(decodeReveal(value)).toStrictEqual(card);
  });

  it("builds a link on the given origin", () => {
    const url = new URL(
      revealUrl("https://supersimplesecretsanta.com", {
        giver: "Kid",
        receiver: "Mom",
      })
    );
    expect(url.pathname).toBe("/reveal");
    expect(decodeReveal(url.searchParams.get("d") ?? "")).toStrictEqual({
      budget: undefined,
      giver: "Kid",
      partyName: undefined,
      receiver: "Mom",
    });
  });
});

describe(decodeReveal, () => {
  it("still opens links made before budgets existed", () => {
    const legacy = btoa(JSON.stringify({ g: "Kid", p: "Office", r: "Mom" }));
    expect(decodeReveal(legacy)).toStrictEqual({
      budget: undefined,
      giver: "Kid",
      partyName: "Office",
      receiver: "Mom",
    });
  });

  it.each([undefined, "", "not base64!", btoa("[]"), btoa('{"g":1}')])(
    "rejects %s",
    (value) => {
      expect(decodeReveal(value)).toBeNull();
    }
  );
});

describe(planRevealCards, () => {
  it("makes cards only for givers in the draw without email", () => {
    const cards = planRevealCards({
      assignments: [
        { giverId: "k", receiverId: "b" },
        { giverId: "b", receiverId: "j" },
        { giverId: "j", receiverId: "k" },
      ],
      budget: "$20",
      partyName: "",
      players: [
        { id: "m", isAdmin: true, name: "Mom", sitsOut: true },
        { email: "", id: "k", isAdmin: false, name: "Kid" },
        { email: "bo@example.com", id: "b", isAdmin: false, name: "Bo" },
        { id: "j", isAdmin: false, name: "Jo" },
      ],
    });
    expect(cards).toStrictEqual([
      { budget: "$20", giver: "Kid", partyName: undefined, receiver: "Bo" },
      { budget: "$20", giver: "Jo", partyName: undefined, receiver: "Kid" },
    ]);
  });
});
