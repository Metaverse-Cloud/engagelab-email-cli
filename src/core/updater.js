import { CliError } from './errors.js';

export function updateCommandText(packageName) {
  return `npm install -g ${packageName}@latest`;
}

export function updateCommand(packageName) {
  return {
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['install', '-g', `${packageName}@latest`],
    display: updateCommandText(packageName),
  };
}

export async function handleOutdatedCli({
  packageName,
  currentVersion,
  latestVersion,
  jsonMode,
}) {
  const command = updateCommand(packageName);
  const data = {
    currentVersion,
    latestVersion,
    updateCommand: command.display,
  };

  throw new CliError(updateRequiredMessage(packageName, currentVersion, latestVersion, command.display), {
    code: 'update_required',
    exitCode: 1,
    data,
  });
}

function updateRequiredMessage(packageName, currentVersion, latestVersion, command) {
  return [
    `A newer version of ${packageName} is required: ${currentVersion} -> ${latestVersion}`,
    `Please run: ${command}`,
  ].join('\n');
}
