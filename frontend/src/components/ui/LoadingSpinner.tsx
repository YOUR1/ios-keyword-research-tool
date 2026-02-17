"use client";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-2",
  lg: "w-12 h-12 border-3",
};

export default function LoadingSpinner({ size = "md" }: LoadingSpinnerProps) {
  return (
    <div
      className={`${SIZES[size]} rounded-full border-zinc-300 dark:border-zinc-600 border-t-red-500 animate-spin`}
      role="status"
      aria-label="Loading"
    />
  );
}
