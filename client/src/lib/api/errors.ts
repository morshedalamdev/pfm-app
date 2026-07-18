type ErrorPayload = {
  detail?: unknown;
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
    if (typeof payload.error?.message === "string") return payload.error.message;
    if (typeof payload.detail === "string") return payload.detail;
    return fallback;
  } catch {
    return fallback;
  }
}

export function apiError(message: string): { error: { message: string } } {
  return { error: { message } };
}
