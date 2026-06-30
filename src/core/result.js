import { CliError, mapErrorCodeToExitCode } from './errors.js';

export function unwrapResult(value, { httpStatus } = {}) {
  if (!value || typeof value !== 'object' || typeof value.code !== 'number') {
    throw new CliError('Invalid server response format', {
      code: 'invalid_response',
      exitCode: 5,
      status: httpStatus,
      data: value,
    });
  }

  if (value.code !== 0) {
    throw new CliError(value.message || 'Request failed', {
      code: resultCodeToErrorCode(value.code),
      exitCode: mapErrorCodeToExitCode(value.code, httpStatus),
      status: value.code,
      errorCode: value.code,
      data: value,
    });
  }

  return value;
}

export async function readResultResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new CliError('Invalid server response format', {
      code: 'invalid_response',
      exitCode: 5,
      status: response.status,
      cause: error,
    });
  }

  if (response.status < 200 || response.status >= 300) {
    throw new CliError(data?.message || `Request failed with status code ${response.status}`, {
      code: resultCodeToErrorCode(data?.code ?? response.status),
      exitCode: mapErrorCodeToExitCode(data?.code, response.status),
      status: response.status,
      errorCode: data?.code,
      data,
    });
  }

  return unwrapResult(data, { httpStatus: response.status });
}

function resultCodeToErrorCode(code) {
  if (code === 100101 || code === 401 || code === 403) return 'auth_error';
  if (code === 100201 || code === 404) return 'not_found';
  if (code === 100202 || code === 100203 || code === 100303 || code === 409) return 'state_conflict';
  if (code === 100301 || code === 400) return 'validation_error';
  return 'server_error';
}