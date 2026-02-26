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
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

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
      <Card className="border-red-500/20 bg-red-50 dark:bg-red-900/10">
        <CardContent className="py-6 text-red-600 dark:text-red-400">
          Failed to load keywords. Please try again.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Projects
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Manage the search terms you want to track in the App Store.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} variant="primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </Button>
      </div>

      {/* Table */}
      {data && data.items.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Term</TableHead>
                <TableHead className="hidden sm:table-cell">Country</TableHead>
                <TableHead className="hidden md:table-cell">Frequency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Last Crawled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((keyword) => (
                <TableRow key={keyword.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/keywords/${keyword.id}`}
                      className="font-medium text-zinc-900 dark:text-white hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                    >
                      {keyword.term}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-zinc-600 dark:text-zinc-400">
                    {keyword.country_code}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-zinc-600 dark:text-zinc-400 capitalize">
                    {keyword.crawl_frequency}
                  </TableCell>
                  <TableCell>
                    <button onClick={() => handleToggleActive(keyword)}>
                      <Badge variant={keyword.is_active ? "success" : "secondary"}>
                        {keyword.is_active ? "Active" : "Paused"}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-zinc-600 dark:text-zinc-400">
                    {keyword.last_crawled_at
                      ? new Date(keyword.last_crawled_at).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {/* Trigger crawl */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleTriggerCrawl(keyword.id)}
                        disabled={triggerCrawl.isPending}
                        title="Trigger crawl"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </Button>
                      {/* Edit */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditingKeyword(keyword)}
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeletingId(keyword.id)}
                        title="Delete"
                        className="hover:text-red-500 dark:hover:text-red-400"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-900/5 dark:border-white/5">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Showing {(data.page - 1) * data.page_size + 1}--
                {Math.min(data.page * data.page_size, data.total)} of{" "}
                {data.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.page <= 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-3 text-sm text-zinc-600 dark:text-zinc-400">
                  Page {data.page} of {data.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={data.page >= data.total_pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
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
