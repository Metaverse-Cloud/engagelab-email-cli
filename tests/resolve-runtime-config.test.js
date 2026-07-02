import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRuntimeConfig } from '../src/config/resolve-runtime-config.js';

describe('resolveRuntimeConfig', () => {
  it('infers baseUrl from the secret key region when no explicit baseUrl is provided', async () => {
    const config = await resolveRuntimeConfig({
      cliOptions: {
        secretKey: 'sk_sg_XDfUt2_RXkCWdOMGk6_GecyhRKOZiKvNtGDQbBbgxtM',
      },
      env: {},
      readConfig: async () => ({}),
    });

    assert.equal(config.baseUrl, 'https://email.api.engagelab.cc');
    assert.equal(config.secretKey, 'sk_sg_XDfUt2_RXkCWdOMGk6_GecyhRKOZiKvNtGDQbBbgxtM');
  });

  it('prefers explicit baseUrl over the secret key region mapping', async () => {
    const config = await resolveRuntimeConfig({
      cliOptions: {
        baseUrl: 'https://override.example.com',
        secretKey: 'sk_tr_XDfUt2_RXkCWdOMGk6_GecyhRKOZiKvNtGDQbBbgxtM',
      },
      env: {
        ENGAGELAB_EMAIL_BASE_URL: 'https://env.example.com',
        ENGAGELAB_EMAIL_SECRET_KEY: 'sk_sg_env',
      },
      readConfig: async () => ({
        baseUrl: 'https://config.example.com',
        secretKey: 'sk_sg_config',
      }),
    });

    assert.equal(config.baseUrl, 'https://override.example.com');
    assert.equal(config.secretKey, 'sk_tr_XDfUt2_RXkCWdOMGk6_GecyhRKOZiKvNtGDQbBbgxtM');
  });

  it('falls back through env and file config before using the key mapping', async () => {
    const envConfig = await resolveRuntimeConfig({
      cliOptions: {
        secretKey: 'sk_tr_cli',
      },
      env: {
        ENGAGELAB_EMAIL_BASE_URL: 'https://env.example.com',
      },
      readConfig: async () => ({
        baseUrl: 'https://config.example.com',
      }),
    });

    assert.equal(envConfig.baseUrl, 'https://env.example.com');

    const fileConfig = await resolveRuntimeConfig({
      cliOptions: {
        secretKey: 'sk_tr_cli',
      },
      env: {},
      readConfig: async () => ({
        baseUrl: 'https://config.example.com',
      }),
    });

    assert.equal(fileConfig.baseUrl, 'https://config.example.com');
  });

  it('supports uppercase region codes in the secret key', async () => {
    const config = await resolveRuntimeConfig({
      cliOptions: {
        secretKey: 'sk_TR_XDfUt2_RXkCWdOMGk6_GecyhRKOZiKvNtGDQbBbgxtM',
      },
      env: {},
      readConfig: async () => ({}),
    });

    assert.equal(config.baseUrl, 'https://emailapi-tr.engagelab.com');
  });

  it('throws a config error when no explicit baseUrl exists and the key region is unknown', async () => {
    await assert.rejects(
      resolveRuntimeConfig({
        cliOptions: {
          secretKey: 'sk_xx_unknown',
        },
        env: {},
        readConfig: async () => ({}),
      }),
      (error) => {
        assert.equal(error.code, 'config_error');
        assert.match(error.message, /Missing base URL/);
        return true;
      },
    );
  });
});
