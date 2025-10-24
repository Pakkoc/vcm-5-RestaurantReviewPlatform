"use client";

import { useEffect, useMemo, useRef } from "react";
import { ReviewCard } from "@/features/review/components/review-card";
import { useInfiniteReviews } from "@/features/review/hooks/useInfiniteReviews";
import type { Review } from "@/features/review/lib/dto";

type ReviewListProps = {
  restaurantId: string;
  enableActions?: boolean;
  onEdit?: (review: Review) => void;
  onDelete?: (review: Review) => void;
};

export const ReviewList = ({
  restaurantId,
  enableActions,
  onEdit,
  onDelete,
}: ReviewListProps) => {
  const {
    data,
    status,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteReviews(restaurantId);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sentinelRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];

        if (
          firstEntry?.isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage
        ) {
          void fetchNextPage();
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const reviews = useMemo(
    () => data?.pages.flat() ?? [],
    [data?.pages],
  );

  if (status === "pending") {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-slate-500">
        리뷰를 불러오는 중입니다...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-red-500">
        <p>리뷰를 불러오지 못했습니다.</p>
        {error instanceof Error ? (
          <p className="text-xs text-red-400">{error.message}</p>
        ) : null}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
        아직 리뷰가 없습니다. 첫 리뷰를 작성해 보세요!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          showActions={enableActions}
          onEdit={enableActions ? () => onEdit?.(review) : undefined}
          onDelete={enableActions ? () => onDelete?.(review) : undefined}
        />
      ))}

      <div ref={sentinelRef} className="flex items-center justify-center py-4">
        {isFetchingNextPage ? (
          <span className="text-sm text-slate-500">추가로 불러오는 중...</span>
        ) : hasNextPage ? (
          <span className="text-sm text-slate-400">
            아래로 스크롤하면 더 많은 리뷰를 볼 수 있어요.
          </span>
        ) : (
          <span className="text-sm text-slate-400">
            모든 리뷰를 확인했습니다.
          </span>
        )}
      </div>
    </div>
  );
};
