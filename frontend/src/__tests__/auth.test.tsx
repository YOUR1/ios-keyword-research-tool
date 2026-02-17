/**
 * Tests for authentication — LoginPage, RegisterPage, AuthContext, and useAuth.
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/",
}));

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock auth-api module
const mockLoginApi = jest.fn();
const mockRegisterApi = jest.fn();
const mockLogoutApi = jest.fn();
const mockGetMeApi = jest.fn();

jest.mock("@/lib/auth-api", () => ({
  loginApi: (...args: unknown[]) => mockLoginApi(...args),
  registerApi: (...args: unknown[]) => mockRegisterApi(...args),
  logoutApi: (...args: unknown[]) => mockLogoutApi(...args),
  getMeApi: (...args: unknown[]) => mockGetMeApi(...args),
}));

import LoginPage from "@/app/(auth)/login/page";
import RegisterPage from "@/app/(auth)/register/page";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import type { User, Plan } from "@/types";

const mockPlan: Plan = {
  id: 1,
  name: "free",
  max_keywords: 5,
  max_crawls_per_day: 2,
  max_results_stored: 500,
  price_cents_monthly: 0,
};

const mockUser: User = {
  id: 1,
  email: "test@example.com",
  full_name: "Test User",
  role: "user",
  plan: mockPlan,
  is_active: true,
  email_verified: false,
  created_at: "2026-01-01T00:00:00",
};

// Helper to wrap with AuthProvider
function renderWithAuth(ui: React.ReactElement) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMeApi.mockRejectedValue(new Error("Not authenticated"));
});

describe("LoginPage", () => {
  it("renders email and password fields", async () => {
    await act(async () => {
      renderWithAuth(<LoginPage />);
    });

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows error on failed login", async () => {
    mockLoginApi.mockRejectedValue(new Error("Invalid credentials"));

    await act(async () => {
      renderWithAuth(<LoginPage />);
    });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "bad@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "wrongpass" } });
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it("calls login on submit", async () => {
    mockLoginApi.mockResolvedValue(undefined);
    mockGetMeApi
      .mockRejectedValueOnce(new Error("Not authenticated"))
      .mockResolvedValueOnce(mockUser);

    await act(async () => {
      renderWithAuth(<LoginPage />);
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    });

    await waitFor(() => {
      expect(mockLoginApi).toHaveBeenCalledWith("test@example.com", "password123");
    });
  });

  it("redirects to /dashboard on success", async () => {
    mockLoginApi.mockResolvedValue(undefined);
    mockGetMeApi
      .mockRejectedValueOnce(new Error("Not authenticated"))
      .mockResolvedValueOnce(mockUser);

    await act(async () => {
      renderWithAuth(<LoginPage />);
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});

describe("RegisterPage", () => {
  it("renders all fields", async () => {
    await act(async () => {
      renderWithAuth(<RegisterPage />);
    });

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("validates password length", async () => {
    await act(async () => {
      renderWithAuth(<RegisterPage />);
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "new@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: "short" },
      });
      fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    });

    await waitFor(() => {
      const matches = screen.getAllByText(/at least 8 characters/i);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
    expect(mockRegisterApi).not.toHaveBeenCalled();
  });

  it("calls register on submit", async () => {
    mockRegisterApi.mockResolvedValue(undefined);
    mockGetMeApi
      .mockRejectedValueOnce(new Error("Not authenticated"))
      .mockResolvedValueOnce(mockUser);

    await act(async () => {
      renderWithAuth(<RegisterPage />);
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: "New User" },
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "new@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: "securepass123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    });

    await waitFor(() => {
      expect(mockRegisterApi).toHaveBeenCalledWith(
        "new@example.com",
        "securepass123",
        "New User",
      );
    });
  });
});

describe("AuthProvider", () => {
  it("provides user when logged in", async () => {
    mockGetMeApi.mockResolvedValue(mockUser);

    function UserDisplay() {
      const { user } = useAuth();
      return <div>{user ? user.email : "no user"}</div>;
    }

    await act(async () => {
      renderWithAuth(<UserDisplay />);
    });

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });
  });

  it("provides null when not logged in", async () => {
    mockGetMeApi.mockRejectedValue(new Error("Not authenticated"));

    function UserDisplay() {
      const { user, loading } = useAuth();
      if (loading) return <div>loading</div>;
      return <div>{user ? user.email : "no user"}</div>;
    }

    await act(async () => {
      renderWithAuth(<UserDisplay />);
    });

    await waitFor(() => {
      expect(screen.getByText("no user")).toBeInTheDocument();
    });
  });

  it("useAuth hook returns expected shape", async () => {
    mockGetMeApi.mockRejectedValue(new Error("Not authenticated"));

    let authValue: ReturnType<typeof useAuth> | null = null;

    function AuthConsumer() {
      authValue = useAuth();
      return <div>consumer</div>;
    }

    await act(async () => {
      renderWithAuth(<AuthConsumer />);
    });

    await waitFor(() => {
      expect(authValue).not.toBeNull();
      expect(authValue).toHaveProperty("user");
      expect(authValue).toHaveProperty("loading");
      expect(authValue).toHaveProperty("login");
      expect(authValue).toHaveProperty("register");
      expect(authValue).toHaveProperty("logout");
      expect(authValue).toHaveProperty("refreshUser");
    });
  });

  it("shows loading while initializing", async () => {
    let resolveGetMe: (value: User | null) => void;
    mockGetMeApi.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGetMe = resolve;
        }),
    );

    function UserDisplay() {
      const { loading } = useAuth();
      return <div>{loading ? "loading" : "ready"}</div>;
    }

    await act(async () => {
      renderWithAuth(<UserDisplay />);
    });

    expect(screen.getByText("loading")).toBeInTheDocument();

    await act(async () => {
      resolveGetMe!(null);
    });

    await waitFor(() => {
      expect(screen.getByText("ready")).toBeInTheDocument();
    });
  });

  it("logout clears user state", async () => {
    mockGetMeApi.mockResolvedValueOnce(mockUser);
    mockLogoutApi.mockResolvedValue(undefined);

    function LogoutTest() {
      const { user, loading, logout } = useAuth();
      if (loading) return <div>loading</div>;
      return (
        <div>
          <div>{user ? user.email : "no user"}</div>
          <button onClick={logout}>Logout</button>
        </div>
      );
    }

    await act(async () => {
      renderWithAuth(<LogoutTest />);
    });

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /logout/i }));
    });

    await waitFor(() => {
      expect(screen.getByText("no user")).toBeInTheDocument();
    });
  });
});
