import { createHash, randomBytes } from 'node:crypto';

// RFC 7636 requires the code_verifier to be 43-128 characters from the
// unreserved set. 48 random bytes base64url-encoded land comfortably in
// that range and keep the value unbiased.
const CODE_VERIFIER_BYTES = 48;
const STATE_BYTES = 16;

export function createCodeVerifier(byteLength = CODE_VERIFIER_BYTES) {
  return base64Url(randomBytes(byteLength));
}

export function createCodeChallenge(codeVerifier) {
  return base64Url(createHash('sha256').update(codeVerifier).digest());
}

export function createPkcePair() {
  const codeVerifier = createCodeVerifier();
  return { codeVerifier, codeChallenge: createCodeChallenge(codeVerifier) };
}

export function createState() {
  return base64Url(randomBytes(STATE_BYTES));
}

export function base64Url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
