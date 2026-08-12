import type { Tree } from '@nx/devkit';

/**
 * Scans every existing app's rspack.config.ts for its `const PORT` so a
 * newly generated shell or MFE never collides with one already in the
 * workspace — @nx/react:consumer/:provider always default to the same base
 * port regardless of how many shells/providers already exist and do no
 * collision detection themselves.
 */
export function pickAvailablePort(tree: Tree, startPort: number): number {
  const usedPorts = new Set<number>();
  if (tree.exists('apps')) {
    for (const appDir of tree.children('apps')) {
      const content = tree.read(`apps/${appDir}/rspack.config.ts`, 'utf-8');
      const port = content
        ? /const PORT = (\d+);/.exec(content)?.[1]
        : undefined;
      if (port) {
        usedPorts.add(Number(port));
      }
    }
  }
  let candidate = startPort;
  while (usedPorts.has(candidate)) {
    candidate += 1;
  }
  return candidate;
}
