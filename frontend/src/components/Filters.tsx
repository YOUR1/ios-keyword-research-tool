"use client";

import { useState, useEffect } from "react";
import { AppFilters, Category, Country, SortField } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
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
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Sort By
            </label>
            <Select
              value={filters.sort}
              onValueChange={(value) => onFilterChange({ sort: value as SortField })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Country
            </label>
            <Select
              value={filters.country || "_all"}
              onValueChange={(value) => onFilterChange({ country: value === "_all" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Countries</SelectItem>
                {countries.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Category
            </label>
            <Select
              value={filters.category || "_all"}
              onValueChange={(value) => onFilterChange({ category: value === "_all" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Minimum Reviews Slider */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Minimum Reviews: <span className="text-red-500 font-bold">{filters.min_reviews.toLocaleString()}</span>
          </label>
          <Slider
            min={0}
            max={10000}
            step={50}
            value={[filters.min_reviews]}
            onValueChange={([value]) => onFilterChange({ min_reviews: value })}
            className="mt-2"
          />
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>0</span>
            <span>2,500</span>
            <span>5,000</span>
            <span>7,500</span>
            <span>10,000</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
