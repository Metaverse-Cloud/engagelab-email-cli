#!/usr/bin/env node

import { run } from './index.js';
import { ui } from './output/ui.js';

run().catch((error) => {
  process.stderr.write(`${ui.failure(error instanceof Error ? error.message : String(error))}\n`);
  process.exitCode = 1;
});
