import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { handleOutdatedCli, updateCommandText } from '../src/core/updater.js';
import { CLI_VERSION } from '../src/version.js';

class MemoryStream extends Writable {
  constructor() {
    super();
    this.output = '';
    this.isTTY = true;
  }

  _write(chunk, _encoding, callback) {
    this.output += chunk.toString('utf8');
    callback();
  }
}

describe('CLI updater', () => {
  it('prompts in interactive mode and runs the update after confirmation', async () => {
    const stderr = new MemoryStream();
    let confirmed = false;
    let commandRun;

    await assert.rejects(
      handleOutdatedCli({
        packageName: 'engagelab-email-cli',
        currentVersion: CLI_VERSION,
        latestVersion: '1.3.0',
        jsonMode: false,
        stdin: { isTTY: true },
        stderr,
        confirm: async () => {
          confirmed = true;
        },
        runCommand: async (command) => {
          commandRun = command;
          return 0;
        },
      }),
      (error) => {
        assert.equal(error.code, 'update_completed');
        assert.equal(error.exitCode, 0);
        assert.equal(error.data?.silent, true);
        return true;
      },
    );

    assert.equal(confirmed, true);
    assert.deepEqual(commandRun, {
      command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
      args: ['install', '-g', 'engagelab-email-cli@latest'],
      display: 'npm install -g engagelab-email-cli@latest',
    });
    assert.match(stripAnsi(stderr.output), new RegExp(`A newer version is available: ${escapeRegExp(CLI_VERSION)} -> 1\.3\.0`));
    assert.match(stripAnsi(stderr.output), /Press Enter to update automatically, or press Ctrl\+C to cancel/);
    assert.match(stripAnsi(stderr.output), /OK Updated engagelab-email-cli to 1\.3\.0/);
    assert.match(stripAnsi(stderr.output), /Please run your command again/);
  });


  it('explains the manual command when automatic update fails', async () => {
    const stderr = new MemoryStream();

    await assert.rejects(
      handleOutdatedCli({
        packageName: 'engagelab-email-cli',
        currentVersion: CLI_VERSION,
        latestVersion: '1.3.0',
        jsonMode: false,
        stdin: { isTTY: true },
        stderr,
        confirm: async () => {},
        runCommand: async () => 1,
      }),
      (error) => {
        assert.equal(error.code, 'update_failed');
        assert.match(error.message, /Failed to update engagelab-email-cli automatically/);
        assert.match(error.message, /Please run manually: npm install -g engagelab-email-cli@latest/);
        assert.equal(error.data.updateExitCode, 1);
        return true;
      },
    );
  });

  it('throws structured update_required details in json mode', async () => {
    await assert.rejects(
      handleOutdatedCli({
        packageName: 'engagelab-email-cli',
        currentVersion: CLI_VERSION,
        latestVersion: '1.3.0',
        jsonMode: true,
        stdin: { isTTY: false },
        stderr: new MemoryStream(),
      }),
      (error) => {
        assert.equal(error.code, 'update_required');
        assert.equal(error.data.currentVersion, CLI_VERSION);
        assert.equal(error.data.latestVersion, '1.3.0');
        assert.equal(error.data.updateCommand, updateCommandText('engagelab-email-cli'));
        return true;
      },
    );
  });
});

function stripAnsi(value) {
  return value.replace(/\u001B\[[0-9;]*m/g, '');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
