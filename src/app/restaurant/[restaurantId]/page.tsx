"use client";

import { use, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewList } from "@/features/review/components/review-list";
import { PasswordDialog } from "@/features/review/components/password-dialog";
import { useVerifyReviewPassword } from "@/features/review/hooks/useVerifyReviewPassword";
import { useRestaurantDetail } from "@/features/restaurant/hooks/useRestaurantDetail";
import { useToast } from "@/hooks/use-toast";
import type { Review } from "@/features/review/lib/dto";

type RestaurantDetailPageProps = {
  params: Promise<{ restaurantId: string }>;
};

type PasswordDialogState =
  | {
      open: false;
      review: null;
      action: null;
      error: null;
      attemptsLeft?: number;
    }
  | {
      open: true;
      review: Review;
      action: "edit" | "delete";
      error: string | null;
      attemptsLeft?: number;
    };

const INITIAL_DIALOG_STATE: PasswordDialogState = {
  open: false,
  review: null,
  action: null,
  error: null,
};

export default function RestaurantDetailPage({
  params,
}: RestaurantDetailPageProps) {
  const { restaurantId } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [dialogState, setDialogState] =
    useState<PasswordDialogState>(INITIAL_DIALOG_STATE);

  const {
    data: restaurant,
    isLoading,
    isError,
    error,
  } = useRestaurantDetail(restaurantId, { enabled: Boolean(restaurantId) });

  const verifyPasswordMutation = useVerifyReviewPassword(
    dialogState.open ? dialogState.review.id : "",
  );

  useEffect(() => {
    if (dialogState.open === false && verifyPasswordMutation.isError) {
      verifyPasswordMutation.reset();
    }
  }, [dialogState.open, verifyPasswordMutation]);

  const handleOpenPasswordDialog = (review: Review, action: "edit" | "delete") =>
    setDialogState({
      open: true,
      review,
      action,
      error: null,
    });

  const handleClosePasswordDialog = (open: boolean) => {
    if (!open) {
      setDialogState(INITIAL_DIALOG_STATE);
    }
  };

  const handleVerifyPassword = async (password: string) => {
    if (!dialogState.open || !dialogState.review) {
      return;
    }

    try {
      await verifyPasswordMutation.mutateAsync({ password });

      toast({
        title: "비밀번호 확인 완료",
        description:
          dialogState.action === "edit"
            ? "수정 기능은 추후 제공될 예정입니다."
            : "삭제 기능은 추후 제공될 예정입니다.",
      });

      setDialogState(INITIAL_DIALOG_STATE);
    } catch (err) {
      const attemptsLeft =
        typeof (err as { attemptsLeft?: number }).attemptsLeft === "number"
          ? (err as { attemptsLeft: number }).attemptsLeft
          : undefined;

      setDialogState((prev) =>
        prev.open
          ? {
              ...prev,
              error:
                err instanceof Error
                  ? err.message
                  : "비밀번호 확인에 실패했습니다.",
              attemptsLeft,
            }
          : prev,
      );
    }
  };

  const formattedStats = useMemo(() => {
    if (!restaurant) {
      return null;
    }

    return {
      ratingText:
        restaurant.averageRating !== null
          ? restaurant.averageRating.toFixed(1)
          : "아직 평점 없음",
      reviewCountText: `${restaurant.reviewCount}개의 리뷰`,
    };
  }, [restaurant]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={() => router.push('/') }>
          <ArrowLeft className="mr-1 h-4 w-4" />
          뒤로가기
        </Button>
        <Button
          type="button"
          onClick={() => router.push(`/review/create?restaurantId=${restaurantId}`)}
        >
          리뷰 작성하기
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-slate-900">
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
          ) : null}

          {restaurant ? (
            <section className="space-y-3">
              <p className="text-sm text-slate-600">{restaurant.address}</p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                {formattedStats ? (
                  <>
                    <span className="flex items-center gap-1 font-medium text-slate-800">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {formattedStats.ratingText}
                    </span>
                    <span>{formattedStats.reviewCountText}</span>
                  </>
                ) : null}
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                  {restaurant.category ?? "카테고리 정보 없음"}
                </span>
              </div>
            </section>
          ) : null}

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">리뷰</h2>
            </div>
            <ReviewList
              restaurantId={restaurantId}
              enableActions
              onEdit={(review) => handleOpenPasswordDialog(review, "edit")}
              onDelete={(review) =>
                handleOpenPasswordDialog(review, "delete")
              }
            />
          </section>
        </CardContent>
      </Card>

      {dialogState.open ? (
        <PasswordDialog
          open={dialogState.open}
          title={
            dialogState.action === "delete"
              ? "리뷰 삭제를 위해 비밀번호를 확인합니다"
              : "리뷰 수정을 위해 비밀번호를 확인합니다"
          }
          description="리뷰 작성 시 사용한 비밀번호를 입력해 주세요."
          onOpenChange={handleClosePasswordDialog}
          onConfirm={handleVerifyPassword}
          isSubmitting={verifyPasswordMutation.isPending}
          errorMessage={dialogState.error ?? undefined}
          attemptsLeft={dialogState.attemptsLeft}
        />
      ) : null}
    </main>
  );
}
