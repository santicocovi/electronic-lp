import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProfileNav } from "@/components/shop/profile/profile-nav";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/profile");

  return (
    <div className="pt-16 min-h-screen bg-gray-50/60">
      <div className="container mx-auto px-4 py-10 md:py-14">
        <div className="mb-8">
          <h1 className="heading-lg text-gray-900">Mi cuenta</h1>
          <p className="text-gray-500 mt-1">
            Hola{session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""} 👋
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
          <ProfileNav />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
