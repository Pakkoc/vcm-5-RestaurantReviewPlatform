"use strict";

import { z } from "zod";

export const CreateReviewRequestSchema = z.object({
  author_name: z
    .string()
    .trim()
    .min(1, "작성자명을 입력해 주세요.")
    .max(20, "작성자명은 최대 20자까지 입력 가능합니다."),
  rating: z
    .number()
    .int()
    .min(1, "평점은 1점 이상이어야 합니다.")
    .max(5, "평점은 5점을 초과할 수 없습니다."),
  content: z
    .string()
    .trim()
    .min(10, "리뷰 내용은 최소 10자 이상 입력해 주세요.")
    .max(500, "리뷰 내용은 최대 500자까지 입력 가능합니다."),
  password: z
    .string()
    .min(4, "비밀번호는 최소 4자 이상 입력해 주세요."),
});

export type CreateReviewRequest = z.infer<typeof CreateReviewRequestSchema>;

export const ReviewSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  authorName: z.string(),
  rating: z.number().int().min(1).max(5),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Review = z.infer<typeof ReviewSchema>;

export const ReviewListSchema = z.array(ReviewSchema);

export const CreateReviewResponseSchema = ReviewSchema;

export type CreateReviewResponse = z.infer<
  typeof CreateReviewResponseSchema
>;

export const UpdateReviewRequestSchema = z.object({
  author_name: z
    .string()
    .trim()
    .min(1, "작성자명을 입력해 주세요.")
    .max(20, "작성자명은 최대 20자까지 입력 가능합니다."),
  rating: z
    .number()
    .int()
    .min(1, "평점은 1점 이상이어야 합니다.")
    .max(5, "평점은 5점을 초과할 수 없습니다."),
  content: z
    .string()
    .trim()
    .min(10, "리뷰 내용은 최소 10자 이상 입력해 주세요.")
    .max(500, "리뷰 내용은 최대 500자까지 입력 가능합니다."),
  password: z.string().min(4, "비밀번호는 최소 4자 이상이어야 합니다."),
});

export type UpdateReviewRequest = z.infer<typeof UpdateReviewRequestSchema>;

export const VerifyReviewPasswordRequestSchema = z.object({
  password: z.string().min(4, "비밀번호는 최소 4자 이상 입력해 주세요."),
});

export type VerifyReviewPasswordRequest = z.infer<
  typeof VerifyReviewPasswordRequestSchema
>;

export const VerifyReviewPasswordResponseSchema = z.object({
  verified: z.boolean(),
  attemptsLeft: z.number().int().min(0).optional(),
});

export type VerifyReviewPasswordResponse = z.infer<
  typeof VerifyReviewPasswordResponseSchema
>;
