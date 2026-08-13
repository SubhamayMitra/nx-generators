import type { Tree, GeneratorCallback } from '@nx/devkit';
import { loadNxGenerator } from './load-nx-generator';

interface MoveGeneratorSchema {
  projectName: string;
  destination: string;
  updateImportPath?: boolean;
  skipFormat?: boolean;
}

const moveGenerator = loadNxGenerator<
  (tree: Tree, schema: MoveGeneratorSchema) => Promise<GeneratorCallback>
>('@nx/workspace', 'move');

/**
 * `@nx/react:consumer`/`:provider` infer a project's name from the trailing
 * segment of `--directory` and offer no separate `name` option — so a
 * shell/MFE is always generated first under a directory whose trailing
 * segment already IS its final full name (e.g. `apps/<product>/<product>-shell`),
 * then relocated here to the short folder this workspace actually wants on
 * disk (`apps/<product>/shell`). `@nx/workspace:move` rewrites project.json's
 * root/sourceRoot/target paths for the new location — the registered
 * project name never changes, only where its files live, so nothing else
 * generated before or after this call (federation NAME, package.json name,
 * tags) needs separate patching.
 */
export async function relocateProject(
  tree: Tree,
  projectName: string,
  destination: string,
): Promise<void> {
  await moveGenerator(tree, {
    projectName,
    destination,
    updateImportPath: false,
    skipFormat: true,
  });
}
