import { cn } from "@/lib/utils";
import { resolveProductFamily, type ProductFamily } from "@/lib/product-families";

/**
 * Ilustración por familia de producto.
 *
 * Reemplaza al placeholder genérico (y al emoji que se usaba antes) cuando un
 * producto todavía no tiene fotografía cargada. Cada familia —MacBook, iPhone,
 * iPad, Apple Watch, AirPods, consolas, monitores, notebooks, accesorios…—
 * tiene su propia composición.
 *
 * Criterio gráfico, alineado con el resto del sitio:
 *   · trazo fino y uniforme, sin relleno saturado;
 *   · paleta neutra con un único acento (azul de marca) reservado a la pantalla;
 *   · una sombra elíptica muy suave que apoya el objeto sobre el plano;
 *   · viewBox 0 0 200 200, así todas ocupan lo mismo y la grilla no salta.
 *
 * Es un Server Component sin estado: son SVG inline, no pesan una request extra
 * ni provocan layout shift, y escalan sin pérdida en cualquier tamaño.
 */

const STROKE = "#94A3B8";
const STROKE_STRONG = "#64748B";
const SURFACE = "#F8FAFC";

interface ProductIllustrationProps {
  /** Familia explícita. Si no se pasa, se deriva de los datos del producto. */
  family?: ProductFamily;
  productName?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  className?: string;
  /** Texto accesible. Si se omite, la ilustración queda como decorativa. */
  label?: string;
}

export function ProductIllustration({
  family,
  productName,
  categorySlug,
  categoryName,
  className,
  label,
}: ProductIllustrationProps) {
  const resolved =
    family ?? resolveProductFamily({ productName, categorySlug, categoryName });

  // Los ids de los gradientes se prefijan con la familia: si hay varias
  // ilustraciones en la misma página, sus defs no se pisan entre sí.
  const screenId = `elp-screen-${resolved}`;
  const bodyId = `elp-body-${resolved}`;

  return (
    <svg
      viewBox="0 0 200 200"
      className={cn("h-full w-full", className)}
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={screenId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#DBEAFE" />
          <stop offset="100%" stopColor="#BFDBFE" />
        </linearGradient>
        <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EEF2F7" />
        </linearGradient>
      </defs>

      {/* Sombra de apoyo: da profundidad sin recurrir a un blur costoso. */}
      <ellipse cx="100" cy="178" rx="52" ry="5.5" fill="#0F172A" opacity="0.07" />

      <g
        fill="none"
        stroke={STROKE}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Drawing family={resolved} screenId={screenId} bodyId={bodyId} />
      </g>
    </svg>
  );
}

interface DrawingProps {
  family: ProductFamily;
  screenId: string;
  bodyId: string;
}

function Drawing({ family, screenId, bodyId }: DrawingProps) {
  const screen = `url(#${screenId})`;
  const body = `url(#${bodyId})`;

  switch (family) {
    // ── Portátiles ──────────────────────────────────────────
    case "macbook":
      return (
        <>
          <rect x="42" y="52" width="116" height="76" rx="7" fill={body} stroke={STROKE_STRONG} />
          <rect x="50" y="60" width="100" height="60" rx="3" fill={screen} stroke="none" />
          <path d="M26 138h148l-7 12a6 6 0 0 1-5 3H38a6 6 0 0 1-5-3z" fill={body} stroke={STROKE_STRONG} />
          <path d="M88 138h24" stroke={STROKE_STRONG} />
        </>
      );

    case "notebook":
      return (
        <>
          <rect x="40" y="48" width="120" height="80" rx="6" fill={body} stroke={STROKE_STRONG} />
          <rect x="48" y="56" width="104" height="60" rx="2" fill={screen} stroke="none" />
          <circle cx="100" cy="122" r="1.8" fill={STROKE} stroke="none" />
          <rect x="28" y="136" width="144" height="14" rx="5" fill={body} stroke={STROKE_STRONG} />
          <path d="M84 143h32" stroke={STROKE} />
        </>
      );

    // ── Teléfonos ───────────────────────────────────────────
    case "iphone":
      return (
        <>
          <rect x="66" y="30" width="68" height="136" rx="16" fill={body} stroke={STROKE_STRONG} />
          <rect x="73" y="37" width="54" height="122" rx="11" fill={screen} stroke="none" />
          {/* Isla dinámica */}
          <rect x="90" y="43" width="20" height="6" rx="3" fill={STROKE_STRONG} stroke="none" />
          <path d="M134 62v16M134 86v12" stroke={STROKE} />
        </>
      );

    case "smartphone":
      return (
        <>
          <rect x="68" y="28" width="64" height="140" rx="13" fill={body} stroke={STROKE_STRONG} />
          <rect x="75" y="44" width="50" height="112" rx="6" fill={screen} stroke="none" />
          <circle cx="100" cy="36" r="2.2" fill={STROKE_STRONG} stroke="none" />
          <path d="M132 60v14" stroke={STROKE} />
        </>
      );

    // ── Tabletas ────────────────────────────────────────────
    case "ipad":
      return (
        <>
          <rect x="48" y="26" width="104" height="148" rx="12" fill={body} stroke={STROKE_STRONG} />
          <rect x="56" y="34" width="88" height="132" rx="5" fill={screen} stroke="none" />
          <circle cx="100" cy="30" r="1.6" fill={STROKE_STRONG} stroke="none" />
          {/* Lápiz apoyado al costado */}
          <path d="M164 44v92" stroke={STROKE} strokeWidth="5" />
          <path d="M164 136l-3 8 3 6 3-6z" fill={STROKE} stroke="none" />
        </>
      );

    case "tablet":
      return (
        <>
          <rect x="46" y="30" width="108" height="140" rx="10" fill={body} stroke={STROKE_STRONG} />
          <rect x="56" y="44" width="88" height="112" rx="4" fill={screen} stroke="none" />
          <circle cx="100" cy="37" r="2" fill={STROKE_STRONG} stroke="none" />
          <circle cx="100" cy="163" r="4.5" stroke={STROKE} />
        </>
      );

    // ── Vestibles ───────────────────────────────────────────
    case "watch":
      return (
        <>
          <path d="M78 62l4-22a8 8 0 0 1 8-7h20a8 8 0 0 1 8 7l4 22" fill={body} stroke={STROKE_STRONG} />
          <path d="M78 138l4 22a8 8 0 0 0 8 7h20a8 8 0 0 0 8-7l4-22" fill={body} stroke={STROKE_STRONG} />
          <rect x="70" y="58" width="60" height="84" rx="18" fill={body} stroke={STROKE_STRONG} />
          <rect x="78" y="66" width="44" height="68" rx="13" fill={screen} stroke="none" />
          <path d="M130 88v14" stroke={STROKE_STRONG} strokeWidth="5" />
        </>
      );

    // ── Audio ───────────────────────────────────────────────
    case "airpods":
      return (
        <>
          {/* Estuche de carga */}
          <rect x="58" y="104" width="84" height="60" rx="16" fill={body} stroke={STROKE_STRONG} />
          <path d="M58 124h84" stroke={STROKE} />
          <circle cx="100" cy="152" r="3" fill={STROKE} stroke="none" />
          {/* Auriculares */}
          <path d="M78 46a11 11 0 0 1 22 0v10a11 11 0 0 1-22 0z" fill={body} stroke={STROKE_STRONG} />
          <path d="M89 66v28" stroke={STROKE_STRONG} strokeWidth="6" />
          <path d="M100 46a11 11 0 0 1 22 0v10a11 11 0 0 1-22 0z" fill={body} stroke={STROKE_STRONG} />
          <path d="M111 66v28" stroke={STROKE_STRONG} strokeWidth="6" />
        </>
      );

    case "headphones":
      return (
        <>
          <path d="M46 118V98a54 54 0 0 1 108 0v20" fill="none" stroke={STROKE_STRONG} />
          <rect x="32" y="108" width="30" height="52" rx="13" fill={body} stroke={STROKE_STRONG} />
          <rect x="138" y="108" width="30" height="52" rx="13" fill={body} stroke={STROKE_STRONG} />
          <rect x="40" y="118" width="14" height="32" rx="7" fill={screen} stroke="none" />
          <rect x="146" y="118" width="14" height="32" rx="7" fill={screen} stroke="none" />
        </>
      );

    case "speaker":
      return (
        <>
          <rect x="62" y="36" width="76" height="128" rx="24" fill={body} stroke={STROKE_STRONG} />
          <circle cx="100" cy="76" r="18" stroke={STROKE} />
          <circle cx="100" cy="76" r="6" fill={STROKE} stroke="none" />
          <circle cx="100" cy="128" r="24" stroke={STROKE} />
          <circle cx="100" cy="128" r="8" fill={STROKE} stroke="none" />
        </>
      );

    // ── Pantallas ───────────────────────────────────────────
    case "monitor":
      return (
        <>
          <rect x="26" y="44" width="148" height="92" rx="7" fill={body} stroke={STROKE_STRONG} />
          <rect x="34" y="52" width="132" height="72" rx="3" fill={screen} stroke="none" />
          <path d="M100 136v20" stroke={STROKE_STRONG} strokeWidth="7" />
          <path d="M70 162h60" stroke={STROKE_STRONG} strokeWidth="6" />
        </>
      );

    case "tv":
      return (
        <>
          <rect x="18" y="44" width="164" height="98" rx="6" fill={body} stroke={STROKE_STRONG} />
          <rect x="25" y="51" width="150" height="84" rx="2" fill={screen} stroke="none" />
          <path d="M62 164l16-22M138 164l-16-22" stroke={STROKE_STRONG} />
        </>
      );

    // ── Gaming ──────────────────────────────────────────────
    case "console":
      return (
        <>
          <path
            d="M62 72h76a30 30 0 0 1 29 22l10 38a17 17 0 0 1-30 15l-16-19H69l-16 19a17 17 0 0 1-30-15l10-38a30 30 0 0 1 29-22z"
            fill={body}
            stroke={STROKE_STRONG}
          />
          <path d="M62 104h20M72 94v20" stroke={STROKE_STRONG} />
          <circle cx="127" cy="96" r="5" fill={screen} stroke={STROKE} strokeWidth="1.6" />
          <circle cx="143" cy="110" r="5" fill={screen} stroke={STROKE} strokeWidth="1.6" />
          <circle cx="127" cy="124" r="5" fill={screen} stroke={STROKE} strokeWidth="1.6" />
          <circle cx="111" cy="110" r="5" fill={screen} stroke={STROKE} strokeWidth="1.6" />
        </>
      );

    // ── Foto ────────────────────────────────────────────────
    case "camera":
      return (
        <>
          <path d="M30 66h32l10-14h56l10 14h32a8 8 0 0 1 8 8v70a8 8 0 0 1-8 8H30a8 8 0 0 1-8-8V74a8 8 0 0 1 8-8z" fill={body} stroke={STROKE_STRONG} />
          <circle cx="100" cy="112" r="30" fill={screen} stroke={STROKE_STRONG} />
          <circle cx="100" cy="112" r="14" stroke={STROKE} />
          <circle cx="150" cy="82" r="3.5" fill={STROKE} stroke="none" />
        </>
      );

    // ── Periféricos ─────────────────────────────────────────
    case "keyboard":
      return (
        <>
          <rect x="18" y="66" width="164" height="72" rx="10" fill={body} stroke={STROKE_STRONG} />
          {[82, 100, 118].map((y) =>
            [34, 56, 78, 100, 122, 144].map((x) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="14" height="10" rx="2.5" fill={screen} stroke="none" />
            ))
          )}
          <rect x="70" y="118" width="66" height="10" rx="2.5" fill={screen} stroke="none" />
        </>
      );

    case "mouse":
      return (
        <>
          <path d="M100 32a42 42 0 0 1 42 42v50a42 42 0 0 1-84 0V74a42 42 0 0 1 42-42z" fill={body} stroke={STROKE_STRONG} />
          <path d="M100 34v42" stroke={STROKE} />
          <path d="M58 76h84" stroke={STROKE} />
          <rect x="95" y="50" width="10" height="20" rx="5" fill={screen} stroke={STROKE} strokeWidth="1.6" />
        </>
      );

    // ── Almacenamiento y redes ──────────────────────────────
    case "storage":
      return (
        <>
          <rect x="34" y="62" width="132" height="80" rx="9" fill={body} stroke={STROKE_STRONG} />
          <rect x="46" y="74" width="76" height="56" rx="4" fill={screen} stroke="none" />
          <circle cx="146" cy="86" r="4" fill={STROKE} stroke="none" />
          <path d="M138 108h18M138 120h18" stroke={STROKE} />
        </>
      );

    case "router":
      return (
        <>
          <path d="M74 44l14 26M126 44l-14 26" stroke={STROKE_STRONG} />
          <circle cx="74" cy="40" r="5" fill={body} stroke={STROKE_STRONG} />
          <circle cx="126" cy="40" r="5" fill={body} stroke={STROKE_STRONG} />
          <rect x="38" y="70" width="124" height="52" rx="12" fill={body} stroke={STROKE_STRONG} />
          <circle cx="62" cy="96" r="4" fill={screen} stroke={STROKE} strokeWidth="1.6" />
          <circle cx="80" cy="96" r="4" fill={screen} stroke={STROKE} strokeWidth="1.6" />
          <path d="M76 146a34 34 0 0 1 48 0" stroke={STROKE} />
          <path d="M88 160a17 17 0 0 1 24 0" stroke={STROKE} />
        </>
      );

    case "printer":
      return (
        <>
          <rect x="60" y="30" width="80" height="40" rx="4" fill={body} stroke={STROKE_STRONG} />
          <rect x="34" y="70" width="132" height="56" rx="10" fill={body} stroke={STROKE_STRONG} />
          <circle cx="146" cy="86" r="4" fill={screen} stroke={STROKE} strokeWidth="1.6" />
          <rect x="60" y="118" width="80" height="46" rx="4" fill={SURFACE} stroke={STROKE_STRONG} />
          <path d="M76 134h48M76 148h32" stroke={STROKE} />
        </>
      );

    // ── Energía y componentes ───────────────────────────────
    case "charger":
      return (
        <>
          <rect x="58" y="52" width="84" height="84" rx="18" fill={body} stroke={STROKE_STRONG} />
          <path d="M84 40v12M116 40v12" stroke={STROKE_STRONG} strokeWidth="6" />
          <path d="M100 74l-12 22h12l-4 18 16-24h-12z" fill={screen} stroke={STROKE} strokeWidth="1.6" />
          <path d="M100 136v16a14 14 0 0 0 14 14h20" stroke={STROKE} />
        </>
      );

    case "component":
      return (
        <>
          <rect x="56" y="56" width="88" height="88" rx="10" fill={body} stroke={STROKE_STRONG} />
          <rect x="76" y="76" width="48" height="48" rx="5" fill={screen} stroke={STROKE} strokeWidth="1.6" />
          {[74, 92, 110, 128].map((v) => (
            <g key={v}>
              <path d={`M${v} 44v12`} stroke={STROKE} />
              <path d={`M${v} 144v12`} stroke={STROKE} />
              <path d={`M44 ${v}h12`} stroke={STROKE} />
              <path d={`M144 ${v}h12`} stroke={STROKE} />
            </g>
          ))}
        </>
      );

    // ── Hogar ───────────────────────────────────────────────
    case "smarthome":
      return (
        <>
          <path d="M40 96l60-46 60 46" stroke={STROKE_STRONG} />
          <path d="M54 88v58a6 6 0 0 0 6 6h80a6 6 0 0 0 6-6V88" fill={body} stroke={STROKE_STRONG} />
          <rect x="86" y="112" width="28" height="40" rx="3" fill={screen} stroke={STROKE} strokeWidth="1.6" />
          <path d="M86 74a20 20 0 0 1 28 0" stroke={STROKE} />
        </>
      );

    // ── Accesorios ──────────────────────────────────────────
    case "accessory":
      return (
        <>
          <rect x="76" y="30" width="18" height="30" rx="5" fill={body} stroke={STROKE_STRONG} />
          <path d="M85 60c0 34-46 24-46 54s46 22 46 52" stroke={STROKE_STRONG} />
          <rect x="112" y="140" width="18" height="28" rx="5" fill={body} stroke={STROKE_STRONG} />
          <path d="M121 140c0-32 42-22 42-50s-42-22-42-52" stroke={STROKE} />
          <rect x="112" y="24" width="18" height="14" rx="4" fill={screen} stroke={STROKE} strokeWidth="1.6" />
        </>
      );

    // ── Genérico ────────────────────────────────────────────
    default:
      return (
        <>
          <path d="M100 36l60 30v68l-60 30-60-30V66z" fill={body} stroke={STROKE_STRONG} />
          <path d="M40 66l60 30 60-30" stroke={STROKE} />
          <path d="M100 96v68" stroke={STROKE} />
          <path d="M70 51l60 30" stroke={STROKE} />
        </>
      );
  }
}
