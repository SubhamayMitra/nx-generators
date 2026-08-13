import {
  joinPathFragments,
  offsetFromRoot,
  readProjectConfiguration,
  updateProjectConfiguration,
  type Tree,
} from '@nx/devkit';

/**
 * `@nx/react:consumer`/`:provider`/`:host`/`:remote` don't offer a
 * `unitTestRunner` option at all, so a freshly generated shell/MFE has no
 * Jest setup whatsoever. Wires the same babel-jest + jsdom + jest-dom
 * pattern `@nx/react:library` uses (proven working for `shared-ui` in this
 * workspace) so `nx test <project>` works and spec files type-check.
 */
export function writeAppJestConfig(
  tree: Tree,
  projectRoot: string,
  projectName: string,
): void {
  // Computed from projectRoot (via offsetFromRoot) rather than hardcoded,
  // since a shell/MFE nested one level under its product folder
  // (apps/<product>/shell) needs one more `../` than a top-level app would.
  const offset = offsetFromRoot(projectRoot);
  tree.write(
    joinPathFragments(projectRoot, 'jest.config.cts'),
    `module.exports = {
  displayName: '${projectName}',
  preset: '${offset}jest.preset.js',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '${offset}coverage/apps/${projectName}',
};
`,
  );

  tree.write(
    joinPathFragments(projectRoot, 'src/test-setup.ts'),
    `import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'node:util';

// jsdom doesn't define these globally, but react-router's ESM build
// references them at module-load time.
Object.assign(globalThis, { TextEncoder, TextDecoder });
`,
  );

  const config = readProjectConfiguration(tree, projectName);
  updateProjectConfiguration(tree, projectName, {
    ...config,
    targets: {
      ...config.targets,
      test: {
        executor: '@nx/jest:jest',
        outputs: [`{workspaceRoot}/coverage/apps/${projectName}`],
        options: {
          jestConfig: `${projectRoot}/jest.config.cts`,
        },
      },
    },
  });
}
