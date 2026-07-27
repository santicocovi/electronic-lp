"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import type { ActionResult } from "@/types";

interface AdminDeleteButtonProps {
  id: string;
  name: string;
  /** Server action that deletes the record. */
  action: (id: string) => Promise<ActionResult>;
  /** What was deleted, used in the toast (e.g. "Categoría eliminada"). */
  successMessage?: string;
}

export function AdminDeleteButton({
  id,
  name,
  action,
  successMessage = "Eliminado",
}: AdminDeleteButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    const result = await action(id);
    if (result.success) {
      toast.add({ title: successMessage });
      router.refresh();
    } else {
      toast.add({ title: result.error, type: "error" });
    }
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      title={`Eliminar ${name}`}
      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  );
}
