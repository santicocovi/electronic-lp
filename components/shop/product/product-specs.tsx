import type { ProductSpecType } from "@/types";

/**
 * Especificaciones técnicas.
 * Tabla de definiciones limpia, sin bordes duros ni rayado alterno: separadores
 * finos y etiquetas en gris para que el valor sea lo que resalta.
 */

interface ProductSpecsProps {
  specs: ProductSpecType[];
}

export function ProductSpecs({ specs }: ProductSpecsProps) {
  const groups = specs.reduce<Record<string, ProductSpecType[]>>((acc, s) => {
    (acc[s.group] ??= []).push(s);
    return acc;
  }, {});

  const groupNames = Object.keys(groups);
  if (groupNames.length === 0) return null;

  return (
    <section aria-labelledby="specs-heading">
      <h2
        id="specs-heading"
        className="text-[28px] font-semibold tracking-[-0.02em] text-gray-900 sm:text-[32px]"
      >
        Especificaciones
      </h2>

      <div className="mt-10 grid grid-cols-1 gap-x-16 gap-y-12 lg:grid-cols-2">
        {groupNames.map((group) => (
          <div key={group}>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-gray-400">
              {group}
            </h3>

            <dl className="mt-4">
              {groups[group].map((spec) => (
                <div
                  key={spec.id}
                  className="flex gap-6 border-b border-gray-100 py-3.5 last:border-b-0"
                >
                  <dt className="w-2/5 shrink-0 text-[14px] text-gray-500">{spec.label}</dt>
                  <dd className="flex-1 text-[14px] font-medium text-gray-900">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
