import type { Tree } from '@nx/devkit';

/** Recursively finds every file named `fileName` under `dir` — used to scan for e.g. every rspack.config.ts regardless of how deep apps/ is nested. */
export function findFiles(tree: Tree, dir: string, fileName: string): string[] {
  if (!tree.exists(dir)) {
    return [];
  }
  const results: string[] = [];
  for (const child of tree.children(dir)) {
    const childPath = `${dir}/${child}`;
    if (tree.isFile(childPath)) {
      if (child === fileName) {
        results.push(childPath);
      }
      continue;
    }
    results.push(...findFiles(tree, childPath, fileName));
  }
  return results;
}
