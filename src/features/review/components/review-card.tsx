"use client";

import { format } from "date-fns";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Review } from "@/features/review/lib/dto";

type ReviewCardProps = {
  review: Review;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
};

const getFormattedDate = (value: string) => {
  try {
    return format(new Date(value), "yyyy.MM.dd");
  } catch {
    return "";
  }
};

export const ReviewCard = ({
  review,
  onEdit,
  onDelete,
  showActions,
}: ReviewCardProps) => {
  const formattedDate = getFormattedDate(review.createdAt);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-900">
            {review.authorName}
          </p>
          {formattedDate ? (
            <p className="text-sm text-slate-500">{formattedDate}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: review.rating }, (_, index) => (
            <Star
              key={index}
              className="h-4 w-4 fill-yellow-400 text-yellow-400"
            />
          ))}
        </div>
      </header>
      <p className="mt-3 whitespace-pre-line text-sm text-slate-700">
        {review.content}
      </p>
      {showActions ? (
        <footer className="mt-4 flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEdit}
          >
            수정
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
          >
            삭제
          </Button>
        </footer>
      ) : null}
    </article>
  );
};
