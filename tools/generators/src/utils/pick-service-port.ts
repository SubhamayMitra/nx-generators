import type { Tree } from '@nx/devkit';
import { findFiles } from './find-files';

/**
 * Scans every existing GraphQL service's src/server.ts and every existing
 * gateway's src/main.ts for its `process.env['PORT'] ?? <port>` default so a
 * newly generated service/gateway never collides with one already in the
 * workspace, regardless of which product folder it lives under (gateways
 * are per-product now, so there's no longer a single fixed port to reserve
 * for "the" gateway).
 */
export function pickBackendPort(tree: Tree, startPort: number): number {
  const usedPorts = new Set<number>();
  const candidates = [
    ...findFiles(tree, 'apps', 'server.ts'),
    ...findFiles(tree, 'apps', 'main.ts'),
  ];
  for (const filePath of candidates) {
    const content = tree.read(filePath, 'utf-8');
    const port = content
      ? /process\.env\['PORT'\] \?\? (\d+)/.exec(content)?.[1]
      : undefined;
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
