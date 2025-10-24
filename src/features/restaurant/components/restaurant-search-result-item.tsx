"use client";

import { memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCreateRestaurant } from "@/features/restaurant/hooks/useCreateRestaurant";
import type { RestaurantSearchResult } from "@/features/restaurant/lib/dto";
import { useToast } from "@/hooks/use-toast";
import { normalizeWhitespace } from "@/lib/string-utils";

type RestaurantSearchResultItemProps = {
  result: RestaurantSearchResult;
  onClose: () => void;
};

export const RestaurantSearchResultItem = memo(
  ({ result, onClose }: RestaurantSearchResultItemProps) => {
    const router = useRouter();
    const { toast } = useToast();
    const createRestaurantMutation = useCreateRestaurant();

    const handleReviewButtonClick = useCallback(async () => {
      const name = normalizeWhitespace(result.name);
      const address = normalizeWhitespace(result.address);

      if (!name || !address) {
        toast({
          variant: "destructive",
          title: "음식점 정보를 확인할 수 없습니다.",
          description: "음식점 이름과 주소가 필요합니다.",
        });
        return;
      }

      if (result.restaurantId) {
        onClose();
        router.push(`/review/create?restaurantId=${result.restaurantId}`);
        return;
      }

      if (
        result.latitude === null ||
        result.longitude === null ||
        !Number.isFinite(result.latitude) ||
        !Number.isFinite(result.longitude)
      ) {
        toast({
          variant: "destructive",
          title: "좌표 정보가 필요합니다.",
          description: "해당 음식점의 위치 정보가 없어 리뷰를 작성할 수 없습니다.",
        });
        return;
      }

      try {
        const categoryValue = result.category
          ? normalizeWhitespace(result.category)
          : null;
        const normalizedCategory =
          categoryValue && categoryValue.length > 0 ? categoryValue : null;

        const response = await createRestaurantMutation.mutateAsync({
          name,
          address,
          category: normalizedCategory,
          latitude: Number(result.latitude),
          longitude: Number(result.longitude),
          naverPlaceId: result.naverPlaceId ?? null,
        });

        onClose();
        router.push(`/review/create?restaurantId=${response.id}`);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "음식점 저장 실패",
          description:
            error instanceof Error
              ? error.message
              : "음식점 정보를 저장하지 못했습니다.",
        });
      }
    }, [createRestaurantMutation, onClose, result, router, toast]);

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
          onClick={handleReviewButtonClick}
          className="shrink-0 self-start sm:self-auto"
          disabled={createRestaurantMutation.isPending}
        >
          {createRestaurantMutation.isPending ? "처리 중..." : "리뷰 작성"}
        </Button>
      </article>
    );
  },
);

RestaurantSearchResultItem.displayName = "RestaurantSearchResultItem";
