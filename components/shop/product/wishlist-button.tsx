"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { toggleWishlist } from "@/actions/wishlist";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  productId: string;
  initialSaved?: boolean;
  className?: string;
  /** Shows a text label beside the icon (product detail page). */
  withLabel?: boolean;
}

export function WishlistButton({
  productId, initialSaved = false, className, withLabel = false,
}: WishlistButtonProps) {
  const { status } = useSession();
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    // The button often sits inside a card-wide link.
    e.preventDefault();
    e.stopPropagation();

    if (status !== "authenticated") {
      toast.add({ title: "Ingresá para guardar favoritos" });
      router.push("/login?callbackUrl=/wishlist");
      return;
    }

    // Optimistic: flip now, roll back if the server disagrees.
    const next = !saved;
    setSaved(next);

    startTransition(async () => {
      const result = await toggleWishlist(productId);
      if (result.success) {
        toast.add({
          title: result.data?.added ? "Agregado a favoritos" : "Quitado de favoritos",
        });
        router.refresh();
      } else {
        setSaved(!next);
        toast.add({ title: result.error, type: "error" });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={saved}
      title={saved ? "Quitar de favoritos" : "Agregar a favoritos"}
      className={cn(
        "flex items-center justify-center gap-2 transition-colors",
        saved ? "text-red-500" : "text-gray-500 hover:text-red-500",
        className
      )}
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Heart className="w-4 h-4" fill={saved ? "currentColor" : "none"} />
      )}
      {withLabel && <span>{saved ? "En favoritos" : "Agregar a favoritos"}</span>}
    </button>
  );
}
