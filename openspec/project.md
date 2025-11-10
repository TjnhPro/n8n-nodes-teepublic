# Project Context

## Purpose
Create and maintain an n8n community node package that connects workflows to TeePublic’s seller platform. The goal is to expose TeePublic product, order, and payout operations as first-class n8n nodes so store owners can automate catalog sync, fulfillment notifications, and reporting without custom scripting.

## Tech Stack
- TypeScript (strict mode) compiled to CommonJS for n8n compatibility
- Node.js 22+ runtime with the `@n8n/node-cli` toolchain for build/dev/lint/release
- ESLint 9 via `@n8n/node-cli/eslint` config plus Prettier 3 for formatting
- release-it for tagging/publishing and npm for distribution
- Jest is not included; manual + workflow-level verification happens inside the local n8n instance started by `n8n-node dev`

## Project Conventions

### Code Style
- Prettier enforces tabs (width 2), `printWidth` 100, semicolons, single quotes, trailing commas, and LF line endings via `.prettierrc.js`.
- Stick to descriptive PascalCase node classes, camelCase function/variable names, and kebab-case folder names inside `nodes/`.
- Rely on the ESLint rules that ship with `@n8n/node-cli` to catch API misuse and TypeScript pitfalls; fix issues before committing by running `npm run lint` (or `lint:fix` when safe).
- Favor the declarative HTTP request builder (as in `nodes/GithubIssues`) for external REST APIs, keeping imperative `execute` logic minimal.

### Architecture Patterns
- Each integration lives under `nodes/<ResourceName>/` with a matching `<ResourceName>.node.ts` entry and optional shared description files; credentials belong in `credentials/`.
- Node metadata is registered through `package.json > n8n.nodes` and `n8n.credentials`, and the build output lands in `dist/` for publishing.
- Use the `n8n-node` CLI to scaffold operations, bundle TypeScript, and launch a local n8n instance (`npm run dev`) that hot-reloads nodes for rapid iteration.
- Prefer composable descriptions and the `httpRequest` declarative helpers for TeePublic endpoints so that new endpoints can be added by extending JSON definition blocks instead of bespoke code.

### Testing Strategy
- Primary feedback loop is running `npm run dev` to exercise nodes inside a local n8n UI against TeePublic’s sandbox credentials.
- Static analysis happens via `npm run lint` and `npm run lint:fix`.
- `npm run build` (or `build:watch`) ensures TypeScript emits clean artifacts and catches type regressions before release.
- Before publishing, smoke-test the packaged `dist/` output inside a clean n8n instance to confirm credentials, pagination, and error handling work with real TeePublic API responses.

### Git Workflow
- Keep `main` releasable; create short-lived feature branches named `feat/<scope>`, `fix/<scope>`, or `chore/<scope>`.
- Write conventional-style commits (e.g., `feat: add product publish endpoint`) so release-it can generate changelogs automatically.
- Open PRs for every change, link them to the related OpenSpec change ID, and require passing lint/build checks before merging.

## Domain Context
- TeePublic is a print-on-demand marketplace; creators manage listings, variants, and fulfillment data via authenticated REST APIs.
- Key workflows we target: syncing catalog data from external sources, mirroring order statuses back to fulfillment partners, and exporting payout/royalty reports.
- Authentication typically relies on API keys or OAuth2 client credentials; nodes should expose both when TeePublic supports them and store secrets via n8n credential types.

## Important Constraints
- Keep runtime dependencies to zero (or as close as possible) to satisfy n8n Cloud verification requirements—lean on native Node APIs and the n8n helper libraries.
- Maintain MIT licensing and compatible third-party licenses.
- All code must compile with the strict TypeScript settings in `tsconfig.json`; do not disable strictness per file.
- Assume TeePublic rate limits; every node operation should support pagination, date filters, and retry-friendly error handling without overwhelming the API.
- Node packages must run in self-hosted and n8n Cloud environments, so avoid OS-specific paths or binaries.

## External Dependencies
- TeePublic Seller/Partner APIs (REST endpoints for catalog, orders, payouts); requires API keys or OAuth2 tokens and adheres to TeePublic’s rate limits.
- n8n runtime (`n8n-workflow` peer dependency) which loads compiled nodes.
- `@n8n/node-cli` for building, linting, releasing, and running local n8n instances.
- release-it (npm) for release automation and tagging when publishing to the npm registry.
