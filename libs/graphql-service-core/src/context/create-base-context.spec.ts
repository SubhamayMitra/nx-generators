import { createBaseContext } from './create-base-context.js';

describe('createBaseContext', () => {
  it('generates a requestId when none is provided', () => {
    const context = createBaseContext();
    expect(context.requestId).toEqual(expect.any(String));
    expect(context.requestId.length).toBeGreaterThan(0);
  });

  it('reuses a provided requestId instead of generating one', () => {
    const context = createBaseContext({ requestId: 'req-123' });
    expect(context.requestId).toBe('req-123');
  });
});
