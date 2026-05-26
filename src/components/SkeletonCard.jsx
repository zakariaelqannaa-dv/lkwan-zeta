const SkeletonCard = () => {
  return (
    <div className="px-4 py-2.5 border-b border-[#2f3336] animate-pulse">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-[#16181c] flex-shrink-0"></div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 bg-[#16181c] rounded"></div>
            <div className="h-3 w-16 bg-[#16181c] rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-[#16181c] rounded"></div>
            <div className="h-4 w-3/4 bg-[#16181c] rounded"></div>
          </div>
          <div className="flex gap-4 pt-1">
            <div className="h-4 w-10 bg-[#16181c] rounded"></div>
            <div className="h-4 w-10 bg-[#16181c] rounded"></div>
            <div className="h-4 w-10 bg-[#16181c] rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;
