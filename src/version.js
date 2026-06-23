import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/* global __PACKAGE_VERSION__ */
const bundledVersion = typeof __PACKAGE_VERSION__ === 'string' ? __PACKAGE_VERSION__ : undefined;

export const CLI_VERSION = bundledVersion ?? readPackageVersion();

function readPackageVersion() {
  try {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
    return packageJson.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}
