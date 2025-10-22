"use client";

type MapErrorFallbackProps = {
  title: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
};

export const MapErrorFallback = ({
  title,
  description,
  retryLabel = "다시 시도",
  onRetry,
}: MapErrorFallbackProps) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/90 px-6 text-center text-slate-700 backdrop-blur-md">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {typeof onRetry === "function" ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
};
