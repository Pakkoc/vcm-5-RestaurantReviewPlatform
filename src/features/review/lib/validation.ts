"use strict";

import { z } from "zod";

export const ReviewFormSchema = z.object({
  authorName: z
    .string()
    .min(1, "작성자명을 입력해 주세요.")
    .max(20, "작성자명은 최대 20자까지 입력 가능합니다.")
    .refine((value) => value.trim().length > 0, "공백만 입력할 수 없습니다."),
  rating: z
    .number()
    .int()
    .min(1, "평점을 선택해 주세요.")
    .max(5, "평점은 5점을 초과할 수 없습니다."),
  content: z
    .string()
    .min(10, "리뷰 내용은 최소 10자 이상 입력해 주세요.")
    .max(500, "리뷰 내용은 최대 500자까지 입력 가능합니다.")
    .refine(
      (value) => value.trim().length >= 10,
      "공백을 제외하고 최소 10자 이상 입력해 주세요.",
    ),
  password: z
    .string()
    .min(4, "비밀번호는 최소 4자 이상 입력해 주세요."),
});

export type ReviewFormData = z.infer<typeof ReviewFormSchema>;
