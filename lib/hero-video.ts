/**
 * Constantes y tipos del video del Hero.
 *
 * Viven acá y no en `actions/admin/hero-video.ts` porque un archivo marcado con
 * `"use server"` solo puede exportar funciones async: exportar una constante
 * desde ahí rompe el build de Next.
 */

/** Video que trae el sitio y al que se vuelve si se elimina el personalizado. */
export const DEFAULT_HERO_VIDEO = "/videos/hero.mp4";

export interface HeroVideoState {
  url: string;
  posterUrl: string | null;
  publicId: string | null;
  /** true si hay un video subido desde el panel. */
  isCustom: boolean;
}
