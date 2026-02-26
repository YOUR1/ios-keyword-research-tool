import * as React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: {
    container: "h-6",
    icon: "h-6 w-6",
    text: "text-base",
  },
  md: {
    container: "h-8",
    icon: "h-8 w-8",
    text: "text-xl",
  },
  lg: {
    container: "h-12",
    icon: "h-12 w-12",
    text: "text-3xl",
  },
};

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const sizes = sizeMap[size];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2",
        sizes.container,
        className
      )}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={sizes.icon}
        aria-label="ASKA Logo"
      >
        <rect
          width="32"
          height="32"
          rx="6"
          className="fill-emerald-500 dark:fill-emerald-400"
        />
        <path
          d="M10 21L12.5 14L16 21M11.5 18.5H15"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18 17C18 18.6569 19.3431 20 21 20C22.6569 20 24 18.6569 24 17C24 15.3431 22.6569 14 21 14C19.3431 14 18 15.3431 18 17Z"
          stroke="white"
          strokeWidth="2"
        />
        <path
          d="M21 14V11"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      {showText && (
        <span
          className={cn(
            "font-semibold tracking-tight text-zinc-900 dark:text-white",
            sizes.text
          )}
        >
          ASKA
        </span>
      )}
    </div>
  );
}
