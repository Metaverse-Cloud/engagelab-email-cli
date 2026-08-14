import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

export async function buildCli() {
  const [packageSource, logoIcon, successIcon, failureIcon] = await Promise.all([
    readFile('package.json', 'utf8'),
    readFile('src/core/assets/logo.svg', 'utf8'),
    readFile('src/core/assets/successful.svg', 'utf8'),
    readFile('src/core/assets/fail.svg', 'utf8'),
  ]);
  const packageJson = JSON.parse(packageSource);

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
      __LOGO_ICON__: JSON.stringify(logoIcon),
      __SUCCESS_ICON__: JSON.stringify(successIcon),
      __FAILURE_ICON__: JSON.stringify(failureIcon),
    },
  });
}
