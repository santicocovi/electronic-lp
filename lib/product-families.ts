/**
 * Familias de producto.
 *
 * Cada producto pertenece a una familia (MacBook, iPhone, iPad, Watch, AirPods,
 * consolas, monitores, notebooks, accesorios…). La familia decide qué
 * ilustración se dibuja cuando el producto todavía no tiene fotografía cargada,
 * en lugar del antiguo placeholder genérico —y del emoji que se usaba antes—.
 *
 * La resolución es puramente derivada: no hay una columna nueva en la base ni
 * nada que el administrador tenga que completar. Se mira, en orden:
 *   1. el slug de la categoría (coincidencia exacta, lo más confiable);
 *   2. palabras clave en el nombre del producto;
 *   3. palabras clave en el nombre de la categoría.
 *
 * Si nada coincide se devuelve `generic`, que igual dibuja una composición
 * cuidada. Nunca falla ni deja un hueco vacío.
 */

export type ProductFamily =
  | "macbook"
  | "notebook"
  | "iphone"
  | "smartphone"
  | "ipad"
  | "tablet"
  | "watch"
  | "airpods"
  | "headphones"
  | "speaker"
  | "monitor"
  | "tv"
  | "console"
  | "camera"
  | "keyboard"
  | "mouse"
  | "storage"
  | "printer"
  | "router"
  | "charger"
  | "component"
  | "smarthome"
  | "accessory"
  | "generic";

/** Normaliza para comparar sin acentos, mayúsculas ni signos. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Coincidencias exactas por slug de categoría. */
const BY_CATEGORY_SLUG: Record<string, ProductFamily> = {
  macbook: "macbook",
  notebooks: "notebook",
  laptops: "notebook",
  iphone: "iphone",
  celulares: "smartphone",
  smartphones: "smartphone",
  ipad: "ipad",
  tablets: "tablet",
  "apple-watch": "watch",
  smartwatch: "watch",
  relojes: "watch",
  airpods: "airpods",
  auriculares: "headphones",
  parlantes: "speaker",
  monitores: "monitor",
  televisores: "tv",
  gaming: "console",
  consolas: "console",
  camaras: "camera",
  fotografia: "camera",
  teclados: "keyboard",
  mouses: "mouse",
  almacenamiento: "storage",
  impresoras: "printer",
  redes: "router",
  cargadores: "charger",
  componentes: "component",
  "smart-home": "smarthome",
  domotica: "smarthome",
  accesorios: "accessory",
};

/**
 * Palabras clave, de la más específica a la más general. El orden importa:
 * "macbook" tiene que ganarle a "book", y "smartwatch" a "watch".
 */
const BY_KEYWORD: [string, ProductFamily][] = [
  ["macbook", "macbook"],
  ["imac", "monitor"],
  ["mac mini", "component"],
  ["iphone", "iphone"],
  ["ipad", "ipad"],
  ["apple watch", "watch"],
  ["airpods", "airpods"],
  ["airpod", "airpods"],
  ["playstation", "console"],
  ["nintendo", "console"],
  ["xbox", "console"],
  ["joystick", "console"],
  ["consola", "console"],
  ["notebook", "notebook"],
  ["laptop", "notebook"],
  ["ultrabook", "notebook"],
  ["smartwatch", "watch"],
  ["reloj", "watch"],
  ["watch", "watch"],
  ["auricular", "headphones"],
  ["headphone", "headphones"],
  ["headset", "headphones"],
  ["parlante", "speaker"],
  ["speaker", "speaker"],
  ["soundbar", "speaker"],
  ["monitor", "monitor"],
  ["televisor", "tv"],
  ["smart tv", "tv"],
  ["tablet", "tablet"],
  ["celular", "smartphone"],
  ["telefono", "smartphone"],
  ["smartphone", "smartphone"],
  ["camara", "camera"],
  ["gopro", "camera"],
  ["teclado", "keyboard"],
  ["keyboard", "keyboard"],
  ["mouse", "mouse"],
  ["disco", "storage"],
  ["ssd", "storage"],
  ["pendrive", "storage"],
  ["almacenamiento", "storage"],
  ["impresora", "printer"],
  ["router", "router"],
  ["repetidor", "router"],
  ["cargador", "charger"],
  ["bateria", "charger"],
  ["powerbank", "charger"],
  ["placa de video", "component"],
  ["procesador", "component"],
  ["memoria ram", "component"],
  ["componente", "component"],
  ["domotica", "smarthome"],
  ["smart home", "smarthome"],
  ["cable", "accessory"],
  ["funda", "accessory"],
  ["accesorio", "accessory"],
];

export interface ResolveFamilyInput {
  productName?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
}

/** Devuelve la familia de un producto. Nunca lanza. */
export function resolveProductFamily(input: ResolveFamilyInput): ProductFamily {
  const slug = normalize(input.categorySlug ?? "");
  const exact = BY_CATEGORY_SLUG[slug];
  if (exact) return exact;

  const name = normalize(input.productName ?? "");
  for (const [keyword, family] of BY_KEYWORD) {
    if (name.includes(keyword)) return family;
  }

  const categoryName = normalize(input.categoryName ?? "");
  const haystack = `${slug} ${categoryName}`;
  for (const [keyword, family] of BY_KEYWORD) {
    if (haystack.includes(keyword)) return family;
  }

  return "generic";
}
