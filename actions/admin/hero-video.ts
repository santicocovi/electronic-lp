"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, toActionError } from "@/lib/auth-guard";
import {
  buildHeroPosterUrl,
  buildHeroVideoUrl,
  deleteAsset,
  isCloudinaryConfigured,
  upgradeCloudinaryPosterUrl,
  upgradeCloudinaryVideoUrl,
} from "@/lib/cloudinary";
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
  const storedUrl = map.heroVideoUrl?.trim() || DEFAULT_HERO_VIDEO;
  const storedPoster = map.heroVideoPoster?.trim() || null;

  /**
   * Los videos subidos antes de este cambio quedaron guardados con una URL de
   * calidad media (`q_auto`). Se reescribe el tramo de transformación al vuelo
   * para que recuperen la calidad alta sin obligar a volver a subir el archivo.
   * El `public_id` y la versión —que son los que identifican al asset— no se
   * tocan, así que apunta exactamente al mismo video.
   */
  const url = upgradeCloudinaryVideoUrl(storedUrl);

  return {
    url,
    posterUrl: storedPoster ? upgradeCloudinaryPosterUrl(storedPoster) : null,
    publicId: map.heroVideoPublicId?.trim() || null,
    isCustom: storedUrl !== DEFAULT_HERO_VIDEO,
  };
}

/**
 * Registra un video que el navegador ya subió directo a Cloudinary.
 *
 * Del cliente solo se aceptan el identificador y la versión del asset: las URLs
 * de entrega —con la transformación de alta calidad— se arman acá, así el
 * navegador no puede pedir que se sirva otra cosa ni con otra compresión.
 */
export async function saveHeroVideoAsset(input: {
  publicId: string;
  version: string;
}): Promise<ActionResult> {
  try {
    await requireAdmin();

    // Formato de un public_id de Cloudinary: letras, números, guiones y barras.
    if (!/^[\w./-]+$/.test(input.publicId)) {
      return { success: false, error: "El identificador del video no es válido" };
    }
    if (input.version && !/^v\d+$/.test(input.version)) {
      return { success: false, error: "La versión del video no es válida" };
    }

    const version = input.version ? `${input.version}/` : "";

    return saveHeroVideo({
      url: buildHeroVideoUrl(input.publicId, version),
      posterUrl: buildHeroPosterUrl(input.publicId, version),
      publicId: input.publicId,
    });
  } catch (error) {
    return toActionError(error, "No pudimos guardar el video");
  }
}

/**
 * Guarda el video recién subido. La subida a Cloudinary la hace el navegador
 * (o, como respaldo, el endpoint `/api/upload/video`); acá solo se persiste.
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
