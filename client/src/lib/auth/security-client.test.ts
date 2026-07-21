import { afterEach, describe, expect, it, vi } from "vitest";

import { BackendRequestError } from "@/lib/api/client";
import { getSignInMethods } from "@/lib/auth/security-client";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("security client", () => {
  it("accepts the authoritative sign-in methods contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          connected_providers: ["github", "google"],
          password_enabled: true,
        }),
      ),
    );

    await expect(getSignInMethods()).resolves.toEqual({
      connected_providers: ["github", "google"],
      password_enabled: true,
    });
  });

  it("rejects malformed security state instead of rendering it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          connected_providers: ["unsupported"],
          password_enabled: "yes",
        }),
      ),
    );

    await expect(getSignInMethods()).rejects.toEqual(
      expect.objectContaining<Partial<BackendRequestError>>({
        message: "We couldn't load your sign-in methods.",
        status: 502,
      }),
    );
  });

  it("preserves an authentication status for client redirect handling", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          { error: { message: "Authentication required" } },
          { status: 401 },
        ),
      ),
    );

    await expect(getSignInMethods()).rejects.toEqual(
      expect.objectContaining<Partial<BackendRequestError>>({
        message: "Authentication required",
        status: 401,
      }),
    );
  });
});
