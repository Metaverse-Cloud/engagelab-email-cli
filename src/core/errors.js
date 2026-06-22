export class CliError extends Error {
  constructor(message, { code = 'cli_error', exitCode = 1, status, data, cause } = {}) {
    super(message, { cause });
    this.name = 'CliError';
    this.code = code;
    this.exitCode = exitCode;
    this.status = status;
    this.data = data;
  }
}

export function mapHttpStatusToExitCode(status) {
  if (status === 401 || status === 403) return 2;
  if (status === 404) return 3;
  if (status === 409) return 4;
  return 5;
}

export function toCliError(error) {
  if (error instanceof CliError) {
    return error;
  }

  return new CliError(error?.message || 'Command failed', {
    code: 'unknown_error',
    exitCode: 5,
    cause: error,
  });
}

export function validationError(message) {
  return new CliError(message, { code: 'validation_error', exitCode: 1 });
}

export function configError(message) {
  return new CliError(message, { code: 'config_error', exitCode: 1 });
}
