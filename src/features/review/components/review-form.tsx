"use client";

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Star } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ReviewFormData } from "@/features/review/lib/validation";

type ReviewFormProps = {
  form: UseFormReturn<ReviewFormData>;
  onSubmit: (data: ReviewFormData) => Promise<void> | void;
  isSubmitting?: boolean;
};

export const ReviewForm = ({
  form,
  onSubmit,
  isSubmitting,
}: ReviewFormProps) => {
  const [hoveredRating, setHoveredRating] = useState(0);

  const contentValue = form.watch("content");
  const ratingValue = form.watch("rating");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        <FormField
          control={form.control}
          name="authorName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>작성자명</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  maxLength={20}
                  placeholder="이름을 입력하세요"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rating"
          render={() => (
            <FormItem>
              <FormLabel>평점</FormLabel>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }, (_, index) => index + 1).map(
                  (star) => {
                    const isActive =
                      star <= (hoveredRating || ratingValue || 0);

                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() =>
                          form.setValue("rating", star, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          })
                        }
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="transition-transform hover:scale-110 focus:outline-none"
                        aria-label={`${star}점 선택`}
                      >
                        <Star
                          className={`h-8 w-8 ${
                            isActive
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-slate-300"
                          }`}
                        />
                      </button>
                    );
                  },
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>리뷰 내용</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={6}
                  maxLength={500}
                  placeholder="음식점에 대한 솔직한 리뷰를 작성해 주세요 (최소 10자)"
                />
              </FormControl>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span />
                <span>{contentValue.length} / 500자</span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>비밀번호</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  placeholder="리뷰 수정/삭제 시 사용됩니다 (최소 4자)"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || !form.formState.isValid}
        >
          {isSubmitting ? "등록 중..." : "리뷰 작성하기"}
        </Button>
      </form>
    </Form>
  );
};
