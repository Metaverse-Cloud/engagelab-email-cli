#!/usr/bin/env node

import { run } from './index.js';
import { formatCliErrorMessage } from './core/errors.js';
import { ui } from './output/ui.js';

run().catch((error) => {
  process.stderr.write(`${ui.failure(formatCliErrorMessage(error))}\n`);
  process.exitCode = error?.exitCode ?? 5;
});