import Link from "next/link";
import { db } from "@/lib/db";
import { Plus, Pencil, Building2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminDeleteButton } from "@/components/admin/admin-delete-button";
import { deleteBrand } from "@/actions/admin/brands";

export const metadata = { title: "Marcas | Admin" };

export default async function AdminBrandsPage() {
  const brands = await db.brand.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, slug: true, logo: true, website: true,
      order: true, isActive: true,
      _count: { select: { products: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marcas</h1>
          <p className="text-sm text-gray-500 mt-1">{brands.length} marcas en total</p>
        </div>
        <Link href="/admin/brands/new">
          <Button className="rounded-xl bg-brand-blue-mid hover:bg-brand-blue-hover gap-2">
            <Plus className="w-4 h-4" /> Nueva marca
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Marca</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Sitio web</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Productos</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Orden</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {brands.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {b.logo ? (
                        <img src={b.logo} alt={b.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <Building2 className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                      <p className="text-xs text-gray-400">/{b.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500 hidden md:table-cell">
                  {b.website ? (
                    <a
                      href={b.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand-blue-mid hover:underline"
                    >
                      Visitar <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : "–"}
                </td>
                <td className="px-4 py-4 text-sm text-gray-700">{b._count.products}</td>
                <td className="px-4 py-4 text-sm text-gray-500 hidden sm:table-cell">{b.order}</td>
                <td className="px-4 py-4 hidden lg:table-cell">
                  {b.isActive
                    ? <Badge className="bg-green-100 text-green-700 text-[10px]">Activa</Badge>
                    : <Badge variant="outline" className="text-[10px]">Inactiva</Badge>}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 justify-end">
                    <Link href={`/admin/brands/${b.id}`} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                      <Pencil className="w-3.5 h-3.5 text-gray-500" />
                    </Link>
                    <AdminDeleteButton
                      id={b.id}
                      name={b.name}
                      action={deleteBrand}
                      successMessage="Marca eliminada"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {brands.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p>Todavía no hay marcas</p>
          </div>
        )}
      </div>
    </div>
  );
}
