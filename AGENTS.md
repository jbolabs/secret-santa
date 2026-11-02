# Super Simple Secret Santa

TanStack Start on Cloudflare Workers, deployed with Alchemy v2. Follows the jbolabs standard in `~/code/projects/sites/docs/stack.md` (Alchemy owns all infra; Infisical secret tiers; prod deploys from CI only).

## Product bar

Build every app and site to the bar of Linear's website or Apple Notes: simple purpose, simple architecture, simple design, simple implementation.

- Cut taglines, helper text and secondary labels. If a screen needs them to make sense, fix the layout.
- Every decision should improve user experience (UX), developer experience (DX) and agent experience (AX) at once, without breaking anything.

## Map

| Path | What lives there |
| --- | --- |
| `alchemy.run.ts` | The app stack (`secret-santa`): Worker, Cloudflare Email binding, and on prod the custom domain, Email Sending on the apex (which publishes its own DMARC) and bot settings |
| `stacks/config.ts` | Account, repository, domain, zone, mail senders |
| `stacks/stage.ts` | Stage names (`prod`, `pr-<n>`, `dev-<worktree>`), origins, dev ports, the prod-outside-CI refusal |
| `stacks/secrets.ts` | Infisical project ids and the stage → project mapping |
| `stacks/github.ts` | CI control plane (stack `secret-santa-ci`, stage `ci`): GitHub environments, `main` ruleset, `preview` label, scoped expiring Cloudflare deploy tokens, Infisical OIDC variables |
| `.github/workflows/` | `ci.yml`: `check` on every PR; `preview` deploys `pr-<n>` when the PR has the `preview` label; `production` deploys `prod` on merge to `main`. `preview-cleanup.yml` destroys `pr-<n>` |
| `src/env.ts` | Typed Worker bindings; server code imports `env` from here |
| `src/lib/seo.ts` | `pageHead()`: every route's `head` (canonical, title budget, share card, noindex); `scripts/ci/seo.ts` audits the rendered pages |
| `src/lib/assignment-mail.ts` | Who gets which email (pure, tested); `src/routes/api/send-emails.ts` renders and sends |

## Commands

```bash
bun run dev       # alchemy dev on stage dev-<worktree>, own port; mail lands in .alchemy/local/email
bun run ci        # lint + typecheck + tests
bun alchemy plan --stage pr-<n>   # read-only diff of a preview
bun scripts/ci/smoke.ts <stage>   # pages 200 + send endpoint refuses tokenless requests
bun scripts/ci/seo.ts <stage>     # rendered-HTML SEO audit (or --url http://localhost:<port> for dev)
ALCHEMY_PROFILE=admin bunx alchemy plan stacks/github.ts --stage ci   # control plane diff
```

## Never

- Never touch infrastructure outside Alchemy: no dashboard, `wrangler`, Cloudflare MCP write tools, or raw API writes. Every resource and setting lives in `alchemy.run.ts` or `stacks/`.
- Never add `@cloudflare/vite-plugin` or a wrangler config: `Cloudflare.Website.Vite` injects it.
- Never read `process.env` in app code (use `env` from `src/env.ts`) or for secrets in stacks (use `Config` from Infisical).
- Never create `.env` files or print secrets. Secrets live in Infisical: `secret-santa-dev` (agents) and `secret-santa-prod` (CI only).
- Never export `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` locally: use `alchemy profile` (`ALCHEMY_PROFILE=admin` for the operator).
- Never deploy `prod` from a shell; it deploys from CI on merge to `main`. Never deploy, destroy, or change cloud resources without Jake's explicit go-ahead.
- Never rename the `secret-santa` stack or its stages.

# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `bun run fix`
- **Lint (default)**: `bun run check`
- **Lint + type-aware rules**: `bun run check:types` (uses `oxlint-tsgolint`; fix remaining `typescript/*` findings incrementally)
- **Diagnose setup**: `bun x ultracite doctor`

Oxlint + Oxfmt (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

### Toolchain

- **Presets**: Ultracite `core`, `react`, `tanstack`, `vitest`, TanStack react-doctor JS rules, `@shadcn/lint` (strict on `src/components/ui/**`).
- **JS plugins**: `oxlint-plugin-react-doctor` enabled. `eslint-plugin-github` and `eslint-plugin-sonarjs` are omitted until their `typescript-eslint` dependency supports TypeScript 7.
- **Git hooks**: Husky + lint-staged run `ultracite fix` on staged files.
- **CI**: `.github/workflows/ci.yml` runs `check`, `typecheck`, `test`, and `build`.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Oxlint + Oxfmt Can't Help

Oxlint + Oxfmt's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Oxlint + Oxfmt can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Oxlint + Oxfmt. Run `bun x ultracite fix` before committing to ensure compliance.
