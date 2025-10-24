"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewForm } from "@/features/review/components/review-form";
import { useCreateReview } from "@/features/review/hooks/useCreateReview";
import { useReviewForm } from "@/features/review/hooks/useReviewForm";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRestaurantDetail } from "@/features/restaurant/hooks/useRestaurantDetail";
import type { ReviewFormData } from "@/features/review/lib/validation";

type ReviewCreatePageProps = {
  params: Promise<Record<string, never>>;
  searchParams?: Promise<Record<string, string | string[]>>;
};

const PLACEHOLDER_IMAGE = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/360`;

export default function ReviewCreatePage({
  params,
  searchParams,
}: ReviewCreatePageProps) {
  void params;
  void searchParams;

  const router = useRouter();
  const query = useSearchParams();
  const restaurantId = query.get("restaurantId") ?? "";

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (!restaurantId) {
      router.replace("/");
    }
  }, [restaurantId, router]);

  const { data: restaurant, isLoading, isError, error } = useRestaurantDetail(
    restaurantId,
    {
      enabled: Boolean(restaurantId),
    },
  );

  const {
    form,
    hasDirtyValue,
  } = useReviewForm();

  const createReviewMutation = useCreateReview(restaurantId, {
    onSuccess: (response) => {
      setShowConfirmDialog(false);
      // 리뷰 작성 페이지를 히스토리에서 대체하여,
      // 상세 페이지에서 뒤로가기 시 홈으로 이동되도록 처리
      router.replace(`/restaurant/${response.restaurantId}`);
    },
  });

  const handleSubmit = async (data: ReviewFormData) => {
    await createReviewMutation.mutateAsync({
      author_name: data.authorName.trim(),
      rating: data.rating,
      content: data.content.trim(),
      password: data.password,
    });
  };

  const handleBack = () => {
    if (createReviewMutation.isPending) {
      return;
    }

    if (hasDirtyValue) {
      setShowConfirmDialog(true);
      return;
    }

    router.back();
  };

  const handleConfirmLeave = () => {
    setShowConfirmDialog(false);
    router.back();
  };

  const restaurantImageSeed = useMemo(() => {
    if (!restaurant) {
      return "restaurant";
    }
    return restaurant.id.slice(0, 12);
  }, [restaurant]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            className="px-2"
            onClick={handleBack}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            뒤로가기
          </Button>
          <h1 className="text-xl font-semibold text-slate-900">리뷰 작성</h1>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isLoading
              ? "음식점 정보를 불러오는 중입니다..."
              : restaurant
              ? restaurant.name
              : "음식점 정보를 확인할 수 없습니다."}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isError ? (
            <div className="rounded-lg border border-dashed border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error instanceof Error
                ? error.message
                : "음식점 정보를 불러올 수 없습니다."}
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-lg">
                <Image
                  src={PLACEHOLDER_IMAGE(restaurantImageSeed)}
                  alt={restaurant?.name ?? "선택한 음식점"}
                  width={640}
                  height={360}
                  className="h-auto w-full object-cover"
                  priority
                />
              </div>
              {restaurant ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <dl className="space-y-2">
                    <div>
                      <dt className="font-medium text-slate-500">주소</dt>
                      <dd className="text-slate-700">{restaurant.address}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-500">카테고리</dt>
                      <dd className="text-slate-700">
                        {restaurant.category ?? "카테고리 정보 없음"}
                      </dd>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-500">
                        리뷰 통계
                      </span>
                      <span className="text-slate-600">
                        ⭐{" "}
                        {restaurant.averageRating !== null
                          ? restaurant.averageRating.toFixed(1)
                          : "아직 평점 없음"}
                      </span>
                      <span className="text-slate-600">
                        {restaurant.reviewCount}개의 리뷰
                      </span>
                    </div>
                  </dl>
                </div>
              ) : null}
            </>
          )}

          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              리뷰 작성
            </h2>
            <ReviewForm
              form={form}
              onSubmit={handleSubmit}
              isSubmitting={createReviewMutation.isPending}
            />
          </section>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showConfirmDialog}
        title="페이지를 나가시겠습니까?"
        description="작성 중인 내용은 저장되지 않습니다."
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleConfirmLeave}
      />
    </main>
  );
}

