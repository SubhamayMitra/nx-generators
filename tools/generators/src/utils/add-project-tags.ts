import {
  readProjectConfiguration,
  updateProjectConfiguration,
  type Tree,
} from '@nx/devkit';

/**
 * Idempotently merges the given tags into a project's `tags` array so
 * `@nx/enforce-module-boundaries` (the MFE/shell/service import-boundary
 * rules in eslint.config.mjs) can classify it. Called at generation time
 * rather than left for hand-editing so the boundary rules stay correct for
 * every project a generator produces, not just the hand-wired examples.
 */
export function addProjectTags(
  tree: Tree,
  projectName: string,
  tags: string[],
): void {
  const config = readProjectConfiguration(tree, projectName);
  const existing = new Set(config.tags ?? []);
  for (const tag of tags) {
    existing.add(tag);
  }
  updateProjectConfiguration(tree, projectName, {
    ...config,
    tags: [...existing],
  });
}
