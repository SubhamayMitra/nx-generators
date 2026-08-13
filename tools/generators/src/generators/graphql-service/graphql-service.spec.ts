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
    expect(tree.exists('apps/test-gateway/project.json')).toBe(false);
  });

  it('stays flat when no --product is given', async () => {
    await graphqlServiceGenerator(tree, options);
    expect(config('test-service').root).toBe('apps/test-service');
  });

  it('nests under its product folder when --product is given', async () => {
    await graphqlServiceGenerator(tree, { ...options, product: 'storefront' });
    expect(config('test-service').root).toBe('apps/storefront/test-service');
  });

  it('rejects a gateway request from a service with no product', async () => {
    await expect(
      graphqlServiceGenerator(tree, { ...options, gateway: 'new' }),
    ).rejects.toThrow(/requires --product/);
  });

  it('creates a product-scoped gateway named <product>-gateway', async () => {
    await graphqlServiceGenerator(tree, {
      ...options,
      product: 'storefront',
      gateway: 'new',
    });
    expect(config('storefront-gateway').root).toBe('apps/storefront/gateway');
    const subgraphs = tree.read(
      'apps/storefront/gateway/src/subgraphs.json',
      'utf-8',
    );
    expect(subgraphs).toContain('"name": "test"');
  });

  it('registers a second service into the same product gateway, idempotently', async () => {
    await graphqlServiceGenerator(tree, {
      ...options,
      product: 'storefront',
      gateway: 'new',
    });
    await graphqlServiceGenerator(tree, {
      name: 'other',
      datasource: 'rest',
      product: 'storefront',
      gateway: 'existing',
    });
    const subgraphs = JSON.parse(
      tree.read('apps/storefront/gateway/src/subgraphs.json', 'utf-8') ?? '',
    );
    expect(subgraphs.subgraphs.map((s: { name: string }) => s.name)).toEqual([
      'test',
      'other',
    ]);
  });

  it('keeps separate products on separate gateways', async () => {
    await graphqlServiceGenerator(tree, {
      ...options,
      product: 'storefront',
      gateway: 'new',
    });
    await graphqlServiceGenerator(tree, {
      name: 'other',
      datasource: 'rest',
      product: 'checkout-portal',
      gateway: 'new',
    });
    expect(config('storefront-gateway').root).toBe('apps/storefront/gateway');
    expect(config('checkout-portal-gateway').root).toBe(
      'apps/checkout-portal/gateway',
    );
    const storefrontSubgraphs = JSON.parse(
      tree.read('apps/storefront/gateway/src/subgraphs.json', 'utf-8') ?? '',
    );
    expect(
      storefrontSubgraphs.subgraphs.map((s: { name: string }) => s.name),
    ).toEqual(['test']);
  });

  function config(projectName: string) {
    return readProjectConfiguration(tree, projectName);
  }
});
