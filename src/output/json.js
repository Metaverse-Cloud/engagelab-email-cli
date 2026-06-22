export function writeJsonError(stderr, error) {
  stderr.write(
    `${JSON.stringify(
      {
        error: {
          code: error.code || 'unknown_error',
          message: error.message || 'Command failed',
        },
      },
      null,
      2,
    )}\n`,
  );
}
