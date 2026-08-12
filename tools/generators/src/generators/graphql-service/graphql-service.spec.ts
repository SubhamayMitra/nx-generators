import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readProjectConfiguration } from '@nx/devkit';

import { graphqlServiceGenerator } from './graphql-service';
import { GraphqlServiceGeneratorSchema } from './schema';

// @nx/node:application's init step probes for a real, installed prettier via
// a dynamic import() to check formatting config — under Jest's CJS module
// registry that throws ("without --experimental-vm-modules") regardless of
// this generator's own logic. Stubbing it out is the standard workaround for
// testing generators that transitively call @nx/js's initGenerator.
jest.mock('prettier', () => ({
  format: async (source: string) => source,
  resolveConfig: async () => null,
}));

describe('graphql-service generator', () => {
  let tree: Tree;
  const options: GraphqlServiceGeneratorSchema = {
    name: 'test',
    datasource: 'rest',
  };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await graphqlServiceGenerator(tree, options);
    const config = readProjectConfiguration(tree, 'test-service');
    expect(config).toBeDefined();
  });

  it('does not create a gateway when --gateway is omitted', async () => {
    await graphqlServiceGenerator(tree, options);
    expect(tree.exists('apps/gateway/project.json')).toBe(false);
  });
});
