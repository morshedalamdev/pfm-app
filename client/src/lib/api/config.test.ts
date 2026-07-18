// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import { getBackendBaseUrl, getBackendUrl } from "@/lib/api/config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("backend API configuration", () => {
  it("uses the local API during development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SERVER_API_BASE_URL", "");

    expect(getBackendBaseUrl()).toBe("http://localhost:8000");
  });

  it("normalizes the configured production API origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "SERVER_API_BASE_URL",
      "https://pfm-app-obn3.onrender.com/",
    );

    expect(getBackendBaseUrl()).toBe("https://pfm-app-obn3.onrender.com");
    expect(getBackendUrl("/api/v1/health/live")).toBe(
      "https://pfm-app-obn3.onrender.com/api/v1/health/live",
    );
  });

  it("rejects a missing production API origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SERVER_API_BASE_URL", "");

    expect(() => getBackendBaseUrl()).toThrow(
      "SERVER_API_BASE_URL is required in production",
    );
  });

  it("supports a private HTTP origin inside a production container network", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SERVER_API_BASE_URL", "http://api:8000");

    expect(getBackendBaseUrl()).toBe("http://api:8000");
  });
});
