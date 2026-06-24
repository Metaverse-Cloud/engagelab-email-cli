export function writeJsonError(stderr, error) {
  const payload = {
    error: {
      code: error.code || 'unknown_error',
      message: error.message || 'Command failed',
    },
  };

  if (error.data !== undefined) {
    payload.error.data = error.data;
  }

  stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
}
