import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { handleOutdatedCli, updateCommandText } from '../src/core/updater.js';
import { CLI_VERSION } from '../src/version.js';

describe('CLI updater', () => {
  it('requires manual update even in interactive mode', async () => {
    let confirmed = false;
    let commandRun = false;

    await assert.rejects(
      handleOutdatedCli({
        packageName: 'engagelab-email-cli',
        currentVersion: CLI_VERSION,
        latestVersion: '1.3.0',
        jsonMode: false,
        stdin: { isTTY: true },
        stderr: { isTTY: true },
        confirm: async () => {
          confirmed = true;
        },
        runCommand: async () => {
          commandRun = true;
          return 0;
        },
        env: {},
      }),
      (error) => {
        assert.equal(error.code, 'update_required');
        assert.match(error.message, /A newer version of engagelab-email-cli is required/);
        assert.match(error.message, /Please run: npm install -g engagelab-email-cli@latest/);
        return true;
      },
    );

    assert.equal(confirmed, false);
    assert.equal(commandRun, false);
  });

  it('returns the same manual update instruction for CI sessions', async () => {
    await assert.rejects(
      handleOutdatedCli({
        packageName: 'engagelab-email-cli',
        currentVersion: CLI_VERSION,
        latestVersion: '1.3.0',
        jsonMode: false,
        stdin: { isTTY: true },
        stderr: { isTTY: true },
        env: { CI: 'true' },
      }),
      (error) => {
        assert.equal(error.code, 'update_required');
        assert.match(error.message, /Please run: npm install -g engagelab-email-cli@latest/);
        assert.doesNotMatch(error.message, /This session is not interactive/);
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
        stderr: { isTTY: false },
        env: {},
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
