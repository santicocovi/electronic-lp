import {
  Smartphone,
  Laptop,
  Tablet,
  Watch,
  Headphones,
  Speaker,
  Monitor,
  Gamepad2,
  Home,
  Cable,
  Camera,
  Keyboard,
  Mouse,
  HardDrive,
  Tv,
  Printer,
  Router,
  BatteryCharging,
  Cpu,
  Package,
  type LucideIcon,
} from "lucide-react";

/**
 * Iconografía de categorías.
 *
 * Reemplaza los emojis que se usaban antes (y que siguen guardados en
 * `Category.icon` de las categorías sembradas). El campo de la base no se borra
 * —para no romper compatibilidad— pero la UI ya no lo lee: resuelve el ícono
 * por slug y, si es una categoría nueva, por palabras clave del nombre.
 *
 * Así una categoría creada desde el panel obtiene un ícono coherente sin que
 * haya que tocar código.
 */

/** Coincidencias exactas por slug, para las categorías conocidas. */
const BY_SLUG: Record<string, LucideIcon> = {
  iphone: Smartphone,
  celulares: Smartphone,
  smartphones: Smartphone,
  macbook: Laptop,
  notebooks: Laptop,
  laptops: Laptop,
  ipad: Tablet,
  tablets: Tablet,
  "apple-watch": Watch,
  smartwatch: Watch,
  relojes: Watch,
  airpods: Headphones,
  auriculares: Headphones,
  parlantes: Speaker,
  monitores: Monitor,
  gaming: Gamepad2,
  consolas: Gamepad2,
  "smart-home": Home,
  domotica: Home,
  accesorios: Cable,
  camaras: Camera,
  fotografia: Camera,
  teclados: Keyboard,
  mouses: Mouse,
  almacenamiento: HardDrive,
  televisores: Tv,
  impresoras: Printer,
  redes: Router,
  cargadores: BatteryCharging,
  componentes: Cpu,
};

/**
 * Palabras clave para categorías nuevas. Se evalúan en orden, así que las
 * más específicas van primero (ej: "smartwatch" antes que "watch").
 */
const BY_KEYWORD: [string, LucideIcon][] = [
  ["iphone", Smartphone],
  ["celular", Smartphone],
  ["telefono", Smartphone],
  ["smartphone", Smartphone],
  ["macbook", Laptop],
  ["notebook", Laptop],
  ["laptop", Laptop],
  ["ipad", Tablet],
  ["tablet", Tablet],
  ["smartwatch", Watch],
  ["reloj", Watch],
  ["watch", Watch],
  ["airpod", Headphones],
  ["auricular", Headphones],
  ["headphone", Headphones],
  ["parlante", Speaker],
  ["speaker", Speaker],
  ["monitor", Monitor],
  ["televisor", Tv],
  ["tv", Tv],
  ["gaming", Gamepad2],
  ["consola", Gamepad2],
  ["joystick", Gamepad2],
  ["hogar", Home],
  ["home", Home],
  ["camara", Camera],
  ["foto", Camera],
  ["teclado", Keyboard],
  ["mouse", Mouse],
  ["disco", HardDrive],
  ["ssd", HardDrive],
  ["almacenamiento", HardDrive],
  ["impresora", Printer],
  ["red", Router],
  ["router", Router],
  ["cargador", BatteryCharging],
  ["bateria", BatteryCharging],
  ["componente", Cpu],
  ["procesador", Cpu],
  ["placa", Cpu],
  ["accesorio", Cable],
  ["cable", Cable],
];

/** Normaliza para comparar sin acentos ni mayúsculas. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Devuelve el ícono de una categoría. Nunca falla: si no hay coincidencia,
 * usa un ícono genérico de paquete.
 */
export function getCategoryIcon(slug: string, name?: string): LucideIcon {
  const normalizedSlug = normalize(slug);
  if (BY_SLUG[normalizedSlug]) return BY_SLUG[normalizedSlug];

  const haystack = `${normalizedSlug} ${normalize(name ?? "")}`;
  for (const [keyword, icon] of BY_KEYWORD) {
    if (haystack.includes(keyword)) return icon;
  }

  return Package;
}
