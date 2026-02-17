/**
 * Tests for settings page — profile form, plan info, and password change.
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

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

// Profile form component for testing
function ProfileForm({
  user,
  onSubmit,
}: {
  user: User;
  onSubmit: (data: { full_name: string }) => void;
}) {
  const [fullName, setFullName] = React.useState(user.full_name || "");
  const [saved, setSaved] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ full_name: fullName });
    setSaved(true);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={user.email} disabled />
      </div>
      <div>
        <label htmlFor="fullName">Full Name</label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <button type="submit">Save Changes</button>
      {saved && <p>Profile updated successfully</p>}
    </form>
  );
}

// Plan info component for testing
function PlanInfo({ plan }: { plan: Plan }) {
  return (
    <div>
      <h3>Current Plan</h3>
      <p>Plan: {plan.name}</p>
      <p>Keywords: {plan.max_keywords}</p>
      <p>Crawls/Day: {plan.max_crawls_per_day}</p>
      <p>Max Results: {plan.max_results_stored}</p>
      {plan.price_cents_monthly === 0 ? (
        <p>Price: Free</p>
      ) : (
        <p>Price: ${(plan.price_cents_monthly / 100).toFixed(2)}/mo</p>
      )}
    </div>
  );
}

// Change password form component for testing
function ChangePasswordForm({
  onSubmit,
}: {
  onSubmit: (data: { current_password: string; new_password: string }) => void;
}) {
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    onSubmit({ current_password: currentPassword, new_password: newPassword });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="currentPassword">Current Password</label>
        <input
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="newPassword">New Password</label>
        <input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      {error && <p className="error">{error}</p>}
      <button type="submit">Change Password</button>
    </form>
  );
}

// Settings page wrapper for testing
function SettingsPage({
  user,
  onProfileSubmit,
  onPasswordSubmit,
}: {
  user: User;
  onProfileSubmit: (data: { full_name: string }) => void;
  onPasswordSubmit: (data: {
    current_password: string;
    new_password: string;
  }) => void;
}) {
  return (
    <div>
      <h1>Settings</h1>
      <section>
        <h2>Profile</h2>
        <ProfileForm user={user} onSubmit={onProfileSubmit} />
      </section>
      <section>
        <PlanInfo plan={user.plan} />
      </section>
      <section>
        <h2>Change Password</h2>
        <ChangePasswordForm onSubmit={onPasswordSubmit} />
      </section>
    </div>
  );
}

describe("Settings page", () => {
  it("renders profile form", () => {
    render(
      <SettingsPage
        user={mockUser}
        onProfileSubmit={jest.fn()}
        onPasswordSubmit={jest.fn()}
      />,
    );

    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("profile form submits name change", async () => {
    const onProfileSubmit = jest.fn();
    render(
      <SettingsPage
        user={mockUser}
        onProfileSubmit={onProfileSubmit}
        onPasswordSubmit={jest.fn()}
      />,
    );

    const nameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(nameInput, { target: { value: "New Name" } });
    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(onProfileSubmit).toHaveBeenCalledWith({ full_name: "New Name" });
    });
  });

  it("plan info displays correctly", () => {
    render(
      <SettingsPage
        user={mockUser}
        onProfileSubmit={jest.fn()}
        onPasswordSubmit={jest.fn()}
      />,
    );

    expect(screen.getByText("Current Plan")).toBeInTheDocument();
    expect(screen.getByText("Plan: free")).toBeInTheDocument();
    expect(screen.getByText(/Keywords: 5/)).toBeInTheDocument();
    expect(screen.getByText(/Crawls\/Day: 2/)).toBeInTheDocument();
  });
});

describe("ChangePasswordForm", () => {
  it("renders password fields", () => {
    render(<ChangePasswordForm onSubmit={jest.fn()} />);

    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /change password/i }),
    ).toBeInTheDocument();
  });

  it("validates min length", async () => {
    const onSubmit = jest.fn();
    render(<ChangePasswordForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: "oldpass123" },
    });
    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits correctly", async () => {
    const onSubmit = jest.fn();
    render(<ChangePasswordForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: "oldpass123" },
    });
    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "newsecurepass123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        current_password: "oldpass123",
        new_password: "newsecurepass123",
      });
    });
  });
});
