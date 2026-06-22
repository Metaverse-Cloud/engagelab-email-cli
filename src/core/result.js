import { CliError, mapHttpStatusToExitCode } from './errors.js';

export function unwrapResult(value, { httpStatus } = {}) {
  if (!value || typeof value !== 'object' || typeof value.code !== 'number') {
    throw new CliError('Invalid server response format', {
      code: 'invalid_response',
      exitCode: 5,
      status: httpStatus,
      data: value,
    });
  }

  if (value.code !== 200) {
    throw new CliError(value.message || 'Request failed', {
      code: resultCodeToErrorCode(value.code),
      exitCode: mapHttpStatusToExitCode(value.code),
      status: value.code,
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
      code: resultCodeToErrorCode(response.status),
      exitCode: mapHttpStatusToExitCode(response.status),
      status: response.status,
      data,
    });
  }

  return unwrapResult(data, { httpStatus: response.status });
}

function resultCodeToErrorCode(code) {
  if (code === 401 || code === 403) return 'auth_error';
  if (code === 404) return 'not_found';
  if (code === 409) return 'state_conflict';
  if (code === 400) return 'validation_error';
  return 'server_error';
}
