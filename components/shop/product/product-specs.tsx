import type { ProductSpecType } from "@/types";

interface ProductSpecsProps {
  specs: ProductSpecType[];
}

export function ProductSpecs({ specs }: ProductSpecsProps) {
  const groups = specs.reduce<Record<string, ProductSpecType[]>>((acc, s) => {
    if (!acc[s.group]) acc[s.group] = [];
    acc[s.group].push(s);
    return acc;
  }, {});

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-8">Especificaciones técnicas</h2>
      <div className="space-y-8">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{group}</h3>
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
              {items.map((spec) => (
                <div key={spec.id} className="flex px-5 py-3 odd:bg-gray-50/50">
                  <span className="w-1/3 text-sm font-medium text-gray-500">{spec.label}</span>
                  <span className="flex-1 text-sm text-gray-900">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
