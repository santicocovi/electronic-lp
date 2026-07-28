"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Package, Tag, Building2, ShoppingBag,
  Users, Percent, Settings, LogOut, Image, ChevronRight,
  Home, Coins, Film,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Productos", icon: Package },
  { href: "/admin/categories", label: "Categorías", icon: Tag },
  { href: "/admin/brands", label: "Marcas", icon: Building2 },
  { href: "/admin/orders", label: "Pedidos", icon: ShoppingBag },
  { href: "/admin/customers", label: "Clientes", icon: Users },
  { href: "/admin/promotions/coupons", label: "Cupones", icon: Percent },
  { href: "/admin/settings/payments", label: "Pagos y monedas", icon: Coins },
  { href: "/admin/settings/hero", label: "Video de portada", icon: Film },
  { href: "/admin/settings/general", label: "Configuración", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 min-h-screen">
      <div className="px-6 py-5 border-b border-gray-100">
        <p className="font-bold text-lg text-brand-blue-dark">
          Electronic <span className="text-brand-blue-mid">LP</span>
        </p>
        <p className="text-xs text-gray-400 mt-0.5">Panel de administración</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-brand-blue-subtle text-brand-blue-mid"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {active && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          <Home className="w-4 h-4" /> Ver tienda
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
