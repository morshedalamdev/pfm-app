import { AxiosError } from "axios";

export type ApiErrorKind =
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "network"
  | "server"
  | "unknown";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly details?: unknown;

  constructor({
    kind,
    message,
    status,
    details,
  }: {
    kind: ApiErrorKind;
    message: string;
    status?: number;
    details?: unknown;
  }) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.details = details;
  }
}

type ErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export function mapApiError(error: unknown): ApiError {
  if (!(error instanceof AxiosError)) {
    return new ApiError({
      kind: "unknown",
      message: "Something went wrong. Please try again.",
    });
  }

  if (!error.response) {
    return new ApiError({
      kind: "network",
      message: "Network error. Check your connection and try again.",
    });
  }

  const status = error.response.status;
  const data = error.response.data as ErrorEnvelope | undefined;
  const message =
    data?.error?.message ?? error.message ?? "Request failed. Please try again.";

  return new ApiError({
    kind: statusToKind(status),
    message,
    status,
    details: data?.error?.details,
  });
}

function statusToKind(status: number): ApiErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422) return "validation";
  if (status >= 500) return "server";
  return "unknown";
}
