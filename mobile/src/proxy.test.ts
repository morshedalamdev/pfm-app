import { describe, expect, it } from "vitest";

import { config } from "@/proxy";

describe("protected route configuration", () => {
  it("protects every canonical finance route and its legacy aliases", () => {
    expect(config.matcher).toEqual(
      expect.arrayContaining([
        "/accounts/:path*",
        "/analytics/:path*",
        "/budget/:path*",
        "/goal/:path*",
        "/loan/:path*",
        "/transaction/:path*",
        "/report/:path*",
        "/plan/:path*",
        "/transactions/:path*",
      ]),
    );
  });
});
