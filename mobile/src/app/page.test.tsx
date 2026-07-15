import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("HomePage", () => {
  it("renders the isolated mobile application foundation", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Mobile foundation ready" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("mobile-app")).toBeInTheDocument();
  });
});
