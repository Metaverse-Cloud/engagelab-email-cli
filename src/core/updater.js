import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { CliError } from './errors.js';
import { ui } from '../output/ui.js';

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
  stdin = process.stdin,
  stderr = process.stderr,
  confirm = waitForEnter,
  runCommand = runUpdateCommand,
}) {
  const command = updateCommand(packageName);
  const data = {
    currentVersion,
    latestVersion,
    updateCommand: command.display,
  };

  if (jsonMode) {
    throw new CliError(updateRequiredMessage(packageName, currentVersion, latestVersion, command.display), {
      code: 'update_required',
      exitCode: 1,
      data,
    });
  }

  if (!isInteractive(stdin, stderr)) {
    throw new CliError(manualUpdateMessage(packageName, currentVersion, latestVersion, command.display), {
      code: 'update_required',
      exitCode: 1,
      data,
    });
  }

  writeInteractivePrompt(stderr, packageName, currentVersion, latestVersion, command.display);
  await confirm(stdin);

  stderr.write(`${ui.start(`Updating ${packageName}...`)}\n`);
  let exitCode;
  try {
    exitCode = await runCommand(command);
  } catch (error) {
    throw new CliError(updateFailedMessage(packageName, command.display), {
      code: 'update_failed',
      exitCode: 1,
      data: { ...data, updateError: error instanceof Error ? error.message : String(error) },
      cause: error,
    });
  }

  if (exitCode !== 0) {
    throw new CliError(updateFailedMessage(packageName, command.display), {
      code: 'update_failed',
      exitCode: 1,
      data: { ...data, updateExitCode: exitCode },
    });
  }

  stderr.write(`${ui.success(`Updated ${packageName} to ${latestVersion}`)}\n`);
  stderr.write(`${ui.muted('Please run your command again.')}\n`);

  throw new CliError('', {
    code: 'update_completed',
    exitCode: 0,
    data: { ...data, silent: true },
  });
}

function isInteractive(stdin, stderr) {
  return Boolean(stdin?.isTTY && stderr?.isTTY && !process.env.CI);
}

function writeInteractivePrompt(stderr, packageName, currentVersion, latestVersion, command) {
  stderr.write(`${ui.failure(`A newer version is available: ${currentVersion} -> ${latestVersion}`)}\n\n`);
  stderr.write('This command requires the latest CLI version before continuing.\n');
  stderr.write('Press Enter to update automatically, or press Ctrl+C to cancel.\n\n');
  stderr.write(`${ui.heading('Command:')}\n${ui.command(command)}\n`);
}

function updateRequiredMessage(packageName, currentVersion, latestVersion, command) {
  return [
    `A newer version of ${packageName} is required: ${currentVersion} -> ${latestVersion}`,
    `Please run: ${command}`,
  ].join('\n');
}

function manualUpdateMessage(packageName, currentVersion, latestVersion, command) {
  return [
    `A newer version of ${packageName} is required: ${currentVersion} -> ${latestVersion}`,
    'This session is not interactive, so automatic update cannot continue.',
    `Please run: ${command}`,
  ].join('\n');
}

function updateFailedMessage(packageName, command) {
  return [
    `Failed to update ${packageName} automatically.`,
    `Please run manually: ${command}`,
  ].join('\n');
}

async function waitForEnter(stdin) {
  const readline = createInterface({ input: stdin, output: undefined, terminal: false });
  try {
    await readline.question('');
  } finally {
    readline.close();
  }
}

function runUpdateCommand(command) {
  return new Promise((resolve, reject) => {
    const child = spawn(command.command, command.args, { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
}
