"use client";

import { useState, useEffect } from "react";
import { AppFilters, Category, Country, SortField } from "@/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface FiltersProps {
  filters: AppFilters;
  categories: Category[];
  countries: Country[];
  onFilterChange: (filters: Partial<AppFilters>) => void;
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "lowest_weighted", label: "Lowest Weighted Rating" },
  { value: "lowest_rating", label: "Lowest Raw Rating" },
  { value: "highest_rating", label: "Highest Rating" },
  { value: "most_reviews", label: "Most Reviews" },
  { value: "fewest_reviews", label: "Fewest Reviews" },
  { value: "name", label: "Name (A-Z)" },
];

export default function Filters({
  filters,
  categories,
  countries,
  onFilterChange,
}: FiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        onFilterChange({ search: searchValue });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external filter changes
  useEffect(() => {
    setSearchValue(filters.search);
  }, [filters.search]);

  return (
    <div className="rounded-2xl bg-white p-6 ring-1 ring-inset ring-zinc-900/10 dark:bg-white/2.5 dark:ring-white/10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-900 dark:text-white">
            Search
          </label>
          <Input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search app name..."
          />
        </div>

        {/* Sort */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-900 dark:text-white">
            Sort By
          </label>
          <Select
            value={filters.sort}
            onValueChange={(value) => onFilterChange({ sort: value as SortField })}
          >
            <SelectTrigger className="w-full h-10 rounded-lg bg-white ring-1 ring-inset ring-zinc-900/10 border-0 shadow-none text-sm text-zinc-900 dark:bg-white/5 dark:ring-white/10 dark:text-white focus:ring-2 focus:ring-emerald-500/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 ring-1 ring-inset ring-zinc-900/10 dark:ring-white/10 border-0">
              {SORT_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="text-zinc-900 dark:text-white focus:bg-emerald-50 focus:text-emerald-900 dark:focus:bg-emerald-500/10 dark:focus:text-emerald-400"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Country */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-900 dark:text-white">
            Country
          </label>
          <Select
            value={filters.country || "_all"}
            onValueChange={(value) => onFilterChange({ country: value === "_all" ? "" : value })}
          >
            <SelectTrigger className="w-full h-10 rounded-lg bg-white ring-1 ring-inset ring-zinc-900/10 border-0 shadow-none text-sm text-zinc-900 dark:bg-white/5 dark:ring-white/10 dark:text-white focus:ring-2 focus:ring-emerald-500/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 ring-1 ring-inset ring-zinc-900/10 dark:ring-white/10 border-0">
              <SelectItem
                value="_all"
                className="text-zinc-900 dark:text-white focus:bg-emerald-50 focus:text-emerald-900 dark:focus:bg-emerald-500/10 dark:focus:text-emerald-400"
              >
                All Countries
              </SelectItem>
              {countries.map((c) => (
                <SelectItem
                  key={c.code}
                  value={c.code}
                  className="text-zinc-900 dark:text-white focus:bg-emerald-50 focus:text-emerald-900 dark:focus:bg-emerald-500/10 dark:focus:text-emerald-400"
                >
                  {c.name} ({c.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-900 dark:text-white">
            Category
          </label>
          <Select
            value={filters.category || "_all"}
            onValueChange={(value) => onFilterChange({ category: value === "_all" ? "" : value })}
          >
            <SelectTrigger className="w-full h-10 rounded-lg bg-white ring-1 ring-inset ring-zinc-900/10 border-0 shadow-none text-sm text-zinc-900 dark:bg-white/5 dark:ring-white/10 dark:text-white focus:ring-2 focus:ring-emerald-500/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 ring-1 ring-inset ring-zinc-900/10 dark:ring-white/10 border-0">
              <SelectItem
                value="_all"
                className="text-zinc-900 dark:text-white focus:bg-emerald-50 focus:text-emerald-900 dark:focus:bg-emerald-500/10 dark:focus:text-emerald-400"
              >
                All Categories
              </SelectItem>
              {categories.map((c) => (
                <SelectItem
                  key={c.id}
                  value={c.name}
                  className="text-zinc-900 dark:text-white focus:bg-emerald-50 focus:text-emerald-900 dark:focus:bg-emerald-500/10 dark:focus:text-emerald-400"
                >
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Minimum Reviews Slider */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-900 dark:text-white">
            Minimum Reviews
          </label>
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {filters.min_reviews.toLocaleString()}
          </span>
        </div>
        <Slider
          min={0}
          max={10000}
          step={50}
          value={[filters.min_reviews]}
          onValueChange={([value]) => onFilterChange({ min_reviews: value })}
          className="[&_[data-slot=slider-track]]:bg-zinc-200 [&_[data-slot=slider-track]]:dark:bg-white/10 [&_[data-slot=slider-range]]:bg-emerald-500 [&_[data-slot=slider-thumb]]:border-emerald-500 [&_[data-slot=slider-thumb]]:ring-emerald-500/50"
        />
        <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>0</span>
          <span>2,500</span>
          <span>5,000</span>
          <span>7,500</span>
          <span>10,000</span>
        </div>
      </div>
    </div>
  );
}
