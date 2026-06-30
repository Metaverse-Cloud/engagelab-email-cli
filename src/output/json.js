export function writeJsonError(stderr, error) {
  const payload = {
    error: {
      code: error.code || 'unknown_error',
      errorCode: error.errorCode ?? error.data?.code,
      message: error.message || 'Command failed',
    },
  };

  if (error.data !== undefined) {
    payload.error.data = error.data;
  }

  stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
}