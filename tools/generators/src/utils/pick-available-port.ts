import type { Tree } from '@nx/devkit';
import { findFiles } from './find-files';

/**
 * Scans every existing app's rspack.config.ts for its `const PORT` so a
 * newly generated shell or MFE never collides with one already in the
 * workspace — @nx/react:consumer/:provider always default to the same base
 * port regardless of how many shells/providers already exist and do no
 * collision detection themselves. Recursive (not just apps/*'s immediate
 * children) since shells/MFEs live one level deeper, nested under their
 * product's own folder (apps/<product>/shell, apps/<product>/mfe-<name>).
 */
export function pickAvailablePort(tree: Tree, startPort: number): number {
  const usedPorts = new Set<number>();
  for (const rspackConfigPath of findFiles(tree, 'apps', 'rspack.config.ts')) {
    const content = tree.read(rspackConfigPath, 'utf-8');
    const port = content ? /const PORT = (\d+);/.exec(content)?.[1] : undefined;
    if (port) {
      usedPorts.add(Number(port));
    }
  }
  let candidate = startPort;
  while (usedPorts.has(candidate)) {
    candidate += 1;
  }
  return candidate;
}
