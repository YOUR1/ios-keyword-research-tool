/**
 * Tests for discover feature — SuggestionSearch, TrendingGrid, and Discover page.
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/dashboard/discover",
}));

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock hooks
const mockUseSuggestions = jest.fn();
const mockUseTrending = jest.fn();
const mockCreateKeywordMutateAsync = jest.fn();

jest.mock("@/hooks/useDiscover", () => ({
  useSuggestions: (...args: unknown[]) => mockUseSuggestions(...args),
  useTrending: (...args: unknown[]) => mockUseTrending(...args),
}));

jest.mock("@/hooks/useKeywords", () => ({
  useCreateKeyword: () => ({
    mutateAsync: mockCreateKeywordMutateAsync,
    isPending: false,
  }),
}));

import SuggestionSearch from "@/components/dashboard/SuggestionSearch";
import TrendingGrid from "@/components/dashboard/TrendingGrid";
import {
  mockSuggestionsResponse,
  mockTrendingResponse,
  mockTrendingApp,
} from "./fixtures";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSuggestions.mockReturnValue({
    data: undefined,
    isLoading: false,
  });
  mockUseTrending.mockReturnValue({
    data: undefined,
    isLoading: false,
  });
});

// ---------------------------------------------------------------------------
// SuggestionSearch
// ---------------------------------------------------------------------------

describe("SuggestionSearch", () => {
  it("renders input with placeholder", () => {
    render(
      <SuggestionSearch onSelect={jest.fn()} placeholder="Search apps..." />
    );

    expect(screen.getByPlaceholderText("Search apps...")).toBeInTheDocument();
  });

  it("shows dropdown on typing 2+ chars", async () => {
    mockUseSuggestions.mockReturnValue({
      data: mockSuggestionsResponse,
      isLoading: false,
    });

    render(<SuggestionSearch onSelect={jest.fn()} />);

    const input = screen.getByRole("textbox");
    await act(async () => {
      fireEvent.change(input, { target: { value: "calc" } });
    });

    // Wait for debounce and suggestions to appear
    await waitFor(() => {
      expect(screen.getByText("calculator")).toBeInTheDocument();
    });
    expect(screen.getByText("calendar")).toBeInTheDocument();
    expect(screen.getByText("calorie tracker")).toBeInTheDocument();
  });

  it("calls onSelect on click", async () => {
    mockUseSuggestions.mockReturnValue({
      data: mockSuggestionsResponse,
      isLoading: false,
    });

    const onSelect = jest.fn();
    render(<SuggestionSearch onSelect={onSelect} />);

    const input = screen.getByRole("textbox");
    await act(async () => {
      fireEvent.change(input, { target: { value: "calc" } });
    });

    await waitFor(() => {
      expect(screen.getByText("calculator")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("calculator"));
    expect(onSelect).toHaveBeenCalledWith("calculator");
  });

  it("keyboard navigation with ArrowDown + Enter", async () => {
    mockUseSuggestions.mockReturnValue({
      data: mockSuggestionsResponse,
      isLoading: false,
    });

    const onSelect = jest.fn();
    render(<SuggestionSearch onSelect={onSelect} />);

    const input = screen.getByRole("textbox");
    await act(async () => {
      fireEvent.change(input, { target: { value: "calc" } });
    });

    await waitFor(() => {
      expect(screen.getByText("calculator")).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith("calculator");
  });

  it("Escape closes dropdown", async () => {
    mockUseSuggestions.mockReturnValue({
      data: mockSuggestionsResponse,
      isLoading: false,
    });

    render(<SuggestionSearch onSelect={jest.fn()} />);

    const input = screen.getByRole("textbox");
    await act(async () => {
      fireEvent.change(input, { target: { value: "calc" } });
    });

    await waitFor(() => {
      expect(screen.getByText("calculator")).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByText("calculator")).not.toBeInTheDocument();
  });

  it("no dropdown for short input", async () => {
    render(<SuggestionSearch onSelect={jest.fn()} />);

    const input = screen.getByRole("textbox");
    await act(async () => {
      fireEvent.change(input, { target: { value: "c" } });
    });

    // Suggestions should not be shown
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// TrendingGrid
// ---------------------------------------------------------------------------

describe("TrendingGrid", () => {
  it("renders app cards with rank and names", () => {
    render(
      <TrendingGrid
        apps={mockTrendingResponse.apps}
        isLoading={false}
      />
    );

    expect(screen.getByText("Trending Game")).toBeInTheDocument();
    expect(screen.getByText("Social Network")).toBeInTheDocument();
    expect(screen.getByText("Photo Editor")).toBeInTheDocument();
    // Rank badges
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<TrendingGrid apps={[]} isLoading={true} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    render(<TrendingGrid apps={[]} isLoading={false} />);

    expect(screen.getByText(/no trending apps found/i)).toBeInTheDocument();
  });

  it("add keyword button calls handler", () => {
    const onAddKeyword = jest.fn();
    render(
      <TrendingGrid
        apps={[mockTrendingApp]}
        isLoading={false}
        onAddKeyword={onAddKeyword}
      />
    );

    const addButton = screen.getByLabelText("Add Trending Game as keyword");
    fireEvent.click(addButton);
    expect(onAddKeyword).toHaveBeenCalledWith("Trending Game");
  });

  it("renders developer name and genres", () => {
    render(
      <TrendingGrid
        apps={[mockTrendingApp]}
        isLoading={false}
      />
    );

    expect(screen.getByText("Cool Dev")).toBeInTheDocument();
    expect(screen.getByText("Games, Entertainment")).toBeInTheDocument();
  });

  it("handles missing developer gracefully", () => {
    const appNodev = { ...mockTrendingApp, developer: null };
    render(<TrendingGrid apps={[appNodev]} isLoading={false} />);

    expect(screen.getByText("Unknown Developer")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// DiscoverPage (integration)
// ---------------------------------------------------------------------------

describe("DiscoverPage", () => {
  // Dynamic import to get mocks applied first
  let DiscoverPage: React.ComponentType;

  beforeAll(async () => {
    const mod = await import(
      "@/app/(dashboard)/dashboard/discover/page"
    );
    DiscoverPage = mod.default;
  });

  beforeEach(() => {
    mockUseTrending.mockReturnValue({
      data: mockTrendingResponse,
      isLoading: false,
    });
  });

  it("renders both sections", () => {
    render(<DiscoverPage />);

    expect(screen.getByText("Keyword Suggestions")).toBeInTheDocument();
    expect(screen.getByText("Trending Apps")).toBeInTheDocument();
  });

  it("renders country selector", () => {
    render(<DiscoverPage />);

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue("US");
  });

  it("renders chart type buttons", () => {
    render(<DiscoverPage />);

    expect(screen.getByText("Top Free")).toBeInTheDocument();
    expect(screen.getByText("Top Paid")).toBeInTheDocument();
    expect(screen.getByText("Top Grossing")).toBeInTheDocument();
  });

  it("renders trending apps from mock data", () => {
    render(<DiscoverPage />);

    expect(screen.getByText("Trending Game")).toBeInTheDocument();
    expect(screen.getByText("Social Network")).toBeInTheDocument();
  });
});
