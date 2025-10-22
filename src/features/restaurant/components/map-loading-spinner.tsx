"use client";

type MapLoadingSpinnerProps = {
  message?: string;
};

export const MapLoadingSpinner = ({
  message = "지도를 불러오는 중입니다.",
}: MapLoadingSpinnerProps) => {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 text-slate-700 backdrop-blur-sm">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
};
