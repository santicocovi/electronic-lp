/**
 * Calidad de imágenes y video.
 *
 * ── El problema que resuelve ──────────────────────────────────
 * `next/image` NUNCA sirve el archivo original: lo reprocesa y lo entrega en
 * AVIF o WebP. Si no se le pasa `quality`, usa 75 por defecto, que es una
 * compresión pensada para maximizar el ahorro de bytes, no para conservar la
 * imagen. En fotos de producto —fondos blancos, degradados suaves, reflejos
 * sobre aluminio y vidrio— ese 75 se nota: aparecen bandas en los degradados y
 * los bordes se ablandan. El administrador subía un archivo impecable y la
 * tienda lo mostraba visiblemente peor.
 *
 * Estas constantes fijan la calidad de forma explícita en cada `<Image>`.
 *
 * ── Por qué estos valores ─────────────────────────────────────
 * Entre 90 y 95 la diferencia contra el original deja de percibirse a simple
 * vista, mientras que el archivo sigue siendo bastante más liviano que el JPEG
 * o PNG de origen gracias a AVIF/WebP. Subir de 95 aporta muy poco visualmente
 * y encarece bastante el peso, así que ahí está el techo razonable.
 *
 * El escalón por tamaño existe porque el ojo no exige lo mismo en cada lugar:
 * una miniatura de 56 px no gana nada con calidad 95, y bajarla ahorra bytes
 * donde no se nota.
 */

/**
 * Imágenes protagonistas: ficha de producto, carrusel de la portada, tarjeta
 * grande de categorías. Es donde el cliente mira el producto de verdad.
 */
export const IMAGE_QUALITY_HERO = 92;

/** Grillas de catálogo y tarjetas de producto. */
export const IMAGE_QUALITY_CARD = 88;

/** Miniaturas y avatares: se ven a menos de 100 px de lado. */
export const IMAGE_QUALITY_THUMB = 80;

/**
 * Visor ampliado. Acá el cliente está inspeccionando el producto de cerca, que
 * es justo el momento en el que una compresión agresiva se delata.
 */
export const IMAGE_QUALITY_ZOOM = 95;

/**
 * Ancho mínimo recomendado para una foto de producto, en píxeles.
 *
 * Ningún ajuste de compresión puede recuperar píxeles que el archivo no tiene:
 * `next/image` reduce, nunca amplía. Si el original mide 500 px de ancho y la
 * ficha lo muestra en un marco de 712 px, el navegador lo estira y se ve
 * borroso por más que la calidad esté al máximo.
 *
 * 1600 px cubre con holgura el lugar más exigente del sitio —la galería de la
 * ficha en una pantalla de densidad 2x— y deja margen para el visor ampliado.
 */
export const RECOMMENDED_IMAGE_WIDTH = 1600;

/** Por debajo de esto la imagen se va a ver claramente estirada. */
export const MINIMUM_IMAGE_WIDTH = 1000;
