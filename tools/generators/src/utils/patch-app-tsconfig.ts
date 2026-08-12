import { updateJson, type Tree } from '@nx/devkit';

/**
 * `@nx/react:consumer`/`:provider` write a fully standalone tsconfig.json
 * (no `extends`), so a freshly generated shell/MFE doesn't inherit this
 * workspace's strict base config (`strict`, `noUncheckedIndexedAccess`,
 * `customConditions`) or the CSS-module/plain-`.scss`/image ambient type
 * declarations every other project in this workspace gets. Patches both in.
 */
export function patchAppTsconfig(tree: Tree, tsconfigPath: string): void {
  if (!tree.exists(tsconfigPath)) {
    return;
  }
  updateJson(tree, tsconfigPath, (json) => {
    if (!json.extends) {
      json.extends = '../../tsconfig.base.json';
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
