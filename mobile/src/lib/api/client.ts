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

type BackendMutationOptions = Readonly<{
  body?: BodyInit;
  fallback?: string;
  headers?: HeadersInit;
  method: "DELETE" | "PATCH" | "POST" | "PUT";
}>;

export async function mutateBackendJson<T>(
  path: string,
  options: BackendMutationOptions,
): Promise<T> {
  const response = await fetch(`/api/backend/${path.replace(/^\/+/, "")}`, {
    body: options.body,
    credentials: "same-origin",
    headers: options.headers,
    method: options.method,
  });
  const fallback = options.fallback ?? "We couldn't save your changes.";

  if (!response.ok) {
    throw new BackendRequestError(await getBackendErrorMessage(response, fallback));
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new BackendRequestError(fallback);
  }
}

export function sendBackendJson<T>(
  path: string,
  method: BackendMutationOptions["method"],
  payload?: unknown,
  headers?: HeadersInit,
): Promise<T> {
  return mutateBackendJson<T>(path, {
    body: payload === undefined ? undefined : JSON.stringify(payload),
    headers: { "content-type": "application/json", ...headers },
    method,
  });
}
