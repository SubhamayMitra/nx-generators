const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  // Applies to every project via `preset: '../../jest.preset.js'` — one
  // place to enforce the coverage bar workspace-wide rather than repeating
  // it in each generated jest.config.cts. Only enforced when coverage is
  // actually collected (`nx test <project> --coverage`), so a plain
  // `nx test`/`nx affected -t test` stays unaffected; wire the `--coverage`
  // flag into CI to make this a real gate.
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
