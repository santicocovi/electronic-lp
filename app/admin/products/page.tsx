import Link from "next/link";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { Plus, Pencil, Eye, EyeOff, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminDeleteProduct } from "@/components/admin/admin-delete-product";

export const metadata = { title: "Productos | Admin" };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const search = params.search;
  const status = params.status;
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status === "active") where.isActive = true;
  if (status === "inactive") where.isActive = false;
  if (status === "out") where.stock = 0;

  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      select: {
        id: true, name: true, slug: true, sku: true, price: true,
        stock: true, isActive: true, isFeatured: true, isNew: true, isOnSale: true,
        images: { select: { url: true }, where: { isMain: true }, take: 1 },
        category: { select: { name: true } },
        brand: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500 mt-1">{total} productos en total</p>
        </div>
        <Link href="/admin/products/new">
          <Button className="rounded-xl bg-brand-blue-mid hover:bg-brand-blue-hover gap-2">
            <Plus className="w-4 h-4" /> Nuevo producto
          </Button>
        </Link>
      </div>

      {/* Search + filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <form className="flex-1 min-w-[200px]">
          <input
            name="search"
            defaultValue={search}
            placeholder="Buscar productos..."
            className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-mid/20"
          />
        </form>
        <div className="flex gap-2">
          {["", "active", "inactive", "out"].map((s) => (
            <Link
              key={s}
              href={`/admin/products${s ? `?status=${s}` : ""}`}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${status === s || (!status && !s) ? "bg-brand-blue-subtle text-brand-blue-mid" : "text-gray-500 hover:bg-gray-50"}`}
            >
              {s === "" ? "Todos" : s === "active" ? "Activos" : s === "inactive" ? "Inactivos" : "Sin stock"}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Producto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">SKU</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Precio</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Stock</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                      {p.images[0] ? (
                        <img src={p.images[0].url} alt={p.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <Package className="w-5 h-5 m-2.5 text-gray-300" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 max-w-[180px] truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.brand?.name} · {p.category?.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500 hidden md:table-cell">{p.sku ?? "–"}</td>
                <td className="px-4 py-4 text-sm font-semibold text-gray-900">{formatPrice(Number(p.price))}</td>
                <td className="px-4 py-4 hidden sm:table-cell">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${p.stock === 0 ? "bg-red-100 text-red-600" : p.stock <= 5 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                    {p.stock === 0 ? "Sin stock" : `${p.stock} u.`}
                  </span>
                </td>
                <td className="px-4 py-4 hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {p.isActive ? <Badge className="bg-green-100 text-green-700 text-[10px]">Activo</Badge> : <Badge variant="outline" className="text-[10px]">Inactivo</Badge>}
                    {p.isFeatured && <Badge className="bg-blue-100 text-blue-700 text-[10px]">Destacado</Badge>}
                    {p.isNew && <Badge className="bg-purple-100 text-purple-700 text-[10px]">Nuevo</Badge>}
                    {p.isOnSale && <Badge className="bg-red-100 text-red-700 text-[10px]">Oferta</Badge>}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 justify-end">
                    <Link href={`/admin/products/${p.id}`} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                      <Pencil className="w-3.5 h-3.5 text-gray-500" />
                    </Link>
                    <AdminDeleteProduct id={p.id} name={p.name} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {products.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p>No se encontraron productos</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/products?page=${p}${search ? `&search=${search}` : ""}`}
              className={`w-9 h-9 rounded-xl text-sm font-medium flex items-center justify-center transition-colors ${p === page ? "bg-brand-blue-mid text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
