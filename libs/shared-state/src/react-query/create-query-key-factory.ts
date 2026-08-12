/**
 * Namespaces every query key an MFE produces under its own name, so two
 * MFEs that happen to share a QueryClient (e.g. under a test harness, or a
 * future shell-level cache) never collide on the same cache entry —
 * `createQueryKeyFactory('search').detail('coats')` and
 * `createQueryKeyFactory('checkout').detail('coats')` are distinct keys
 * even though the trailing part is identical.
 */
export function createQueryKeyFactory<Namespace extends string>(
  namespace: Namespace,
) {
  return {
    all: [namespace] as const,
    lists: () => [namespace, 'list'] as const,
    list: (...params: unknown[]) => [namespace, 'list', ...params] as const,
    details: () => [namespace, 'detail'] as const,
    detail: (id: string | number) => [namespace, 'detail', id] as const,
  };
}
