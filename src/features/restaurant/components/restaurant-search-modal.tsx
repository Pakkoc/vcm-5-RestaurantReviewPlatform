"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RestaurantSearchResultItem } from "@/features/restaurant/components/restaurant-search-result-item";
import type { RestaurantSearchResult } from "@/features/restaurant/lib/dto";

type RestaurantSearchModalProps = {
  isOpen: boolean;
  keyword: string;
  results: RestaurantSearchResult[];
  state: "idle" | "loading" | "success" | "error";
  errorMessage?: string | null;
  onClose: () => void;
  onRetry: () => void;
};

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-600">
    <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
    <p className="text-sm font-medium">검색 중입니다...</p>
  </div>
);

const EmptyState = ({ keyword }: { keyword: string }) => {
  const suggestion = keyword
    ? `${keyword} 키워드를 더 구체적으로 활용해 보세요.`
    : "다른 키워드를 입력해 보세요.";

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-600">
      <p className="text-base font-semibold">검색 결과가 없습니다.</p>
      <p className="text-sm text-slate-500">{suggestion}</p>
    </div>
  );
};

const ErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className="flex flex-col items-center justify-center gap-4 py-16 text-center text-slate-600">
    <div className="space-y-2">
      <p className="text-base font-semibold">검색 중 오류가 발생했습니다.</p>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
    <Button type="button" onClick={onRetry}>
      다시 시도
    </Button>
  </div>
);

export const RestaurantSearchModal = ({
  isOpen,
  keyword,
  results,
  state,
  errorMessage,
  onClose,
  onRetry,
}: RestaurantSearchModalProps) => {
  const description = (() => {
    if (state === "loading") {
      return "검색 결과를 불러오는 중입니다.";
    }

    if (state === "error") {
      return "네이버 검색 요청이 실패했습니다. 다시 시도해 주세요.";
    }

    if (state === "success") {
      return `총 ${results.length}개의 음식점을 찾았습니다. 원하는 음식점에서 리뷰를 작성해 보세요.`;
    }

    return "최근 검색 결과가 여기에 표시됩니다.";
  })();

  const renderContent = () => {
    if (state === "loading") {
      return <LoadingState />;
    }

    if (state === "error") {
      return (
        <ErrorState
          message={errorMessage ?? "잠시 후 다시 시도해 주세요."}
          onRetry={onRetry}
        />
      );
    }

    if (results.length === 0) {
      return <EmptyState keyword={keyword} />;
    }

    return (
      <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: "420px" }}>
        {results.map((result, index) => (
          <RestaurantSearchResultItem
            key={`${result.restaurantId ?? result.naverPlaceId ?? result.name}-${index}`}
            result={result}
            onClose={onClose}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {keyword ? `${keyword} 검색 결과` : "검색 결과"}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
