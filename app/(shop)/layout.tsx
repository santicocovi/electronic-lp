import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { CurrencyProvider } from "@/hooks/use-currency";
import { getExchangeRate } from "@/lib/currency";
import { getPricingConfig } from "@/lib/pricing";
import { db } from "@/lib/db";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  // La cotización se resuelve en el servidor una sola vez por render y baja al
  // cliente por contexto: así el navegador nunca consulta la API del dólar.
  const [rate, pricing, categories] = await Promise.all([
    getExchangeRate(),
    getPricingConfig(),
    // Menú de categorías dinámico: antes estaba escrito a mano en el navbar.
    db.category
      .findMany({
        where: { isActive: true, showInNav: true, parentId: null },
        orderBy: { order: "asc" },
        select: { id: true, name: true, slug: true },
        take: 14,
      })
      .catch(() => []),
  ]);

  return (
    <CurrencyProvider
      rate={rate.rate}
      baseCurrency={pricing.baseCurrency}
      arsSurchargePercent={pricing.surcharges.CASH_ARS}
    >
      <Navbar categories={categories} />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <WhatsAppButton />
    </CurrencyProvider>
  );
}
