"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ShoppingCart, Heart, User, Menu, X, ChevronDown,
  Package, LogOut, Settings, LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  {
    label: "Productos",
    href: "/products",
    children: [
      { label: "iPhone", href: "/categories/iphone" },
      { label: "MacBook", href: "/categories/macbook" },
      { label: "iPad", href: "/categories/ipad" },
      { label: "Apple Watch", href: "/categories/apple-watch" },
      { label: "AirPods", href: "/categories/airpods" },
      { label: "Auriculares", href: "/categories/auriculares" },
      { label: "Parlantes", href: "/categories/parlantes" },
      { label: "Gaming", href: "/categories/gaming" },
      { label: "Smart Home", href: "/categories/smart-home" },
      { label: "Accesorios", href: "/categories/accesorios" },
    ],
  },
  { label: "Ofertas", href: "/products?filter=sale" },
  { label: "Novedades", href: "/products?filter=new" },
  { label: "Contacto", href: "/contact" },
];

export function Navbar() {
  const { data: session } = useSession();
  const items = useCartStore((s) => s.items);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN" ||
    (session?.user as { role?: string })?.role === "SUPERADMIN";

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm"
            : "bg-transparent"
        )}
      >
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <span className="font-bold text-xl tracking-tight text-brand-blue-dark">
              Electronic <span className="text-brand-blue-mid">LP</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => link.children && setOpenDropdown(link.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <Link
                  href={link.href}
                  className={cn(
                    "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-brand-blue-mid hover:bg-brand-blue-subtle transition-all duration-200",
                    link.children && "cursor-default"
                  )}
                >
                  {link.label}
                  {link.children && (
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 transition-transform duration-200",
                        openDropdown === link.label && "rotate-180"
                      )}
                    />
                  )}
                </Link>

                {/* Dropdown */}
                <AnimatePresence>
                  {link.children && openDropdown === link.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-1 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50"
                    >
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-brand-blue-subtle hover:text-brand-blue-mid transition-colors"
                          onClick={() => setOpenDropdown(null)}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Link href="/search">
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-brand-blue-subtle">
                <Search className="w-5 h-5 text-gray-600" />
              </Button>
            </Link>

            {session && (
              <Link href="/wishlist">
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-brand-blue-subtle">
                  <Heart className="w-5 h-5 text-gray-600" />
                </Button>
              </Link>
            )}

            <Link href="/cart" className="relative">
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-brand-blue-subtle">
                <ShoppingCart className="w-5 h-5 text-gray-600" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-brand-blue-mid">
                    {cartCount > 99 ? "99+" : cartCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {session ? (
              <div className="relative group hidden sm:block">
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-brand-blue-subtle">
                  <User className="w-5 h-5 text-gray-600" />
                </Button>
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                  <div className="px-3 py-2 border-b border-gray-50 mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{session.user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
                  </div>
                  {isAdmin && (
                    <Link href="/admin" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-brand-blue-subtle hover:text-brand-blue-mid">
                      <LayoutDashboard className="w-4 h-4" /> Administración
                    </Link>
                  )}
                  <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-brand-blue-subtle">
                    <Settings className="w-4 h-4" /> Mi perfil
                  </Link>
                  <Link href="/profile/orders" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-brand-blue-subtle">
                    <Package className="w-4 h-4" /> Mis pedidos
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Cerrar sesión
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/login" className="hidden sm:block">
                <Button size="sm" className="rounded-xl bg-brand-blue-mid hover:bg-brand-blue-hover text-white">
                  Ingresar
                </Button>
              </Link>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-40 bg-white pt-16 overflow-y-auto lg:hidden"
          >
            <div className="px-4 py-6 space-y-2">
              {NAV_LINKS.map((link) => (
                <div key={link.label}>
                  <Link
                    href={link.href}
                    className="block py-3 px-4 text-lg font-medium text-gray-900 rounded-xl hover:bg-brand-blue-subtle"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                  {link.children && (
                    <div className="pl-4 space-y-1 mt-1">
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block py-2 px-4 text-sm text-gray-600 rounded-xl hover:bg-brand-blue-subtle"
                          onClick={() => setMobileOpen(false)}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-4 border-t border-gray-100">
                {session ? (
                  <button
                    onClick={() => { signOut({ callbackUrl: "/" }); setMobileOpen(false); }}
                    className="flex items-center gap-2 w-full py-3 px-4 text-red-600 rounded-xl hover:bg-red-50"
                  >
                    <LogOut className="w-5 h-5" /> Cerrar sesión
                  </button>
                ) : (
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full rounded-xl bg-brand-blue-mid">Ingresar</Button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
