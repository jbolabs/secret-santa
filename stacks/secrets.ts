/**
 * The only place with this repo's Infisical ids and its stage → source
 * mapping (shared jbolabs standard: `sites/docs/adr/0004-infisical-secret-tiers.md`).
 * Ids only, not secrets. Values load into Effect Config, never `process.env`.
 *
 * | Stage                                  | Reads                          | Identity                    |
 * | -------------------------------------- | ------------------------------ | --------------------------- |
 * | `prod` (CI on `main` only)             | `secret-santa-prod` env `prod` | `ci-prod` over GitHub OIDC  |
 * | `ci` (operator, `stacks/github.ts`)    | `secret-santa-prod` env `preview` | `operator` (`admin` profile) |
 * | `pr-*`, or anything in GitHub Actions  | nothing                        | GitHub `preview` env secrets |
 * | anything else locally (`dev-*`)        | `secret-santa-dev` env `dev`   | Alchemy profile (`agent-dev`) |
 *
 * Both projects are empty today: Alchemy mints every credential the app
 * uses. Add a value to Infisical (never a `.env`) and read it with
 * `Config.Redacted("NAME")` in a stack.
 */

import * as Infisical from "@alchemy.run/infisical";
import type { StackSecrets } from "alchemy";

import { isPullRequestStage } from "./stage.ts";

/** Infisical project UUIDs (a machine identity only resolves UUIDs, not slugs). */
export const infisical = {
  dev: "15cf2fcb-2af6-449b-ad28-4d3dc9033493",
  prod: "322067cc-5154-448d-af30-1d3f5e3ef5c4",
} as const;

/** `ci-prod`: reads `*-prod` from jbolabs GitHub Actions jobs in the `production` environment. */
export const ciProd = {
  audience: "https://github.com/jbolabs",
  identityId: "23fa16cc-a7a1-4e35-8011-2f24b0e037ba",
} as const;

/** The control-plane stage `stacks/github.ts` deploys to. */
export const CONTROL_PLANE_STAGE = "ci";

export interface SecretSource {
  readonly project: string;
  readonly environment: "dev" | "preview" | "prod";
}

/** Which Infisical project and environment `stage` reads, or `undefined` for none. */
export const secretSource = (
  stage: string,
  inGitHubActions: boolean
): SecretSource | undefined => {
  if (stage === "prod") {
    return { environment: "prod", project: infisical.prod };
  }
  if (stage === CONTROL_PLANE_STAGE) {
    return { environment: "preview", project: infisical.prod };
  }
  return inGitHubActions || isPullRequestStage(stage)
    ? undefined
    : { environment: "dev", project: infisical.dev };
};

/** The `secrets` option for every `Alchemy.Stack` in this repo. */
export const stageSecrets: StackSecrets = ({ stage }) => {
  const source = secretSource(stage, process.env.GITHUB_ACTIONS === "true");
  return source === undefined ? [] : [Infisical.Secrets({ ...source })];
};
