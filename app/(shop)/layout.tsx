import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
