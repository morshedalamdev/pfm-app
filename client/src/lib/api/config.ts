const DEFAULT_BACKEND_URL = "http://localhost:8000";

export function getBackendBaseUrl(): string {
  const configured = process.env.SERVER_API_BASE_URL?.trim();

  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("SERVER_API_BASE_URL is required in production");
  }

  const backendUrl = configured || DEFAULT_BACKEND_URL;
  const url = new URL(backendUrl);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("SERVER_API_BASE_URL must use HTTP or HTTPS");
  }

  if (url.username || url.password) {
    throw new Error("SERVER_API_BASE_URL must not contain credentials");
  }

  return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
}

export function getBackendUrl(path: string): string {
  if (!path.startsWith("/api/v1/")) {
    throw new Error("Backend paths must stay within /api/v1");
  }

  return `${getBackendBaseUrl()}${path}`;
}
