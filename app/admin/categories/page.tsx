import Link from "next/link";
import { db } from "@/lib/db";
import { Plus, Pencil, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminDeleteButton } from "@/components/admin/admin-delete-button";
import { getCategoryIcon } from "@/lib/category-icons";
import { deleteCategory } from "@/actions/admin/categories";

export const metadata = { title: "Categorías | Admin" };

export default async function AdminCategoriesPage() {
  const categories = await db.category.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, slug: true, image: true,
      order: true, isActive: true, showInNav: true,
      parent: { select: { name: true } },
      _count: { select: { products: true, children: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
          <p className="text-sm text-gray-500 mt-1">{categories.length} categorías en total</p>
        </div>
        <Link href="/admin/categories/new">
          <Button className="rounded-xl bg-brand-blue-mid hover:bg-brand-blue-hover gap-2">
            <Plus className="w-4 h-4" /> Nueva categoría
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* La tabla scrollea dentro de su caja: en mobile no empuja el layout. */}
        <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem]">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoría</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Padre</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Productos</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Orden</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {categories.map((c) => {
              // Mismo criterio que la tienda: el ícono se deriva del slug con
              // iconografía Lucide, nunca de un emoji guardado en la base.
              const CategoryIcon = getCategoryIcon(c.slug, c.name);

              return (
              <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {c.image ? (
                        <img src={c.image} alt={c.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <CategoryIcon className="w-4 h-4 text-gray-400" aria-hidden="true" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">/{c.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500 hidden md:table-cell">{c.parent?.name ?? "–"}</td>
                <td className="px-4 py-4 text-sm text-gray-700">
                  {c._count.products}
                  {c._count.children > 0 && (
                    <span className="text-xs text-gray-400"> · {c._count.children} sub</span>
                  )}
                </td>
                <td className="px-4 py-4 text-sm text-gray-500 hidden sm:table-cell">{c.order}</td>
                <td className="px-4 py-4 hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {c.isActive
                      ? <Badge className="bg-green-100 text-green-700 text-[10px]">Activa</Badge>
                      : <Badge variant="outline" className="text-[10px]">Inactiva</Badge>}
                    {c.showInNav && <Badge className="bg-blue-100 text-blue-700 text-[10px]">En menú</Badge>}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 justify-end">
                    <Link href={`/admin/categories/${c.id}`} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                      <Pencil className="w-3.5 h-3.5 text-gray-500" />
                    </Link>
                    <AdminDeleteButton
                      id={c.id}
                      name={c.name}
                      action={deleteCategory}
                      successMessage="Categoría eliminada"
                    />
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        {categories.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Tag className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p>Todavía no hay categorías</p>
          </div>
        )}
      </div>
    </div>
  );
}
