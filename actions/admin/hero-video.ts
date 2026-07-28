"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, toActionError } from "@/lib/auth-guard";
import { deleteAsset, isCloudinaryConfigured } from "@/lib/cloudinary";
import { updateManySettings } from "@/lib/settings";
import { DEFAULT_HERO_VIDEO, type HeroVideoState } from "@/lib/hero-video";
import type { ActionResult } from "@/types";

/**
 * Administración del video del Hero.
 *
 * El video vive en Cloudinary y su URL se guarda en SiteSetting (`heroVideoUrl`),
 * que ya existía. Se agregan dos claves nuevas:
 *   · `heroVideoPoster`   → primer fotograma, para no dejar el hero en blanco.
 *   · `heroVideoPublicId` → id en Cloudinary, necesario para poder borrarlo.
 *
 * Regla: el video actual se mantiene hasta que otro se sube con éxito. Si la
 * subida falla, no se toca nada.
 */

export async function getHeroVideo(): Promise<HeroVideoState> {
  const rows = await db.siteSetting.findMany({
    where: { key: { in: ["heroVideoUrl", "heroVideoPoster", "heroVideoPublicId"] } },
  });

  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const url = map.heroVideoUrl?.trim() || DEFAULT_HERO_VIDEO;

  return {
    url,
    posterUrl: map.heroVideoPoster?.trim() || null,
    publicId: map.heroVideoPublicId?.trim() || null,
    isCustom: url !== DEFAULT_HERO_VIDEO,
  };
}

/**
 * Guarda el video recién subido. La subida a Cloudinary la hace el endpoint
 * `/api/upload/video`; acá solo se persiste el resultado.
 */
export async function saveHeroVideo(input: {
  url: string;
  posterUrl: string;
  publicId: string;
}): Promise<ActionResult> {
  try {
    await requireAdmin();

    if (!/^https:\/\/res\.cloudinary\.com\//.test(input.url)) {
      return { success: false, error: "La URL del video no es válida" };
    }

    const previous = await getHeroVideo();

    await updateManySettings(
      {
        heroVideoUrl: input.url,
        heroVideoPoster: input.posterUrl,
        heroVideoPublicId: input.publicId,
      },
      "hero"
    );

    // Se borra el anterior solo si era otro asset: subir con el mismo public_id
    // ya lo sobrescribe, y borrarlo dejaría el hero sin video.
    if (previous.publicId && previous.publicId !== input.publicId) {
      await deleteAsset(previous.publicId, "video");
    }

    revalidatePath("/", "page");
    revalidatePath("/admin/settings/general");

    return { success: true, message: "Video actualizado." };
  } catch (error) {
    return toActionError(error, "No pudimos guardar el video");
  }
}

/** Elimina el video personalizado y vuelve al que viene con el sitio. */
export async function deleteHeroVideo(): Promise<ActionResult> {
  try {
    await requireAdmin();

    const current = await getHeroVideo();

    if (!current.isCustom) {
      return { success: false, error: "No hay un video personalizado para eliminar" };
    }

    if (current.publicId && isCloudinaryConfigured()) {
      await deleteAsset(current.publicId, "video");
    }

    await updateManySettings(
      {
        heroVideoUrl: DEFAULT_HERO_VIDEO,
        heroVideoPoster: "",
        heroVideoPublicId: "",
      },
      "hero"
    );

    revalidatePath("/", "page");
    revalidatePath("/admin/settings/general");

    return { success: true, message: "Se restauró el video por defecto." };
  } catch (error) {
    return toActionError(error, "No pudimos eliminar el video");
  }
}
