import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "@/components/shared/session-provider";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: { default: "Electronic LP", template: "%s | Electronic LP" },
  description: "iPhone, MacBook, iPad, AirPods y más. Envíos a todo el país.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
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
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-white antialiased">
        <SessionProvider session={session}>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
