"use client";

type MarkerTooltipData = {
  name: string;
  category: string | null;
  reviewCount: number;
  averageRating: number | null;
};

type MarkerTooltipProps = {
  data: MarkerTooltipData;
  position: { x: number; y: number };
  isLoading?: boolean;
};

export const MarkerTooltip = ({
  data,
  position,
  isLoading,
}: MarkerTooltipProps) => {
  const { name, category, reviewCount, averageRating } = data;

  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -100%) translateY(-12px)",
      }}
    >
      <div className="relative rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-xl shadow-black/10 animate-in fade-in-0 zoom-in-95 duration-150">
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-slate-600" />
            정보를 불러오는 중입니다...
          </div>
        ) : (
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900">{name}</h3>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              {averageRating !== null ? (
                <span className="flex items-center gap-1 font-medium text-yellow-500">
                  <span aria-hidden>⭐</span>
                  {averageRating.toFixed(1)}
                </span>
              ) : (
                <span className="text-slate-400">평점 정보 없음</span>
              )}
              <span className="text-slate-500">{reviewCount}개의 리뷰</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {category ?? "카테고리 정보 없음"}
            </p>
          </div>
        )}
        <span className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 border-b border-r border-slate-200 bg-white" />
      </div>
    </div>
  );
};
