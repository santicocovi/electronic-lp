import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-10 text-2xl font-bold tracking-tight text-brand-blue-dark">
        Electronic <span className="text-brand-blue-mid">LP</span>
      </Link>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
