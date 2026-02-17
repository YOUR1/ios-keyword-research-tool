"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/auth-api";
import { formatLimit } from "@/lib/format";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function SettingsPage() {
  const { user, loading, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      await authFetch("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ full_name: fullName }),
      });
      await refreshUser();
      setProfileMessage({ type: "success", text: "Profile updated successfully." });
    } catch (err) {
      setProfileMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update profile.",
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordMessage({
        type: "error",
        text: "New password must be at least 8 characters.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "New passwords do not match.",
      });
      return;
    }

    setPasswordSaving(true);
    try {
      await authFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({
        type: "success",
        text: "Password changed successfully.",
      });
    } catch (err) {
      setPasswordMessage({
        type: "error",
        text:
          err instanceof Error ? err.message : "Failed to change password.",
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Settings
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your profile and account settings.
        </p>
      </div>

      {/* Profile Section */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Profile
        </h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              Email cannot be changed.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>

          {profileMessage && (
            <p
              className={`text-sm ${
                profileMessage.type === "success"
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-500"
              }`}
            >
              {profileMessage.text}
            </p>
          )}

          <button
            type="submit"
            disabled={profileSaving}
            className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {profileSaving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      {/* Plan Section */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Plan
        </h2>
        {user?.plan ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {user.plan.name}
              </span>
              {user.plan.price_cents_monthly > 0 && (
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  ${(user.plan.price_cents_monthly / 100).toFixed(2)}/month
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-zinc-200 dark:border-zinc-700">
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Keywords
                </p>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formatLimit(user.plan.max_keywords)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Crawls/Day
                </p>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formatLimit(user.plan.max_crawls_per_day)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Results
                </p>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formatLimit(user.plan.max_results_stored)}
                </p>
              </div>
            </div>
            <div className="pt-3">
              <button
                type="button"
                className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No plan information available.
          </p>
        )}
      </div>

      {/* Password Section */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Change Password
        </h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>

          {passwordMessage && (
            <p
              className={`text-sm ${
                passwordMessage.type === "success"
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-500"
              }`}
            >
              {passwordMessage.text}
            </p>
          )}

          <button
            type="submit"
            disabled={passwordSaving}
            className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {passwordSaving ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
