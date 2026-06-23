import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

export async function buildCli() {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));

  return build({
    entryPoints: ['src/cli.js'],
    outfile: 'dist/index.cjs',
    bundle: true,
    platform: 'node',
    target: ['node20'],
    format: 'cjs',
    minify: true,
    sourcemap: false,
    legalComments: 'none',
    define: {
      __PACKAGE_VERSION__: JSON.stringify(packageJson.version),
    },
  });
}
