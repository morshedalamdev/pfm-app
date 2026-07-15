type ErrorPayload = {
  error?: {
    message?: unknown;
  };
};

export async function getBackendErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  if (response.status >= 500) {
    return fallback;
  }

  try {
    const payload = (await response.clone().json()) as ErrorPayload;
    return typeof payload.error?.message === "string"
      ? payload.error.message
      : fallback;
  } catch {
    return fallback;
  }
}

export function apiError(message: string): { error: { message: string } } {
  return { error: { message } };
}
