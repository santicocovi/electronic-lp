/**
 * Utilidades de código postal argentino.
 *
 * Se usan para detectar la zona de entrega propia (Gran La Plata, sin cargo y
 * en el día) y para normalizar lo que escribe el cliente antes de consultar a
 * los transportistas.
 */

/**
 * Rangos de CP del Gran La Plata, donde Electronic LP entrega sin cargo.
 *
 * 1894-1899: City Bell, Villa Elisa, Gonnet, Manuel B. Gonnet.
 * 1900-1925: La Plata capital, Tolosa, Ringuelet, Los Hornos, Berisso, Ensenada.
 *
 * Se puede sobrescribir con el ajuste `free_shipping_postal_ranges`
 * (formato "1894-1899,1900-1925").
 */
export const DEFAULT_LOCAL_RANGES: [number, number][] = [
  [1894, 1899],
  [1900, 1925],
];

/**
 * Normaliza un CP argentino a 4 dígitos.
 * Acepta "B1900AAA", "1900", "b1900" y devuelve "1900"; null si no es válido.
 */
export function normalizePostalCode(input: string | null | undefined): string | null {
  if (!input) return null;

  // Se descarta la letra de provincia y el sufijo de manzana del CPA.
  const digits = String(input).replace(/\D/g, "");
  if (digits.length < 4) return null;

  // El CPA es "B" + 4 dígitos + 3 letras: los 4 primeros dígitos son el CP.
  const code = digits.slice(0, 4);
  const numeric = Number(code);

  // Los CP argentinos válidos van de 1000 a 9431.
  if (!Number.isFinite(numeric) || numeric < 1000 || numeric > 9431) return null;

  return code;
}

/** Parsea "1894-1899,1900-1925" a rangos numéricos. */
export function parseRanges(raw: string | null | undefined): [number, number][] | null {
  if (!raw?.trim()) return null;

  const ranges: [number, number][] = [];

  for (const chunk of raw.split(",")) {
    const parts = chunk.trim().split("-");
    const from = Number(parts[0]);
    const to = Number(parts[1] ?? parts[0]);

    if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) continue;
    ranges.push([from, to]);
  }

  return ranges.length > 0 ? ranges : null;
}

/** true si el CP cae en la zona de entrega propia. */
export function isLocalDelivery(
  postalCode: string,
  ranges: [number, number][] = DEFAULT_LOCAL_RANGES
): boolean {
  const numeric = Number(postalCode);
  if (!Number.isFinite(numeric)) return false;
  return ranges.some(([from, to]) => numeric >= from && numeric <= to);
}

/**
 * Provincia aproximada a partir del CP. Los transportistas suelen pedirla junto
 * con el código postal. Es una aproximación por rangos, suficiente para cotizar.
 */
export function provinceFromPostalCode(postalCode: string): string {
  const n = Number(postalCode);

  if (n >= 1000 && n <= 1499) return "CABA";
  if (n >= 1500 && n <= 1999) return "Buenos Aires";
  if (n >= 2000 && n <= 2299) return "Santa Fe";
  if (n >= 2300 && n <= 2499) return "Santa Fe";
  if (n >= 2500 && n <= 2699) return "Córdoba";
  if (n >= 2700 && n <= 2999) return "Buenos Aires";
  if (n >= 3000 && n <= 3299) return "Santa Fe";
  if (n >= 3300 && n <= 3399) return "Misiones";
  if (n >= 3400 && n <= 3499) return "Corrientes";
  if (n >= 3500 && n <= 3699) return "Chaco";
  if (n >= 3700 && n <= 3799) return "Chaco";
  if (n >= 3800 && n <= 3899) return "Formosa";
  if (n >= 4000 && n <= 4199) return "Tucumán";
  if (n >= 4200 && n <= 4399) return "Santiago del Estero";
  if (n >= 4400 && n <= 4599) return "Salta";
  if (n >= 4600 && n <= 4699) return "Jujuy";
  if (n >= 4700 && n <= 4799) return "Catamarca";
  if (n >= 5000 && n <= 5299) return "Córdoba";
  if (n >= 5300 && n <= 5399) return "La Rioja";
  if (n >= 5400 && n <= 5499) return "San Juan";
  if (n >= 5500 && n <= 5699) return "Mendoza";
  if (n >= 5700 && n <= 5899) return "San Luis";
  if (n >= 6000 && n <= 6499) return "Buenos Aires";
  if (n >= 6500 && n <= 6799) return "Buenos Aires";
  if (n >= 7000 && n <= 7999) return "Buenos Aires";
  if (n >= 8000 && n <= 8499) return "Buenos Aires";
  if (n >= 8500 && n <= 8599) return "Río Negro";
  if (n >= 8600 && n <= 8699) return "Río Negro";
  if (n >= 9000 && n <= 9199) return "Chubut";
  if (n >= 9200 && n <= 9299) return "Santa Cruz";
  if (n >= 9300 && n <= 9399) return "Santa Cruz";
  if (n >= 9400 && n <= 9431) return "Tierra del Fuego";

  return "Buenos Aires";
}
