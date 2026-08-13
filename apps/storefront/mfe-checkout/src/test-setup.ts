import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'node:util';

// jsdom doesn't define these globally, but react-router's ESM build
// references them at module-load time.
Object.assign(globalThis, { TextEncoder, TextDecoder });
