import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AddressManager } from "@/components/shop/profile/address-manager";
import type { AddressType } from "@/types";

export const metadata = { title: "Mis direcciones" };

export default async function ProfileAddressesPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) redirect("/login?callbackUrl=/profile/addresses");

  const addresses = await db.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: {
      id: true, label: true, firstName: true, lastName: true,
      street: true, number: true, apartment: true, city: true,
      province: true, postalCode: true, country: true, phone: true, isDefault: true,
    },
  });

  return <AddressManager addresses={addresses as AddressType[]} />;
}
