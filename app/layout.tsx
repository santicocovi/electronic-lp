import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
import { SessionProvider } from "@/components/shared/session-provider";
import { auth } from "@/auth";
import { Geist } from "next/font/google";
import { cn, getAppUrl } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: { default: "Electronic LP", template: "%s | Electronic LP" },
  description: "iPhone, MacBook, iPad, AirPods y más. Envíos a todo el país.",
  metadataBase: new URL(getAppUrl()),
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Electronic LP",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="es" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-white antialiased">
        <SessionProvider session={session}>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
