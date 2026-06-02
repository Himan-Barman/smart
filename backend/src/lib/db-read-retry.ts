const RETRY_DELAYS_MS = [80, 220, 500];

const wait = (ms: number): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

export const withDbReadRetry = async <T>(
  label: string,
  operation: () => Promise<T>,
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_DELAYS_MS.length) break;
      await wait(RETRY_DELAYS_MS[attempt]);
    }
  }

  console.error(`${label} failed after retries`, lastError);
  throw lastError;
};
