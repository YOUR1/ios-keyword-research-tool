"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSuggestions } from "@/hooks/useDiscover";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface SuggestionSearchProps {
  onSelect: (term: string) => void;
  onChange?: (value: string) => void;
  country?: string;
  value?: string;
  placeholder?: string;
  className?: string;
}

export default function SuggestionSearch({
  onSelect,
  onChange,
  country = "US",
  value: controlledValue,
  placeholder = "Search for keywords...",
  className = "",
}: SuggestionSearchProps) {
  const [internalValue, setInternalValue] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  // Debounce the search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(value);
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  const { data, isLoading } = useSuggestions(debouncedTerm, country);
  const suggestions = data?.suggestions ?? [];

  // Show dropdown when we have suggestions
  useEffect(() => {
    if (suggestions.length > 0 && debouncedTerm.length >= 2) {
      setIsOpen(true);
    }
  }, [suggestions, debouncedTerm]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (controlledValue === undefined) {
        setInternalValue(val);
      }
      onChange?.(val);
      setActiveIndex(-1);
      if (val.length < 2) {
        setIsOpen(false);
      }
    },
    [controlledValue, onChange]
  );

  const selectSuggestion = useCallback(
    (term: string) => {
      if (controlledValue === undefined) {
        setInternalValue(term);
      }
      onChange?.(term);
      onSelect(term);
      setIsOpen(false);
      setActiveIndex(-1);
    },
    [controlledValue, onChange, onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < suggestions.length) {
            selectSuggestion(suggestions[activeIndex].term);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setActiveIndex(-1);
          break;
      }
    },
    [isOpen, suggestions, activeIndex, selectSuggestion]
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0 && value.length >= 2) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-sm"
          autoComplete="off"
        />
        {isLoading && debouncedTerm.length >= 2 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-auto"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.term}
              role="option"
              aria-selected={index === activeIndex}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                index === activeIndex
                  ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                  : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
              }`}
              onClick={() => selectSuggestion(suggestion.term)}
            >
              <span className="flex items-center gap-2">
                <svg
                  className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {suggestion.term}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
