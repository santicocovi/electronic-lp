import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;

  if (!session || (role !== "ADMIN" && role !== "SUPERADMIN")) {
    redirect("/login?callbackUrl=/admin");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
