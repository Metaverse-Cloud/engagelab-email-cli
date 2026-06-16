import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

describe('@my-project/cli package', () => {
  it('declares a root bin entry without workspace package coupling', async () => {
    const source = await readFile('package.json', 'utf8');
    const pkg = JSON.parse(source);

    assert.equal(pkg.type, 'module');
    assert.deepEqual(pkg.bin, {
      'my-project': './src/index.js',
    });
    assert.equal(pkg.packageManager, 'pnpm@10.24.0');
    assert.equal(pkg.workspaces, undefined);
  });

  it('does not keep obsolete monorepo package directories', async () => {
    await assert.rejects(() => stat('packages'), {
      code: 'ENOENT',
    });
  });
});
