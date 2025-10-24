"use client";

import Image from "next/image";
import { memo, useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { RestaurantSearchResult } from "@/features/restaurant/lib/dto";

type RestaurantSearchResultItemProps = {
  result: RestaurantSearchResult;
  onReview: (result: RestaurantSearchResult) => void;
};

const createPlaceholderImageUrl = (seedSource: string) => {
  const seed = encodeURIComponent(seedSource);
  return `https://picsum.photos/seed/${seed}/80/80`;
};

export const RestaurantSearchResultItem = memo(
  ({ result, onReview }: RestaurantSearchResultItemProps) => {
    const placeholderImage = useMemo(() => {
      const seed = result.naverPlaceId ?? result.name;
      return createPlaceholderImageUrl(seed);
    }, [result.name, result.naverPlaceId]);

    return (
      <article className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <Image
          src={placeholderImage}
          alt={`${result.name} placeholder`}
          width={80}
          height={80}
          className="h-20 w-20 rounded-lg object-cover"
          priority={false}
        />
        <div className="flex-1 space-y-2">
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
          className="shrink-0"
        >
          리뷰 작성
        </Button>
      </article>
    );
  },
);

RestaurantSearchResultItem.displayName = "RestaurantSearchResultItem";
