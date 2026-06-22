import { rm } from 'node:fs/promises';
import { buildCli } from './build-cli.js';

await rm('dist', { recursive: true, force: true });
await buildCli();
