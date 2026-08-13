import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// __dirname is undefined when @rspack/cli loads this config as ESM (it
// does, because the file uses `import` statements). Derive it from the
// module URL so the config works regardless of how the loader interprets it.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 8100;
const NAME = 'storefront_shell';

// Read mode from the rspack CLI arg (`--mode=development|production`) so the
// config works the same on Windows + POSIX without depending on a shell
// `NODE_ENV=...` prefix.
export default defineConfig((_env, argv) => {
  const isDev = argv.mode !== 'production';
  return {
    context: __dirname,
    entry: { main: './src/main.tsx' },
    output: {
      path: path.resolve(__dirname, 'dist'),
      publicPath: 'auto',
      uniqueName: NAME,
      clean: true,
    },
    devServer: { port: PORT, historyApiFallback: true, hot: true },
    resolve: {
      extensions: ['...', '.ts', '.tsx', '.jsx'],
      extensionAlias: { '.js': ['.js', '.ts', '.tsx'] },
    },
    module: {
      rules: [
        {
          test: /\.module\.scss$/,
          type: 'css/module',
          parser: { namedExports: false },
          use: ['sass-loader'],
        },
        {
          test: /\.scss$/,
          exclude: /\.module\.scss$/,
          type: 'css',
          use: ['sass-loader'],
        },
        {
          test: /\.(j|t)sx?$/,
          exclude: [/node_modules/],
          use: {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: { syntax: 'typescript', tsx: true },
                transform: {
                  react: { runtime: 'automatic', development: isDev },
                },
              },
              env: {
                targets:
                  'Chrome >= 87, Firefox >= 78, Edge >= 88, Safari >= 14',
              },
            },
          },
        },
      ],
    },
    plugins: [
      new rspack.DefinePlugin({ 'process.env': '{}' }),
      new rspack.HtmlRspackPlugin({ template: './index.html' }),
      new ModuleFederationPlugin({
        name: NAME,
        // No build-time `remotes:` block - registered at runtime in
        // src/mf.ts at module load time.
        shared: [
          'react',
          'react-dom',
          'react-router',
          '@apollo/client',
          '@nx-generators/shared-ui',
        ],
      }),
    ],
  };
});
