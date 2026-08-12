import * as path from 'node:path';

/**
 * `@nx/react`'s `consumer`/`provider` generators (the current,
 * non-deprecated dynamic-federation generators this workspace composes)
 * aren't re-exported from the package's public entry point — only
 * registered in its `generators.json`, and its `package.json` "exports"
 * map blocks deep `require('@nx/react/dist/...')` imports outright. This
 * loads them the same way Nx's own CLI does: resolve the package root,
 * read `generators.json` for the factory's file path, then `require()`
 * that absolute path directly (a plain filesystem require bypasses the
 * "exports" map, unlike a package-subpath specifier).
 */
export function loadNxGenerator<T = (...args: never[]) => unknown>(
  packageName: string,
  generatorName: string,
): T {
  const pkgJsonPath = require.resolve(`${packageName}/package.json`);
  const pkgRoot = path.dirname(pkgJsonPath);
  const generatorsManifest = require(path.join(pkgRoot, 'generators.json')) as {
    generators: Record<string, { factory: string }>;
  };
  const entry = generatorsManifest.generators[generatorName];
  if (!entry) {
    throw new Error(
      `No generator named "${generatorName}" found in ${packageName}'s generators.json`,
    );
  }
  const mod = require(path.join(pkgRoot, entry.factory)) as Record<
    string,
    unknown
  >;
  return (mod['default'] ?? mod[`${generatorName}Generator`] ?? mod) as T;
}
