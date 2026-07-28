import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney, getPricingConfig } from "@/lib/pricing";
import { formatStoreDate } from "@/lib/dates";
import { Users, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Clientes | Admin" };

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<string, string> = {
  USER: "Cliente",
  ADMIN: "Admin",
  SUPERADMIN: "Superadmin",
};

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const search = params.search?.trim();

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, name: true, email: true, phone: true, role: true, createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
  ]);

  // Lifetime spend for just the users on this page.
  const spendByUser = users.length
    ? await db.order.groupBy({
        by: ["userId"],
        where: { userId: { in: users.map((u) => u.id) }, paymentStatus: "APPROVED" },
        _sum: { total: true },
      })
    : [];
  const spendMap = new Map(spendByUser.map((s) => [s.userId, Number(s._sum.total ?? 0)]));

  // Los importes de los pedidos están en la moneda base, no siempre en dólares.
  const pricing = await getPricingConfig();

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <p className="text-sm text-gray-500 mt-1">{total} usuarios registrados</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <form>
          <input
            name="search"
            defaultValue={search}
            placeholder="Buscar por nombre o email..."
            className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-mid/20"
          />
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Teléfono</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pedidos</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Total gastado</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Registrado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-blue-subtle text-brand-blue-mid flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {(u.name ?? u.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{u.name ?? "Sin nombre"}</p>
                        {u.role !== "USER" && (
                          <Badge className="bg-purple-100 text-purple-700 text-[10px]">{ROLE_LABELS[u.role]}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500 hidden md:table-cell">{u.phone ?? "–"}</td>
                <td className="px-4 py-4 text-sm text-gray-700">{u._count.orders}</td>
                <td className="px-4 py-4 text-sm font-semibold text-gray-900 hidden sm:table-cell">
                  {formatMoney(spendMap.get(u.id) ?? 0, pricing.baseCurrency)}
                </td>
                <td className="px-4 py-4 text-sm text-gray-500 hidden lg:table-cell">
                  {formatStoreDate(u.createdAt)}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end">
                    <Link href={`/admin/customers/${u.id}`} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Ver cliente">
                      <Eye className="w-3.5 h-3.5 text-gray-500" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p>No se encontraron clientes</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/customers?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
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
