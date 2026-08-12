import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readProjectConfiguration } from '@nx/devkit';

import { shellGenerator } from '../shell/shell';
import { mfeGenerator } from './mfe';
import { MfeGeneratorSchema } from './schema';

describe('mfe generator', () => {
  let tree: Tree;
  const options: MfeGeneratorSchema = { shellName: 'demo', name: 'test' };

  beforeEach(async () => {
    tree = createTreeWithEmptyWorkspace();
    // mfe requires its target shell to already exist.
    await shellGenerator(tree, { name: 'demo' });
  });

  it('throws when the target shell does not exist', async () => {
    const freshTree = createTreeWithEmptyWorkspace();
    await expect(mfeGenerator(freshTree, options)).rejects.toThrow(
      /No shell named/,
    );
  });

  it('should run successfully', async () => {
    await mfeGenerator(tree, options);
    const config = readProjectConfiguration(tree, 'demo-mfe-test');
    expect(config).toBeDefined();
  });

  it('registers only into its own shell', async () => {
    await mfeGenerator(tree, options);
    const mf = tree.read('apps/demo-shell/src/mf.ts', 'utf-8');
    expect(mf).toContain("alias: 'test'");
  });
});
