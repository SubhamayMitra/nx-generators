import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';

import { shellGenerator } from '../shell/shell';
import { mfeGenerator } from '../mfe/mfe';
import { featureGenerator } from './feature';
import { FeatureGeneratorSchema } from './schema';

describe('feature generator', () => {
  let tree: Tree;
  const options: FeatureGeneratorSchema = {
    mfeName: 'demo-mfe-search',
    name: 'test',
  };

  beforeEach(async () => {
    tree = createTreeWithEmptyWorkspace();
    // feature requires its target MFE (and that MFE's shell) to already exist.
    await shellGenerator(tree, { name: 'demo' });
    await mfeGenerator(tree, { shellName: 'demo', name: 'search' });
  });

  it('throws when the target MFE does not exist', async () => {
    await expect(
      featureGenerator(tree, { mfeName: 'does-not-exist', name: 'test' }),
    ).rejects.toThrow(/No MFE named/);
  });

  it('adds the feature files without touching bundler or shell routing config', async () => {
    const mfBefore = tree.read('apps/demo/shell/src/mf.ts', 'utf-8');
    const rspackBefore = tree.read(
      'apps/demo/mfe-search/rspack.config.ts',
      'utf-8',
    );

    await featureGenerator(tree, options);

    expect(tree.exists('apps/demo/mfe-search/src/features/test/Test.tsx')).toBe(
      true,
    );
    expect(tree.read('apps/demo/shell/src/mf.ts', 'utf-8')).toBe(mfBefore);
    expect(tree.read('apps/demo/mfe-search/rspack.config.ts', 'utf-8')).toBe(
      rspackBefore,
    );
  });

  it('registers a relative route so the feature works both standalone and embedded under a shell', async () => {
    await featureGenerator(tree, options);
    const routes = tree.read(
      'apps/demo/mfe-search/src/app/routes.tsx',
      'utf-8',
    );
    expect(routes).toContain("path: 'test'");
    expect(routes).not.toContain("path: '/test'");
  });
});
