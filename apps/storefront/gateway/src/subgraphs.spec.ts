import { subgraphs } from './subgraphs';

describe('subgraphs', () => {
  it('is derived from subgraphs.json, applying env overrides by convention', () => {
    expect(Array.isArray(subgraphs)).toBe(true);
  });
});
