"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AppTableSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50 dark:bg-zinc-800/50">
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>App</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead className="text-right">Reviews</TableHead>
            <TableHead className="text-right hidden lg:table-cell">Weighted</TableHead>
            <TableHead className="text-right hidden lg:table-cell">Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="w-8 h-8 rounded-full" />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-8" />
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-4 w-12 ml-auto" />
              </TableCell>
              <TableCell className="text-right hidden lg:table-cell">
                <Skeleton className="h-4 w-14 ml-auto" />
              </TableCell>
              <TableCell className="text-right hidden lg:table-cell">
                <Skeleton className="h-4 w-10 ml-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
