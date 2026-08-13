import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAuthorizeUrl,
  fetchDataCenters,
  createDataCenter,
  generateSecretKey,
} from '../src/commands/login.js';
import { createCallbackServer } from '../src/core/oauth-callback.js';

const BASE = 'https://engagelab-consoles.qa.jpushoa.com';

function mockFetch(capture) {
  return async (url, options) => {
    capture.request = { url: url.toString(), options };
    return capture.respond();
  };
}

describe('browser login', () => {
  it('builds the documented main-site authorization parameters', () => {
    const result = new URL(
      buildAuthorizeUrl({
        authorizeUrl: 'https://www.engagelab.com/accounts/signin',
        clientId: 'agent-email-cli',
        redirectUri: 'http://127.0.0.1:43210/callback',
        codeChallenge: 'challenge',
        state: 'state',
      }),
    );

    assert.equal(result.pathname, '/accounts/signin');
    assert.equal(result.searchParams.get('scene'), 'cli');
    assert.equal(result.searchParams.get('client_id'), 'agent-email-cli');
    assert.equal(result.searchParams.get('redirect_uri'), 'http://127.0.0.1:43210/callback');
    assert.equal(result.searchParams.get('state'), 'state');
    assert.equal(result.searchParams.get('code_challenge'), 'challenge');
    assert.equal(result.searchParams.get('code_challenge_method'), 'S256');
  });

  it('fetches the data center list with code/codeVerifier/clientId', async () => {
    const capture = {
      respond: () => ({
        ok: true,
        status: 200,
        json: async () => ({
          status: 1,
          success: true,
          message: 'Retrieval completed',
          data: {
            userDcs: [{ serviceId: 'svc-1', dcName: 'Singapore', serviceName: 'jiang', baseUrl: 'https://x' }],
            lastServiceId: 'svc-1',
          },
        }),
      }),
    };

    const { userDcs, lastServiceId } = await fetchDataCenters({
      base: BASE,
      clientId: 'agent-email-cli',
      code: 'one-time-code',
      codeVerifier: 'verifier',
      fetchImpl: mockFetch(capture),
    });

    assert.deepEqual(userDcs, [
      { serviceId: 'svc-1', dcName: 'Singapore', serviceName: 'jiang', baseUrl: 'https://x' },
    ]);
    assert.equal(lastServiceId, 'svc-1');

    const { url, options } = capture.request;
    assert.ok(url.startsWith(`${BASE}/api/email/user_dc/list.do?`));
    assert.equal(options.method, 'GET');
    const params = new URL(url).searchParams;
    assert.equal(params.get('business'), 'Email');
    assert.equal(params.get('clientId'), 'agent-email-cli');
    assert.equal(params.get('code'), 'one-time-code');
    assert.equal(params.get('codeVerifier'), 'verifier');
  });

  it('creates a data center and returns the new service id', async () => {
    const capture = {
      respond: () => ({
        ok: true,
        status: 200,
        json: async () => ({ status: 1, success: true, data: { info: { serviceId: 'new-svc' } } }),
      }),
    };

    const serviceId = await createDataCenter({
      base: BASE,
      clientId: 'agent-email-cli',
      code: 'one-time-code',
      codeVerifier: 'verifier',
      serviceName: 'sin',
      dcName: 'Singapore',
      fetchImpl: mockFetch(capture),
    });

    assert.equal(serviceId, 'new-svc');
    const { url, options } = capture.request;
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { serviceName: 'sin', dcName: 'Singapore' });
    assert.equal(new URL(url).searchParams.get('codeVerifier'), 'verifier');
  });

  it('generates a Secret Key from the chosen service id', async () => {
    const capture = {
      respond: () => ({
        ok: true,
        status: 200,
        json: async () => ({
          code: 0,
          message: 'Success',
          data: { secretKey: 'sk_sg_abc', secretKeyMask: 'sk_sg_****', dcName: 'Singapore' },
        }),
      }),
    };

    const result = await generateSecretKey({
      base: BASE,
      clientId: 'agent-email-cli',
      code: 'one-time-code',
      codeVerifier: 'verifier',
      serviceId: 'svc-1',
      fetchImpl: mockFetch(capture),
    });

    assert.equal(result.secretKey, 'sk_sg_abc');
    assert.equal(result.secretKeyMask, 'sk_sg_****');
    assert.equal(result.dcName, 'Singapore');
    const { url, options } = capture.request;
    assert.equal(options.method, 'POST');
    const params = new URL(url).searchParams;
    assert.equal(params.get('action'), 'secretKey_regenerate');
    assert.equal(params.get('type'), 'agent');
    assert.equal(params.get('business'), 'Email');
    assert.equal(params.get('serviceId'), 'svc-1');
    assert.equal(params.get('codeVerifier'), 'verifier');
    assert.equal(params.get('code'), 'one-time-code');
  });

  it('rejects a Secret Key response without a valid sk_', async () => {
    const capture = {
      respond: () => ({ ok: true, status: 200, json: async () => ({ code: 0, data: { secretKey: 'nope' } }) }),
    };

    await assert.rejects(
      generateSecretKey({
        base: BASE,
        clientId: 'agent-email-cli',
        code: 'c',
        codeVerifier: 'v',
        serviceId: 's',
        fetchImpl: mockFetch(capture),
      }),
      /invalid Secret Key/i,
    );
  });

  it('rejects error callbacks whose state does not match', async () => {
    const callback = await createCallbackServer({ state: 'expected-state' });
    const rejection = assert.rejects(callback.waitForCode({ timeoutMs: 1000 }), /state mismatch/i);

    try {
      const response = await fetch(`${callback.redirectUri}?error=access_denied&state=wrong-state`);
      assert.equal(response.status, 200);
      await rejection;
    } finally {
      await callback.close();
    }
  });
});
