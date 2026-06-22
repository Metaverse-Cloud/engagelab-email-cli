import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { buildCli } from './build-cli.js';

const packageDir = '.npm-package';

await rm('dist', { recursive: true, force: true });
await buildCli();

await rm(packageDir, { recursive: true, force: true });
await mkdir(`${packageDir}/dist`, { recursive: true });
await cp('dist/index.cjs', `${packageDir}/dist/index.cjs`);

const sourcePackage = JSON.parse(await readFile('package.json', 'utf8'));
const publishPackage = {
  name: sourcePackage.name,
  version: sourcePackage.version,
  description: sourcePackage.description,
  type: sourcePackage.type,
  main: sourcePackage.main,
  exports: sourcePackage.exports,
  bin: sourcePackage.bin,
  keywords: sourcePackage.keywords,
  repository: sourcePackage.repository,
  bugs: sourcePackage.bugs,
  homepage: sourcePackage.homepage,
  license: sourcePackage.license,
  publishConfig: sourcePackage.publishConfig,
  engines: sourcePackage.engines,
};

await writeFile(`${packageDir}/package.json`, `${JSON.stringify(publishPackage, null, 2)}\n`);
