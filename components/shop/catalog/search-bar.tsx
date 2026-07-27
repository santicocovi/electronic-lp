"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(searchParams.get("search") ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = term.trim();
    // Start a fresh search rather than inheriting the previous filters/page.
    router.push(value ? `/search?search=${encodeURIComponent(value)}` : "/search");
  }

  return (
    <form onSubmit={submit} className="relative max-w-xl">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Buscar productos..."
        aria-label="Buscar productos"
        autoComplete="off"
        className="w-full h-12 pl-11 pr-24 rounded-2xl border border-gray-200 bg-white text-sm outline-none transition-shadow focus:ring-2 focus:ring-brand-blue-mid/20 focus:border-brand-blue-border"
      />
      {term && (
        <button
          type="button"
          onClick={() => setTerm("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-[5.5rem] top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <button
        type="submit"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-4 rounded-xl bg-brand-blue-mid text-white text-sm font-semibold hover:bg-brand-blue-hover transition-colors"
      >
        Buscar
      </button>
    </form>
  );
}
