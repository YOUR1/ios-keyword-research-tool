"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import SuggestionSearch from "@/components/dashboard/SuggestionSearch";

interface KeywordFormData {
  term: string;
  country_code: string;
  category_id: number | null;
  crawl_frequency: string;
  expansion_enabled: boolean;
}

interface KeywordFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: KeywordFormData) => void;
  initialData?: Partial<KeywordFormData>;
  isSubmitting?: boolean;
}

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "CN", name: "China" },
  { code: "BR", name: "Brazil" },
  { code: "IN", name: "India" },
  { code: "MX", name: "Mexico" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "RU", name: "Russia" },
  { code: "TR", name: "Turkey" },
];

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "manual", label: "Manual Only" },
];

const EMPTY_FORM: KeywordFormData = {
  term: "",
  country_code: "US",
  category_id: null,
  crawl_frequency: "daily",
  expansion_enabled: true,
};

export default function KeywordForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting,
}: KeywordFormProps) {
  const [form, setForm] = useState<KeywordFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setForm({ ...EMPTY_FORM, ...initialData });
      setErrors({});
    }
  }, [isOpen, initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.term.trim()) {
      newErrors.term = "Keyword term is required";
    } else if (form.term.trim().length < 2) {
      newErrors.term = "Term must be at least 2 characters";
    }
    if (!form.country_code) {
      newErrors.country_code = "Country is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ ...form, term: form.term.trim() });
    }
  };

  const isEdit = !!initialData?.term;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Keyword" : "Add Keyword"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Term */}
        <div>
          <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Search Term
          </label>
          <SuggestionSearch
            value={form.term}
            onChange={(val) => setForm({ ...form, term: val })}
            onSelect={(term) => setForm({ ...form, term })}
            country={form.country_code}
            placeholder="e.g. flashlight, calculator"
          />
          {errors.term && (
            <p className="mt-1 text-xs text-red-500">{errors.term}</p>
          )}
        </div>

        {/* Country */}
        <div>
          <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Country
          </label>
          <select
            value={form.country_code}
            onChange={(e) => setForm({ ...form, country_code: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 outline-none"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
          {errors.country_code && (
            <p className="mt-1 text-xs text-red-500">{errors.country_code}</p>
          )}
        </div>

        {/* Crawl Frequency */}
        <div>
          <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Crawl Frequency
          </label>
          <select
            value={form.crawl_frequency}
            onChange={(e) =>
              setForm({ ...form, crawl_frequency: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 outline-none"
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* AI Keyword Expansion */}
        <div className="flex items-center justify-between py-2">
          <div>
            <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              AI Keyword Expansion
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">
              Automatically generate related search terms to find more apps
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, expansion_enabled: !form.expansion_enabled })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
              form.expansion_enabled ? "bg-red-500" : "bg-zinc-300 dark:bg-zinc-600"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                form.expansion_enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {isSubmitting
              ? "Saving..."
              : isEdit
              ? "Update Keyword"
              : "Add Keyword"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
