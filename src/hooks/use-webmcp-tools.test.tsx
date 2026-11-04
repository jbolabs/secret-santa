/* oxlint-disable vitest/max-expects -- Verify the complete agent journey and privacy invariants together. */
import {
  act,
  cleanup,
  render,
  renderHook,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { generateAssignments } from "../lib/secret-santa-assignments";
import { clearAllData, getData, saveAssignments } from "../lib/storage";
import type { SecretSantaData } from "../lib/types";
import { exchangeGuideTool } from "../lib/webmcp/guide";
import { emptySchema, parseExchange } from "../lib/webmcp/tools";
import type { WebMCPTool } from "../lib/webmcp/tools";
import { useExchangeWebMCP } from "./use-exchange-webmcp";
import { useWebMCPTools } from "./use-webmcp-tools";

function installRegistry() {
  const registry = new Map<string, WebMCPTool>();
  const registerTool = vi.fn<
    (tool: WebMCPTool, options: { signal: AbortSignal }) => void
  >((tool: WebMCPTool, { signal }: { signal: AbortSignal }) => {
    registry.set(tool.name, tool);
    signal.addEventListener("abort", () => {
      registry.delete(tool.name);
    });
  });
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: { registerTool },
  });
  return { registry, registerTool };
}

function ExchangeHarness() {
  const [data, setData] = useState<SecretSantaData>(getData);
  useExchangeWebMCP({
    ...data,
    partyName: data.partyName ?? "",
    budget: data.budget ?? "",
    isGenerating: false,
    goToStep: () => {},
    onConfigure: () => setData(getData()),
    handleGenerateAssignments: () => {
      const result = generateAssignments(data.players, data.constraints);
      if (!result.assignments) {
        return { error: result.error };
      }
      saveAssignments(result.assignments);
      setData(getData());
      return { status: "drawing" };
    },
  });
  return (
    <p>
      {data.players.length} participants; {data.assignments.length} assignments
    </p>
  );
}

describe("WebMCP", () => {
  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(document, "modelContext");
    clearAllData();
  });

  const input = {
    partyName: "Demo",
    budget: "$30",
    participants: ["Alice", "Bob", "Cara", "Dan"].map((name) => ({
      name,
      email: `${name}@example.com`,
    })),
    exclusions: [{ giver: "Alice", receiver: "Bob" }],
  };

  test("guide coexists with page tools and returns read-only Markdown", async () => {
    const { registry } = installRegistry();
    renderHook(() => useWebMCPTools([exchangeGuideTool]));
    renderHook(() =>
      useWebMCPTools([
        {
          name: "page_tool",
          description: "Page action",
          inputSchema: emptySchema,
          execute: () => "ok",
        },
      ])
    );
    const guide = registry.get("get_exchange_guide");
    expect(guide).toMatchObject({
      annotations: { readOnlyHint: true },
      description: expect.stringContaining("Call this first"),
    });
    await expect(guide?.execute({})).resolves.toStrictEqual(
      expect.stringContaining("# Organize a Secret Santa exchange")
    );
    await expect(guide?.execute({})).resolves.toStrictEqual(
      expect.stringContaining("send_assignment_emails")
    );
    expect(getData()).toMatchObject({ players: [], assignments: [] });
  });

  test("validates a complete group, organizer and exclusions before any persistence", () => {
    const draft = parseExchange(input);
    expect(draft.players[0].isAdmin).toBeTruthy();
    expect(draft.players[0].email).toBe("alice@example.com");
    expect(draft.constraints[0]).toMatchObject({
      giverId: draft.players[0].id,
      receiverId: draft.players[1].id,
      bidirectional: true,
    });
    expect(() =>
      parseExchange({
        ...input,
        exclusions: [{ giver: "Missing", receiver: "Bob" }],
      })
    ).toThrow("two different participants");
    expect(() =>
      parseExchange({
        participants: [...input.participants, input.participants[0]],
      })
    ).toThrow("Duplicate");
    expect(() =>
      parseExchange({
        participants: [{ name: "A", email: "bad" }, ...input.participants],
      })
    ).toThrow("must be valid");
    expect(getData().players).toStrictEqual([]);
  });

  test("accepts people without email and organizers who sit out", () => {
    const draft = parseExchange({
      participants: [
        { name: "Mom", email: "mom@example.com", isAdmin: true, sitsOut: true },
        { name: "Kid One" },
        { name: "Kid Two", email: "" },
        { name: "Kid Three" },
      ],
    });
    expect(
      draft.players.map(({ name, email, isAdmin, sitsOut }) => ({
        name,
        email,
        isAdmin,
        sitsOut,
      }))
    ).toStrictEqual([
      { name: "Mom", email: "mom@example.com", isAdmin: true, sitsOut: true },
      { name: "Kid One", email: "", isAdmin: false, sitsOut: undefined },
      { name: "Kid Two", email: "", isAdmin: false, sitsOut: undefined },
      { name: "Kid Three", email: "", isAdmin: false, sitsOut: undefined },
    ]);
    expect(() =>
      parseExchange({
        participants: [{ name: "A", sitsOut: true }, ...input.participants],
      })
    ).toThrow("only sit out of the draw as an organizer");
    expect(() =>
      parseExchange({
        participants: [
          { name: "Mom", isAdmin: true, sitsOut: true },
          { name: "A" },
          { name: "B" },
        ],
      })
    ).toThrow("At least 3 participants must draw");
  });

  test("registry keeps current callbacks without registering again and cleans up", async () => {
    const { registry, registerTool } = installRegistry();
    const { rerender, unmount } = renderHook(
      ({ value }) =>
        useWebMCPTools([
          {
            name: "status",
            description: "Status",
            inputSchema: emptySchema,
            execute: () => value,
          },
        ]),
      { initialProps: { value: 1 } }
    );
    await waitFor(() => expect(registry.size).toBe(1));
    rerender({ value: 2 });
    await expect(registry.get("status")?.execute({})).resolves.toBe(2);
    expect(registerTool).toHaveBeenCalledOnce();
    unmount();
    expect(registry.size).toBe(0);
  });

  test("tool failures are actionable and unsupported browsers remain usable", async () => {
    const { registry } = installRegistry();
    renderHook(() =>
      useWebMCPTools([
        {
          name: "fail",
          description: "Fails",
          inputSchema: emptySchema,
          execute: () => {
            throw new Error("Fix the input");
          },
        },
      ])
    );
    await expect(registry.get("fail")?.execute({})).resolves.toStrictEqual({
      error: "Fix the input",
    });
    Reflect.deleteProperty(document, "modelContext");
    expect(() => renderHook(() => useWebMCPTools([]))).not.toThrow();
  });

  test("agent can configure and draw; retries preserve work and no tool exposes matches", async () => {
    const { registry } = installRegistry();
    const view = render(<ExchangeHarness />);
    await act(async () => {
      await registry.get("configure_exchange")?.execute(input);
    });
    expect(view.getByText("4 participants; 0 assignments")).toBeTruthy();
    const before = getData();
    await expect(
      registry.get("configure_exchange")?.execute(input)
    ).resolves.toHaveProperty("error");
    expect(getData()).toStrictEqual(before);
    await act(async () => {
      await expect(
        registry.get("draw_secret_santa")?.execute({})
      ).resolves.toStrictEqual({ status: "drawing" });
    });
    expect(view.getByText("4 participants; 4 assignments")).toBeTruthy();
    expect(getData().assignments).not.toContainEqual({
      giverId: before.players[0].id,
      receiverId: before.players[1].id,
    });
    await expect(
      registry.get("draw_secret_santa")?.execute({})
    ).resolves.toHaveProperty("error");
    const status = await registry.get("get_exchange_status")?.execute({});
    expect(status).not.toHaveProperty("assignments");
    expect(status).toHaveProperty("status", "ready_to_send");
    expect(status).toHaveProperty("budget", "$30");
  });
});
