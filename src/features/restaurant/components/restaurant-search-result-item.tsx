"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import type { RestaurantSearchResult } from "@/features/restaurant/lib/dto";

type RestaurantSearchResultItemProps = {
  result: RestaurantSearchResult;
  onReview: (result: RestaurantSearchResult) => void;
};

export const RestaurantSearchResultItem = memo(
  ({ result, onReview }: RestaurantSearchResultItemProps) => {
    return (
      <article className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {result.name}
            </h3>
            <p className="text-sm text-slate-500">{result.address}</p>
            <p className="mt-1 text-xs font-medium text-slate-400">
              {result.category ?? "카테고리 정보 없음"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            {result.latitude !== null && result.longitude !== null ? (
              <span>
                위도 {result.latitude}, 경도 {result.longitude}
              </span>
            ) : (
              <span>좌표 정보 없음</span>
            )}
          </div>
        </div>
        <Button
          type="button"
          onClick={() => onReview(result)}
          className="shrink-0 self-start sm:self-auto"
        >
          리뷰 작성
        </Button>
      </article>
    );
  },
);

RestaurantSearchResultItem.displayName = "RestaurantSearchResultItem";
