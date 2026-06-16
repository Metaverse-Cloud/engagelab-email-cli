import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const scannedRoots = [
  'src',
  'tests',
  'docs/superpowers',
  'README.md',
  'package.json',
  'agent-email-cli-dev.md',
];

describe('project naming', () => {
  it('does not describe the CLI as a client-library project', async () => {
    const files = await listScannedFiles();
    const forbiddenPattern = new RegExp(`\\b${['S', 'D', 'K'].join('')}\\b|\\b${['s', 'd', 'k'].join('')}\\b|@my-project/${['s', 'd', 'k'].join('')}`);

    for (const file of files) {
      const source = await readFile(file, 'utf8');
      assert.doesNotMatch(source, forbiddenPattern, `${file} contains client-library naming`);
    }
  });
});

async function listScannedFiles() {
  const nested = await Promise.all(scannedRoots.map(resolveScannedPath));
  return nested.flat();
}

async function resolveScannedPath(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  const entries = await readdir(fullPath, { withFileTypes: true }).catch(() => null);

  if (!entries) {
    return [fullPath];
  }

  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(fullPath, entry.name);
      if (entry.isDirectory()) {
        return listFiles(entryPath);
      }
      return entry.name.endsWith('.js') || entry.name.endsWith('.md') || entry.name.endsWith('.json')
        ? [entryPath]
        : [];
    }),
  );

  return nested.flat();
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return listFiles(entryPath);
      }
      return entry.name.endsWith('.js') || entry.name.endsWith('.md') || entry.name.endsWith('.json')
        ? [entryPath]
        : [];
    }),
  );
  return nested.flat();
}
