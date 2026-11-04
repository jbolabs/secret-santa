/**
 * CI control plane, as code: the repository's GitHub environments, the `main`
 * ruleset, the `preview` label, and scoped, expiring Cloudflare deploy tokens
 * written into those environments as secrets. GitHub never holds a value a
 * human pasted. Adapted from `jbolabs/stacks/github.ts`.
 *
 *   ALCHEMY_PROFILE=admin bunx alchemy deploy stacks/github.ts --stage ci
 *
 * Needs the operator's `admin` profile (it creates Cloudflare API tokens and
 * reads `secret-santa-prod` env `preview`) and a GitHub login. Deploy once,
 * then again to rotate (bump `deployTokens.generation`).
 */

import * as Cloudflare from "@alchemy.run/cloudflare";
import * as GitHub from "@alchemy.run/github";
import * as Alchemy from "alchemy";
import { Effect, Layer } from "effect";

import { accountId, deployTokens, repository, zoneId } from "./config.ts";
import { CONTROL_PLANE_STAGE, ciProd, stageSecrets } from "./secrets.ts";

/** What the app stack creates on every stage. */
const appPermissions: Cloudflare.ApiToken.PermissionGroupRef[] = [
  "Account Settings Read",
  "Workers Scripts Write",
  "Turnstile Sites Write",
  "Email Sending Write",
  "Workers Observability Write",
  // The shared Alchemy state store keeps its bearer token in the account Secrets Store.
  "Secrets Store Write",
];

/** Production also attaches the custom domain, onboards apex sending, writes bot settings. */
const zonePermissions: Cloudflare.ApiToken.PermissionGroupRef[] = [
  "Zone Read",
  "DNS Write",
  "Workers Routes Write",
  "Bot Management Write",
];

const account = { [`com.cloudflare.api.account.${accountId}`]: "*" };
/** Zone permissions reach only supersimplesecretsanta.com, never the account's other zones. */
const siteZone = {
  [`com.cloudflare.api.account.${accountId}`]: {
    [`com.cloudflare.api.account.zone.${zoneId}`]: "*",
  },
};

interface DeployEnvironment {
  readonly id: string;
  readonly name: string;
  readonly branches: { customBranchPolicies: string[] } | null;
  readonly policies: Cloudflare.ApiToken.Policy[];
}

export const environments: readonly DeployEnvironment[] = [
  {
    branches: null,
    id: "Preview",
    name: "preview",
    policies: [
      { effect: "allow", permissionGroups: appPermissions, resources: account },
    ],
  },
  {
    // Merging to main is the approval; only main may deploy production (and
    // only this environment's jobs can assume the ci-prod Infisical identity).
    branches: { customBranchPolicies: ["main"] },
    id: "Production",
    name: "production",
    policies: [
      { effect: "allow", permissionGroups: appPermissions, resources: account },
      {
        effect: "allow",
        permissionGroups: zonePermissions,
        resources: siteZone,
      },
    ],
  },
];

const ciOnly = Layer.unwrap(
  Alchemy.Stage.pipe(
    Effect.flatMap((stage) =>
      stage === CONTROL_PLANE_STAGE
        ? Effect.succeed(Cloudflare.state())
        : Effect.die(
            new Error(
              `stacks/github.ts only deploys --stage ${CONTROL_PLANE_STAGE} (got ${stage})`
            )
          )
    )
  )
);

export default Alchemy.Stack(
  "secret-santa-ci",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), GitHub.providers()),
    secrets: stageSecrets,
    state: ciOnly,
  },
  Effect.gen(function* controlPlane() {
    const { owner } = repository;
    const repo = repository.repository;
    yield* GitHub.Label("PreviewLabel", {
      color: "0e8a16",
      description: "Deploy this PR to a preview stage",
      name: "preview",
      owner,
      repository: repo,
    });
    for (const environment of environments) {
      const githubEnvironment = yield* GitHub.Environment(
        `${environment.id}Environment`,
        {
          deploymentBranchPolicy: environment.branches ?? undefined,
          name: environment.name,
          owner,
          repository: repo,
        }
      );
      const token = yield* Cloudflare.ApiToken.AccountApiToken(
        `${environment.id}DeployToken${deployTokens.generation}`,
        {
          accountId,
          expiresOn: deployTokens.expiresOn,
          name: `${repo}-${environment.name}-deploy-g${deployTokens.generation}`,
          policies: environment.policies,
        }
      );
      yield* GitHub.Secret(`${environment.id}CloudflareToken`, {
        environment: githubEnvironment,
        name: "CLOUDFLARE_API_TOKEN",
        owner,
        repository: repo,
        value: token.value,
      });
      yield* GitHub.Variable(`${environment.id}CloudflareAccount`, {
        environment: githubEnvironment,
        name: "CLOUDFLARE_ACCOUNT_ID",
        owner,
        repository: repo,
        value: accountId,
      });
      if (environment.name === "production") {
        // Prod deploys read `secret-santa-prod` (env `prod`) through Infisical OIDC.
        yield* GitHub.Variable("ProductionInfisicalIdentity", {
          environment: githubEnvironment,
          name: "INFISICAL_IDENTITY_ID",
          owner,
          repository: repo,
          value: ciProd.identityId,
        });
        yield* GitHub.Variable("ProductionInfisicalAudience", {
          environment: githubEnvironment,
          name: "INFISICAL_OIDC_AUDIENCE",
          owner,
          repository: repo,
          value: ciProd.audience,
        });
      }
    }
    // Repo-level (job `if:` conditions cannot see environment variables): CI's
    // deploy jobs skip until this stack has created the environments and tokens.
    yield* GitHub.Variable("DeploysEnabled", {
      name: "DEPLOYS_ENABLED",
      owner,
      repository: repo,
      value: "true",
    });
    yield* GitHub.Ruleset("MainRuleset", {
      conditions: { include: ["refs/heads/main"] },
      enforcement: "active",
      name: "main",
      owner,
      pullRequest: { requiredApprovingReviewCount: 0 },
      repository: repo,
      requiredStatusChecks: {
        checks: [{ context: "check" }],
        strictRequiredStatusChecksPolicy: false,
      },
      target: "branch",
    });
    return {
      environments: environments.map((environment) => environment.name),
    };
  })
);
