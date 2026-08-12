# @nx-generators/shared-ui

Atomic-design component library for every shell and MFE in this workspace.
Structured by tier, not by feature:

```
src/
  tokens/       # SCSS design token maps (color, spacing, typography, radii) + the @use entry point
  atoms/        # Button, Input, Text — no composition of other components
  molecules/    # SearchBar — compose atoms
  organisms/    # Header — compose molecules + atoms
  templates/    # AppShellTemplate — page-level layout shells consumed by RootLayout
  hooks/        # shared UI hooks (useMediaQuery, …)
```

## Adding a new component (convention, not generator-enforced)

1. Decide the tier: does it compose nothing but HTML (atom), other atoms
   (molecule), or molecules+atoms (organism)?
2. Create `src/<tier>/<ComponentName>/` with:
   - `<ComponentName>.tsx` — the component
   - `<ComponentName>.module.scss` — CSS Modules styles, referencing tokens
     via `@use '../../tokens' as tokens;` (adjust the relative depth for
     your tier) — never hardcode a color/spacing/font value that already
     has a token
   - `<ComponentName>.stories.tsx` — at least one story per meaningfully
     different state
   - `<ComponentName>.spec.tsx` — one render + interaction test
3. Export it from `src/index.ts`.

Storybook (`nx run @nx-generators/shared-ui:storybook`) picks up any
`*.stories.tsx` under `src/**` automatically — no config changes needed per
component.

## Design tokens

All tokens live in `src/tokens` as SCSS maps (`_colors.scss`,
`_spacing.scss`, `_typography.scss`, `_radii.scss`) with accessor functions
in `_functions.scss` (`color()`, `space()`, `font-size()`, `font-weight()`,
`font-family()`, `radius()`). `src/tokens/index.scss` is the single
`@forward` entry point — components inside this library import it with a
relative path; apps outside this library import it via
`@use '@nx-generators/shared-ui/tokens' as tokens;`. Never redefine a
color/spacing/type/radius value locally — add it to the relevant token map
instead so every consumer stays in sync.

## Running unit tests

Run `nx test @nx-generators/shared-ui` to execute the unit tests via [Jest](https://jestjs.io).

## Running Storybook

Run `nx run @nx-generators/shared-ui:storybook` to serve it locally, or
`nx run @nx-generators/shared-ui:build-storybook` for a static build
suitable for deploying as a living style guide.
