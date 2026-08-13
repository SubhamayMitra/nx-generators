import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readProjectConfiguration } from '@nx/devkit';

import { shellGenerator } from './shell';
import { ShellGeneratorSchema } from './schema';

describe('shell generator', () => {
  let tree: Tree;
  const options: ShellGeneratorSchema = { name: 'test' };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await shellGenerator(tree, options);
    const config = readProjectConfiguration(tree, 'test-shell');
    expect(config).toBeDefined();
  });

  it('tags the project type:shell', async () => {
    await shellGenerator(tree, options);
    const config = readProjectConfiguration(tree, 'test-shell');
    expect(config.tags).toContain('type:shell');
  });

  it('starts with no MFEs registered', async () => {
    await shellGenerator(tree, options);
    const mf = tree.read('apps/test/shell/src/mf.ts', 'utf-8');
    expect(mf).toContain('const PROVIDERS');
    expect(mf).not.toMatch(/alias:\s*'/);
  });

  it('nests the shell under its own product folder', async () => {
    await shellGenerator(tree, options);
    const config = readProjectConfiguration(tree, 'test-shell');
    expect(config.root).toBe('apps/test/shell');
  });
});
