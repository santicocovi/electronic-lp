"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteProduct } from "@/actions/admin/products";
import { useToast } from "@/hooks/use-toast";

export function AdminDeleteProduct({ id, name }: { id: string; name: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleDelete() {
    if (!confirm(`¿Eliminár "${name}"? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    const result = await deleteProduct(id);
    if (result.success) {
      toast({ title: "Producto eliminado" });
      router.refresh();
    } else {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  );
}
