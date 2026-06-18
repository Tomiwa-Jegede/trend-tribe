// src/components/listings/ListingCardSkeleton.jsx

const ListingCardSkeleton = () => (
  <div className="card overflow-hidden animate-pulse">
    <div className="aspect-[4/3] bg-gray-200" />
    <div className="p-4 flex flex-col gap-3">
      <div className="h-3 bg-gray-200 rounded w-1/3" />
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
      <div className="h-6 bg-gray-200 rounded w-1/2 mt-1" />
      <div className="h-3 bg-gray-200 rounded w-1/2 mt-1" />
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        <div className="w-6 h-6 bg-gray-200 rounded-full" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  </div>
);

export default ListingCardSkeleton;
