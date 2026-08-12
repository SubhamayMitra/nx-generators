import type { Tree } from '@nx/devkit';

/**
 * Applied to every rspack-bundled shell/MFE's generated rspack.config.ts:
 *
 * 1. `resolve.extensionAlias` — this workspace's libs use nodenext-style
 *    `.js`-suffixed relative imports (correct for `tsc`/Jest, which map
 *    `.js` back to the sibling `.ts` source). rspack doesn't do that
 *    mapping by default, so without this alias any app importing a
 *    bundler=none lib (resolved via source, e.g. `shared-ui`) fails to
 *    build with "Module not found".
 * 2. SCSS module rules — rspack has no built-in SCSS handling; without
 *    these, `*.module.scss` and plain `*.scss` imports fail to parse.
 * 3. The additional MF shared singletons this workspace requires beyond
 *    Nx's default `['react', 'react-dom']`.
 * 4. `process.env` stub — the browser has no `process` global; without
 *    this, any `process.env.X` read (e.g. this workspace's
 *    `services/apollo-client.ts` templates) crashes at runtime with
 *    "process is not defined". Stubbing it to `{}` makes reads resolve
 *    to `undefined` (falling through to `??` defaults) instead of throwing.
 */
export function patchRspackConfigForWorkspace(
  tree: Tree,
  rspackConfigPath: string,
  additionalShared: string[],
): void {
  const content = tree.read(rspackConfigPath, 'utf-8');
  if (content === null) {
    return;
  }

  let updated = content.replace(
    "resolve: { extensions: ['...', '.ts', '.tsx', '.jsx'] },",
    `resolve: {\n      extensions: ['...', '.ts', '.tsx', '.jsx'],\n      extensionAlias: { '.js': ['.js', '.ts', '.tsx'] },\n    },`,
  );

  updated = updated.replace(
    /rules: \[\n/,
    // namedExports: false — this workspace's components do
    // `import styles from './x.module.scss'` (a default-export object of
    // class names), not rspack's newer named-export-per-class default.
    `rules: [\n        {\n          test: /\\.module\\.scss$/,\n          type: 'css/module',\n          parser: { namedExports: false },\n          use: ['sass-loader'],\n        },\n        {\n          test: /\\.scss$/,\n          exclude: /\\.module\\.scss$/,\n          type: 'css',\n          use: ['sass-loader'],\n        },\n`,
  );

  const sharedList = ['react', 'react-dom', ...additionalShared]
    .map((pkg) => `'${pkg}'`)
    .join(', ');
  updated = updated.replace(
    "shared: ['react', 'react-dom']",
    `shared: [${sharedList}]`,
  );

  updated = updated.replace(
    /plugins: \[\n/,
    `plugins: [\n      new rspack.DefinePlugin({ 'process.env': '{}' }),\n`,
  );

  tree.write(rspackConfigPath, updated);
}
