"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CatalogPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function CatalogPagination({ page, totalPages, onPageChange }: CatalogPaginationProps) {
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1;
    if (page <= 4) return i + 1;
    if (page >= totalPages - 3) return totalPages - 6 + i;
    return page - 3 + i;
  });

  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      <Button
        variant="outline"
        size="icon"
        className="rounded-xl"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {pages.map((p) => (
        <Button
          key={p}
          variant={p === page ? "default" : "outline"}
          size="sm"
          className={cn("rounded-xl min-w-9", p === page && "bg-brand-blue-mid hover:bg-brand-blue-hover")}
          onClick={() => onPageChange(p)}
        >
          {p}
        </Button>
      ))}

      <Button
        variant="outline"
        size="icon"
        className="rounded-xl"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
