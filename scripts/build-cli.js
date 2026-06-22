import { build } from 'esbuild';

export function buildCli() {
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
  });
}
