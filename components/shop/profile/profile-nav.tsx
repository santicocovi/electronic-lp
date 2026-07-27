"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { User, Package, MapPin, Heart, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/profile", label: "Mis datos", icon: User, exact: true },
  { href: "/profile/orders", label: "Mis pedidos", icon: Package },
  { href: "/profile/addresses", label: "Mis direcciones", icon: MapPin },
  { href: "/wishlist", label: "Favoritos", icon: Heart },
];

export function ProfileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:sticky lg:top-24 h-fit">
      <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
        {LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-white text-brand-blue-mid shadow-sm border border-gray-100"
                  : "text-gray-600 hover:bg-white/70 hover:text-gray-900"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors whitespace-nowrap lg:mt-2"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}
