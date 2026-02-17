"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useKeywords,
  useCreateKeyword,
  useUpdateKeyword,
  useDeleteKeyword,
  useTriggerCrawl,
} from "@/hooks/useKeywords";
import { Keyword } from "@/types";
import KeywordForm from "@/components/dashboard/KeywordForm";
import CrawlStatusBadge from "@/components/dashboard/CrawlStatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";

export default function KeywordsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useKeywords(page);
  const createKeyword = useCreateKeyword();
  const updateKeyword = useUpdateKeyword();
  const deleteKeyword = useDeleteKeyword();
  const triggerCrawl = useTriggerCrawl();

  const [formOpen, setFormOpen] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleCreate = async (formData: {
    term: string;
    country_code: string;
    category_id: number | null;
    crawl_frequency: string;
  }) => {
    await createKeyword.mutateAsync(formData);
    setFormOpen(false);
  };

  const handleUpdate = async (formData: {
    term: string;
    country_code: string;
    category_id: number | null;
    crawl_frequency: string;
  }) => {
    if (!editingKeyword) return;
    await updateKeyword.mutateAsync({ id: editingKeyword.id, data: formData });
    setEditingKeyword(null);
  };

  const handleDelete = async () => {
    if (deletingId === null) return;
    await deleteKeyword.mutateAsync(deletingId);
    setDeletingId(null);
  };

  const handleToggleActive = (keyword: Keyword) => {
    updateKeyword.mutate({
      id: keyword.id,
      data: { is_active: !keyword.is_active },
    });
  };

  const handleTriggerCrawl = (keywordId: number) => {
    triggerCrawl.mutate(keywordId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-red-600 dark:text-red-400">
        Failed to load keywords. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Keywords
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage the search terms you want to track in the App Store.
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Keyword
        </button>
      </div>

      {/* Table */}
      {data && data.items.length > 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Term
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                    Country
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                    Frequency
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden lg:table-cell">
                    Last Crawled
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                {data.items.map((keyword) => (
                  <tr
                    key={keyword.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/keywords/${keyword.id}`}
                        className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-red-500 transition-colors"
                      >
                        {keyword.term}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 hidden sm:table-cell">
                      {keyword.country_code}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 capitalize hidden md:table-cell">
                      {keyword.crawl_frequency}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(keyword)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          keyword.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60"
                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600"
                        }`}
                      >
                        {keyword.is_active ? "Active" : "Paused"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">
                      {keyword.last_crawled_at
                        ? new Date(keyword.last_crawled_at).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Trigger crawl */}
                        <button
                          onClick={() => handleTriggerCrawl(keyword.id)}
                          disabled={triggerCrawl.isPending}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Trigger crawl"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => setEditingKeyword(keyword)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => setDeletingId(keyword.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-700">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Showing {(data.page - 1) * data.page_size + 1}--
                {Math.min(data.page * data.page_size, data.total)} of{" "}
                {data.total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.page <= 1}
                  className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Page {data.page} of {data.total_pages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={data.page >= data.total_pages}
                  className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          title="No keywords yet"
          message="Add your first keyword to start tracking App Store search results."
          actionLabel="Add Keyword"
          onAction={() => setFormOpen(true)}
        />
      )}

      {/* Add keyword modal */}
      <KeywordForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={createKeyword.isPending}
      />

      {/* Edit keyword modal */}
      <KeywordForm
        isOpen={!!editingKeyword}
        onClose={() => setEditingKeyword(null)}
        onSubmit={handleUpdate}
        initialData={
          editingKeyword
            ? {
                term: editingKeyword.term,
                country_code: editingKeyword.country_code,
                category_id: editingKeyword.category_id,
                crawl_frequency: editingKeyword.crawl_frequency,
              }
            : undefined
        }
        isSubmitting={updateKeyword.isPending}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
        title="Delete Keyword"
        message="Are you sure you want to delete this keyword? All associated crawl history will be lost. This action cannot be undone."
      />
    </div>
  );
}
