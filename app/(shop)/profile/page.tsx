import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProfileDetailsForm, ChangePasswordForm } from "@/components/shop/profile/profile-forms";

export const metadata = { title: "Mis datos" };

export default async function ProfilePage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) redirect("/login?callbackUrl=/profile");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, phone: true, password: true },
  });

  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <ProfileDetailsForm
        email={user.email}
        defaultValues={{ name: user.name ?? "", phone: user.phone ?? "" }}
      />
      <ChangePasswordForm hasPassword={!!user.password} />
    </div>
  );
}
