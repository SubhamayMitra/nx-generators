import {
  joinPathFragments,
  offsetFromRoot,
  updateJson,
  type Tree,
} from '@nx/devkit';

/**
 * `@nx/react:consumer`/`:provider` write a fully standalone tsconfig.json
 * (no `extends`), so a freshly generated shell/MFE doesn't inherit this
 * workspace's strict base config (`strict`, `noUncheckedIndexedAccess`,
 * `customConditions`) or the CSS-module/plain-`.scss`/image ambient type
 * declarations every other project in this workspace gets. Patches both in.
 * Takes `projectRoot` (not the tsconfig's own path) so the `../../[...]`
 * offset to the workspace root — via `offsetFromRoot` — is correct
 * regardless of how deeply this project is nested (e.g. a shell/MFE nested
 * one level under its product folder needs one more `../` than a top-level
 * app would).
 */
export function patchAppTsconfig(tree: Tree, projectRoot: string): void {
  const tsconfigPath = joinPathFragments(projectRoot, 'tsconfig.json');
  if (!tree.exists(tsconfigPath)) {
    return;
  }
  updateJson(tree, tsconfigPath, (json) => {
    if (!json.extends) {
      json.extends = `${offsetFromRoot(projectRoot)}tsconfig.base.json`;
    }
    const existingTypes: string[] = json.compilerOptions?.types ?? [];
    const requiredTypes = [
      'node',
      'jest',
      '@testing-library/jest-dom',
      '@nx/react/typings/cssmodule.d.ts',
      '@nx/react/typings/image.d.ts',
    ];
    json.compilerOptions = {
      ...json.compilerOptions,
      types: Array.from(new Set([...existingTypes, ...requiredTypes])),
    };
    return json;
  });
}
