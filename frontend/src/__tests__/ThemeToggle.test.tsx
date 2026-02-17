/**
 * Tests for the ThemeToggle component (next-themes based).
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import ThemeToggle from "@/components/ThemeToggle";

// Mock next-themes
const mockSetTheme = jest.fn();
jest.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "dark",
    setTheme: mockSetTheme,
  }),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    mockSetTheme.mockReset();
  });

  it("renders a button", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /toggle dark mode/i });
    expect(button).toBeInTheDocument();
  });

  it("renders an SVG icon", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /toggle dark mode/i });
    const svg = button.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("calls setTheme on click", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /toggle dark mode/i });
    button.click();
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });
});
