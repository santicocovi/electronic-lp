export function ProductSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="aspect-square bg-gray-100 rounded-2xl" />
      <div className="h-3 bg-gray-100 rounded-full w-1/3" />
      <div className="h-4 bg-gray-100 rounded-full w-4/5" />
      <div className="h-4 bg-gray-100 rounded-full w-2/5" />
    </div>
  );
}
