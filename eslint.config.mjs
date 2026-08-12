import nx from '@nx/eslint-plugin';
import prettierConfig from 'eslint-config-prettier';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/storybook-static',
      '**/src/generated/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            // MFEs never import each other directly — cross-MFE composition
            // only happens at runtime via Module Federation (loadRemote()),
            // never via a static import. Shared code lives in libs/shared-*.
            {
              sourceTag: 'type:mfe',
              onlyDependOnLibsWithTags: ['type:shared-lib'],
            },
            // Shells load MFEs at runtime the same way; they never
            // statically import a shell, MFE, or service either.
            {
              sourceTag: 'type:shell',
              onlyDependOnLibsWithTags: ['type:shared-lib'],
            },
            // GraphQL services talk to each other only via Apollo
            // Federation over the network, never via code import — and
            // never import frontend (shell/MFE) code.
            {
              sourceTag: 'type:service',
              onlyDependOnLibsWithTags: ['type:shared-lib'],
            },
            // Shared libs may depend on other shared libs (e.g.
            // shared-types re-exporting shared-validation's inferred
            // types) but never reach back into an app.
            {
              sourceTag: 'type:shared-lib',
              onlyDependOnLibsWithTags: ['type:shared-lib'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
  {
    files: ['**/*.json'],
    // Override or add rules here
    rules: {},
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  // Must stay last: turns off every ESLint rule that conflicts with
  // Prettier's own formatting, so ESLint and Prettier never fight over the
  // same line (formatting is Prettier's job, not lint's).
  prettierConfig,
];
