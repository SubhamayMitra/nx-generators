# nx-generators

A generator-driven Nx monorepo for a React micro-frontend architecture
(Module Federation) backed by GraphQL microservices (standalone or
Apollo-federated). The four custom generators — `shell`, `mfe`, `feature`,
`graphql-service` — are the actual deliverable here. Every shell, MFE,
feature, and GraphQL service in this repo was produced by running one of
them; none were hand-wired.

## Contents

- [Getting started](#getting-started)
- [Layout](#layout)
- [Example apps in this repo](#example-apps-in-this-repo)
- [Scripts](#scripts)
- [Generators](#generators)
  - [`shell` — new host application](#shell--new-host-application)
  - [`mfe` — new MFE scoped to a shell](#mfe--new-mfe-scoped-to-a-shell)
  - [`feature` — new feature inside an MFE](#feature--new-feature-inside-an-mfe)
  - [`graphql-service` — new GraphQL microservice](#graphql-service--new-graphql-microservice)
- [Why `createApolloClient` is a factory, not a shared singleton](#why-createapolloclient-is-a-factory-not-a-shared-singleton)
- [Shared validation: one schema, enforced identically on both sides](#shared-validation-one-schema-enforced-identically-on-both-sides)
- [The shell↔MFE contract (`libs/shared-types`)](#the-shellmfe-contract-libsshared-types)
- [Tooling](#tooling)

## Getting started

Requires Node.js and npm (this workspace uses npm `workspaces`, not Yarn or
pnpm).

```sh
npm install        # installs the root workspace + apps/*, libs/*, tools/*
```

`npm install` also runs `prepare` (`husky`), which wires up the Git hooks
described under [Tooling](#tooling). From there, either scaffold something
new with one of the [generators](#generators) or run an existing app:

```sh
npx nx serve storefront-shell
```

## Layout

```
apps/
  <product>/              # one folder per web product — everything below is generated into it
    shell                 # a host: composes MFEs at runtime, owns the top-level router
    mfe-<name>             # a remote: one feature area, servable standalone or federated in
    <name>-service         # a GraphQL microservice owned by this product (present only if --product was used)
    gateway                # this product's own Apollo Gateway — only exists once one of its services asks for it
  <service>-service      # a standalone GraphQL microservice with no product owner — stays flat
libs/
  shared-ui              # design tokens + atomic-design component library, with Storybook
  shared-types            # cross-cutting types: the shell↔MFE contract, normalized GraphQL error shape
  shared-state            # RTK / Zustand / React Query store factories
  shared-validation       # Zod schemas — the single source of truth for validation, client and server
  graphql-client           # createApolloClient() factory
  graphql-service-core      # Apollo Server error formatting, context, middleware shared by every service
tools/generators/         # the 4 generators (@nx-generators/workspace-plugin)
```

Shells and MFEs are always nested one level under their own product's
folder (`apps/<product>/shell`, `apps/<product>/mfe-<name>`) rather than
sitting flat in `apps/` — with several products each owning several MFEs,
a flat `apps/` would grow one entry per shell/MFE forever. A GraphQL
service nests the same way _only_ when it's generated with `--product`;
gateways are per-product too (`apps/<product>/gateway`) — there is no
single global gateway every product's frontend happens to share. A
service generated without `--product` stays flat and standalone, exactly
like before this workspace had a notion of "product," and can't be
federated (it has no product-scoped gateway to join). See
[`graphql-service`](#graphql-service--new-graphql-microservice) for why
this matters.

This nesting is purely a filesystem grouping, not a renaming: each
project's registered Nx name stays the same fully-qualified, globally-unique
string it would have had flat (`storefront-shell`, `storefront-mfe-search`,
`storefront-gateway`) — `nx serve storefront-shell`, `nx test
storefront-mfe-search`, tags, and `nx graph` all key off that name, never
off the directory.

## Example apps in this repo

Two independent products, proving the generators aren't wired to one
hard-coded example:

- **storefront** (`apps/storefront/`): `storefront-shell` hosting
  `storefront-mfe-search` (with a `saved-searches` feature) and
  `storefront-mfe-checkout`, backed by `search-service` (SQL/Prisma,
  federated into `storefront-gateway`).
- **checkout-portal** (`apps/checkout-portal/`): `checkout-portal-shell`
  hosting `checkout-portal-mfe-profile` — no backing service/gateway yet.

## Scripts

All four generators are registered as `npm run generate:*` scripts, each
forwarding to `nx g <generator>` — pass the generator's own args after a
`--` separator. `nx g` also accepts these generator names directly (no
`npm run` wrapper needed) since this workspace registers exactly one
plugin, `@nx-generators/workspace-plugin` (`tools/generators`), so the
short names below are unambiguous.

| npm script                         | Underlying command     | Scaffolds                                                                                        |
| ---------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run generate:shell`           | `nx g shell`           | a new host app — see [`shell`](#shell--new-host-application)                                     |
| `npm run generate:mfe`             | `nx g mfe`             | a new MFE inside a shell — see [`mfe`](#mfe--new-mfe-scoped-to-a-shell)                          |
| `npm run generate:feature`         | `nx g feature`         | a new feature inside an MFE — see [`feature`](#feature--new-feature-inside-an-mfe)               |
| `npm run generate:graphql-service` | `nx g graphql-service` | a new GraphQL microservice — see [`graphql-service`](#graphql-service--new-graphql-microservice) |
| `npm run prepare`                  | `husky`                | installs the Git hooks described under [Tooling](#tooling) (runs automatically on `npm install`) |

```sh
npm run generate:shell -- checkout-portal --bundler=rspack
npm run generate:mfe -- checkout-portal profile --bundler=rspack --state=zustand
npm run generate:feature -- storefront-mfe-search saved-searches
npm run generate:graphql-service -- search --datasource=sql --product=storefront --gateway=new
```

None of the generators are destructive to run again with a new name —
`shell` and `graphql-service` create a brand-new app each time; `mfe` and
`feature` only ever touch the specific parent (shell or MFE) they're
targeting. `mfe` registration and `graphql-service --gateway=existing`
registration are both idempotent — re-running with the same name is a
no-op rather than an error or a duplicate.

Beyond generation, the rest of the workflow is plain Nx — there are no
further npm script wrappers for these, so use the CLI directly:

```sh
npx nx serve storefront-shell             # run an app
npx nx affected -t lint test build        # lint/test/build whatever changed
npx nx sync                               # after generator-driven project changes, keeps TS project references accurate
```

## Generators

Every generator lives in `tools/generators` (package
`@nx-generators/workspace-plugin`, registered in `generators.json`) and is
implemented as a plain Nx generator function plus a `schema.json`
describing its options — the source of truth for every flag documented
below is `tools/generators/src/generators/<name>/schema.json`.

### `shell` — new host application

```sh
npx nx g shell <name> [--bundler=rspack|webpack]   # default: rspack
```

Scaffolds `apps/<name>/shell` (project name `<name>-shell`): a Module
Federation host with its own `RootLayout`, a react-router v6+ data router
(`createBrowserRouter`), an error boundary, a Suspense boundary, and an
`apolloClient` instance built via `libs/graphql-client`'s factory. It
starts with zero MFEs registered — `nx serve <name>-shell` runs
immediately, showing a "nothing registered yet" placeholder.

### `mfe` — new MFE scoped to a shell

```sh
npx nx g mfe <shellName> <mfeName> [--bundler=rspack|webpack] [--state=rtk|zustand|react-query|none]
```

Scaffolds `apps/<shellName>/mfe-<mfeName>` (project name
`<shellName>-mfe-<mfeName>`, alongside its shell's own `apps/<shellName>/shell`)
and registers it into _that shell only_ — `--bundler` defaults to whatever the target shell uses,
and `--state` (default `none`) wires a real, working example store from
`libs/shared-state`, not empty boilerplate. Every MFE is dual-mode: the
exact same `App` component is what Module Federation exposes to the shell
_and_ what `bootstrap.tsx` renders for `nx serve <mfeName>` standalone — so
behavior can never drift between the two. Registration is idempotent
(re-running is a no-op) and only ever touches the target shell's own
`src/mf.ts`/`src/app/routes.tsx` — never another shell's.

### `feature` — new feature inside an MFE

```sh
npx nx g feature <mfeName> <featureName>
```

Scaffolds `src/features/<featureName>/` (component, hook, service-call
stub, a state slice matching whatever `--state` the MFE was generated
with, and colocated tests) inside the target MFE's project — located via
its Nx project configuration, not by guessing a path from `<mfeName>` — and
adds one **relative** route entry to the MFE's own `src/app/routes.tsx`.
Relative, not absolute — the same
`featureRoutes` array is consumed both by `bootstrap.tsx` (mounted at the
URL root, standalone) and by the shell's `/<mfeName>/*` wildcard route
(mounted at a sub-path, federated); an absolute path would only ever match
the first case. `feature` never touches shell routing or bundler config —
only the target MFE's own files.

### `graphql-service` — new GraphQL microservice

```sh
npx nx g graphql-service <name> --datasource=rest|sql|nosql [--product=<product>] [--gateway=none|new|existing]
```

`--datasource` picks which example datasource layer gets scaffolded under
`src/datasources/` (`rest` wraps an external API, `sql` is Prisma +
SQLite for local dev, `nosql` is a plain MongoDB driver).

`--product` decides who owns this service. Given, the service nests at
`apps/<product>/<name>-service` and may join _that product's own_ gateway.
Omitted, the service stays flat at `apps/<name>-service` as a standalone
service with no product owner — and can never be federated, since there's
no gateway for it to join.

`--gateway` controls federation, and **federation is always opt-in, never
automatic** — running the generator interactively always asks explicitly
whether this service should sit behind a gateway, rather than silently
attaching to (or skipping) one:

- `--gateway=new` — scaffolds `apps/<product>/gateway` (project name
  `<product>-gateway`; Apollo Gateway + `IntrospectAndCompose`) and
  registers this service as its first subgraph. Fails if that product
  already has a gateway (use `existing` instead). Requires `--product`.
- `--gateway=existing` — registers this service into that product's
  gateway, which must already exist (use `new` instead if it doesn't).
  Re-running with the same service name is a no-op, not an error.
  Requires `--product`.
- `--gateway=none` (or a service that's just meant to stand alone) — a
  plain Apollo Server, no `@key`/`@shareable` federation directives, no
  gateway dependency at all. The only valid choice when `--product` is
  omitted.
- Flag omitted (non-interactive runs only — interactive `nx g` always
  prompts) — auto-detects: `existing` if that product's gateway is
  already present, otherwise `none`. Still never silently creates one.

A service belonging to one product is never composed into another
product's gateway — each product's supergraph only ever contains the
services that product itself owns.

Every service gets the same shape regardless of mode:
`graphql/schema/`, `graphql/resolvers/`, `services/`, `datasources/`,
`validation/` (importing straight from `libs/shared-validation`),
`middleware/` + `context/` (built on `libs/graphql-service-core`),
`types/`, `server.ts`.

## Why `createApolloClient` is a factory, not a shared singleton

`libs/graphql-client` exports `createApolloClient(config)` — every shell
and every MFE calls it once, in its own `src/services/apollo-client.ts`,
to build its _own_ client instance. This is deliberate:

- Each shell/MFE talks to a different GraphQL endpoint (its own service,
  or the gateway) — a single shared instance would hard-code one URI for
  the whole workspace.
- MFEs run standalone in dev (`nx serve <mfe>`, no shell present) as well
  as federated inside a shell. A module-level singleton constructed at
  import time can't adapt to which context it's actually running in; a
  factory called explicitly by each app can.
- Module Federation only needs to dedupe the `@apollo/client` _package_
  (declared as a shared singleton in each `rspack.config.ts`/
  `module-federation.config.ts`) so every federated instance runs the same
  `ApolloClient` class and cache implementation — it does not need every
  app to share one _client instance_, and doing so would be actively wrong
  given the point above.

Each factory-built client wires an `authLink`, an `errorLink` (normalizing
Apollo Client v4's `CombinedGraphQLErrors`/`CombinedProtocolErrors` into
the one normalized error shape defined in `libs/shared-types`), and an
optional retry link.

## Shared validation: one schema, enforced identically on both sides

`libs/shared-validation` is the single source of truth for validation,
written in Zod. Both the frontend and the backend import the _same_
exported schema — there is no second, hand-maintained copy:

- **Client side**: `toFormikValidate(schema)` adapts a Zod schema straight
  into a Formik `validate` function.
- **Server side**: a GraphQL resolver's `validation/` layer calls
  `validateInput(schema, args.input)` on the exact same schema before
  touching `services/`.
- **Custom validators**: for checks a schema alone can't express (e.g. an
  async uniqueness check against a datasource), use `.superRefine()` — see
  `libs/shared-validation/src/schemas` for a real async example, not just
  a description of the pattern.

The `saved-searches` feature (`storefront-mfe-search`) end to end proves
this: submitting an empty form produces the exact same field errors
(`"Give this search a name"`, `"Enter a search query first"`) whether
you're looking at the client-side Formik validation or a raw GraphQL
mutation sent straight to `search-service` — same schema, same messages,
either side.

## The shell↔MFE contract (`libs/shared-types`)

`libs/shared-types/src/mfe-contract` defines `MfeProps` (`{ config,
emitter }`), where `config: MfeMountConfig` tells an MFE what path prefix
it was mounted under and lets its API base URL be overridden without a
rebuild, and `emitter: MfeEmitter` lets an MFE ask the shell to do
something it doesn't own — navigate the host router, surface an error on
the host's error boundary/toast — via a small typed event map
(`MfeEventMap`), instead of reaching into the shell's internals directly.

It's defined once so a shell and an MFE built independently (different
generators, different times, possibly different teams) still agree on the
shape without either one importing the other's code. None of the example
MFEs in this repo need it today — they're self-contained — so it isn't
force-injected into every generated `App`. Adopt it on an MFE that
actually needs to talk back to its host: type that MFE's exposed
component's props as `MfeProps` (or a subset), and have the shell's route
element pass a real `config`/`emitter` when it renders that MFE.

## Tooling

- **Linting**: `@nx/enforce-module-boundaries` is configured with real
  tags (`type:shell`, `type:mfe`, `type:service`, `type:shared-lib`,
  applied by the generators themselves) — shells, MFEs, and services may
  only statically depend on `libs/shared-*`, never on each other. Cross-MFE
  and cross-service composition happens at runtime (Module Federation,
  Apollo Federation), never via a static import; the rule also blocks any
  relative/absolute reach-across between projects outright.
- **Formatting**: Prettier, merged into ESLint via `eslint-config-prettier`
  so the two never disagree about a line.
- **Git hooks**: Husky + lint-staged run ESLint+Prettier on staged files
  before every commit; a pre-push hook runs `nx affected -t test`.
- **Coverage**: `jest.preset.js` sets a 70% global coverage threshold,
  enforced whenever a test run actually collects coverage
  (`nx test <project> --coverage`) — wire that flag into CI to make it a
  real gate. Plain `nx test`/`nx affected -t test` stays fast and
  unaffected.
