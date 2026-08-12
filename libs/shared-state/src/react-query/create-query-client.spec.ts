import { createQueryClient } from './create-query-client.js';
import { createQueryKeyFactory } from './create-query-key-factory.js';

describe('createQueryClient', () => {
  it('applies sane defaults that can be overridden per app', () => {
    const client = createQueryClient();
    expect(client.getDefaultOptions().queries?.staleTime).toBe(30_000);

    const overridden = createQueryClient({ queries: { staleTime: 5_000 } });
    expect(overridden.getDefaultOptions().queries?.staleTime).toBe(5_000);
  });
});

describe('createQueryKeyFactory', () => {
  it('namespaces keys per MFE so two MFEs never collide', () => {
    const search = createQueryKeyFactory('search');
    const checkout = createQueryKeyFactory('checkout');

    expect(search.detail('coats')).toEqual(['search', 'detail', 'coats']);
    expect(checkout.detail('coats')).toEqual(['checkout', 'detail', 'coats']);
    expect(search.detail('coats')).not.toEqual(checkout.detail('coats'));
  });
});
