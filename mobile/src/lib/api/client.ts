import { getBackendErrorMessage } from "@/lib/api/errors";

export class BackendRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendRequestError";
  }
}

/**
 * Browser requests stay same-origin. The Next route handler adds the backend
 * path and the HTTP-only session credentials, so no token reaches client code.
 */
export async function getBackendJson<T>(
  path: string,
  fallback = "We couldn't load this right now.",
): Promise<T> {
  const response = await fetch(`/api/backend/${path.replace(/^\/+/, "")}`, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new BackendRequestError(await getBackendErrorMessage(response, fallback));
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new BackendRequestError(fallback);
  }
}
