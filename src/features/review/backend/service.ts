"use strict";

import bcrypt from "bcrypt";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  failure,
  success,
  type HandlerResult,
} from "@/backend/http/response";
import {
  reviewErrorCodes,
  type ReviewServiceError,
} from "@/features/review/backend/error";
import {
  CreateReviewResponseSchema,
  ReviewListSchema,
  ReviewSchema,
  VerifyReviewPasswordResponseSchema,
  UpdateReviewRequestSchema,
  type CreateReviewRequest,
  type CreateReviewResponse,
  type Review,
  type VerifyReviewPasswordResponse,
  type UpdateReviewRequest,
} from "@/features/review/backend/schema";
import { normalizeWhitespace } from "@/lib/string-utils";

const REVIEWS_TABLE = "reviews";
const REVIEW_SELECT_COLUMNS =
  "id, restaurant_id, author_name, rating, content, created_at, updated_at";
const REVIEW_PASSWORD_SELECT_COLUMNS =
  "id, restaurant_id, password_hash";
const PASSWORD_SALT_ROUNDS = 10;

const ReviewRowSchema = z.object({
  id: z.string().uuid(),
  restaurant_id: z.string().uuid(),
  author_name: z.string(),
  rating: z.coerce.number(),
  content: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

const ReviewPasswordRowSchema = z.object({
  id: z.string().uuid(),
  restaurant_id: z.string().uuid(),
  password_hash: z.string().min(1),
});

type SanitizedReviewPayload = {
  authorName: string;
  rating: number;
  content: string;
  password: string;
};

const sanitizeReviewPayload = (
  payload: CreateReviewRequest,
): SanitizedReviewPayload | null => {
  const authorName = normalizeWhitespace(payload.author_name);
  const content = normalizeWhitespace(payload.content);
  const password = payload.password.trim();
  const rating = Math.trunc(payload.rating);

  if (!authorName || authorName.length === 0 || authorName.length > 20) {
    return null;
  }

  if (!content || content.length < 10 || content.length > 500) {
    return null;
  }

  if (!password || password.length < 4) {
    return null;
  }

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return null;
  }

  return {
    authorName,
    rating,
    content,
    password,
  };
};

const mapRowToReview = (row: z.infer<typeof ReviewRowSchema>): Review => ({
  id: row.id,
  restaurantId: row.restaurant_id,
  authorName: row.author_name,
  rating: Number(row.rating),
  content: row.content,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createReview = async (
  client: SupabaseClient,
  restaurantId: string,
  payload: CreateReviewRequest,
): Promise<
  HandlerResult<CreateReviewResponse, ReviewServiceError, unknown>
> => {
  const sanitized = sanitizeReviewPayload(payload);

  if (!sanitized) {
    return failure(
      400,
      reviewErrorCodes.createRequestInvalid,
      "리뷰 정보를 다시 확인해 주세요.",
    );
  }

  let passwordHash: string;

  try {
    passwordHash = await bcrypt.hash(
      sanitized.password,
      PASSWORD_SALT_ROUNDS,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "비밀번호를 암호화하지 못했습니다.";

    return failure(
      500,
      reviewErrorCodes.createHashFailed,
      message,
    );
  }

  const { data, error } = await client
    .from(REVIEWS_TABLE)
    .insert({
      restaurant_id: restaurantId,
      author_name: sanitized.authorName,
      rating: sanitized.rating,
      content: sanitized.content,
      password_hash: passwordHash,
    })
    .select(REVIEW_SELECT_COLUMNS)
    .single();

  if (error) {
    return failure(
      500,
      reviewErrorCodes.createInsertFailed,
      error.message,
    );
  }

  const parsedRow = ReviewRowSchema.safeParse(data);

  if (!parsedRow.success) {
    return failure(
      500,
      reviewErrorCodes.validationFailed,
      "리뷰 데이터를 검증하지 못했습니다.",
      parsedRow.error.format(),
    );
  }

  const candidate = mapRowToReview(parsedRow.data);

  const validation = CreateReviewResponseSchema.safeParse(candidate);

  if (!validation.success) {
    return failure(
      500,
      reviewErrorCodes.validationFailed,
      "리뷰 응답 데이터를 검증하지 못했습니다.",
      validation.error.format(),
    );
  }

  return success(validation.data, 201);
};

export const getReviews = async (
  client: SupabaseClient,
  restaurantId: string,
  limit: number,
  offset: number,
): Promise<HandlerResult<Review[], ReviewServiceError, unknown>> => {
  const { data, error } = await client
    .from(REVIEWS_TABLE)
    .select(REVIEW_SELECT_COLUMNS)
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return failure(
      500,
      reviewErrorCodes.fetchFailed,
      error.message,
    );
  }

  const parsedRows = ReviewRowSchema.array().safeParse(data ?? []);

  if (!parsedRows.success) {
    return failure(
      500,
      reviewErrorCodes.validationFailed,
      "리뷰 목록 데이터를 검증하지 못했습니다.",
      parsedRows.error.format(),
    );
  }

  const reviews = parsedRows.data.map(mapRowToReview);

  const validation = ReviewListSchema.safeParse(reviews);

  if (!validation.success) {
    return failure(
      500,
      reviewErrorCodes.validationFailed,
      "리뷰 목록 응답 데이터를 검증하지 못했습니다.",
      validation.error.format(),
    );
  }

  return success(validation.data);
};

export const verifyReviewPassword = async (
  client: SupabaseClient,
  reviewId: string,
  password: string,
): Promise<
  HandlerResult<VerifyReviewPasswordResponse, ReviewServiceError, unknown>
> => {
  const trimmedPassword = password.trim();

  if (trimmedPassword.length < 4) {
    return failure(
      400,
      reviewErrorCodes.verifyRequestInvalid,
      "비밀번호는 최소 4자 이상이어야 합니다.",
    );
  }

  const { data, error } = await client
    .from(REVIEWS_TABLE)
    .select(REVIEW_PASSWORD_SELECT_COLUMNS)
    .eq("id", reviewId)
    .maybeSingle();

  if (error) {
    return failure(
      500,
      reviewErrorCodes.fetchFailed,
      error.message,
    );
  }

  if (!data) {
    return failure(
      404,
      reviewErrorCodes.notFound,
      "리뷰를 찾을 수 없습니다.",
    );
  }

  const parsedRow = ReviewPasswordRowSchema.safeParse(data);

  if (!parsedRow.success) {
    return failure(
      500,
      reviewErrorCodes.validationFailed,
      "리뷰 비밀번호 정보를 검증하지 못했습니다.",
      parsedRow.error.format(),
    );
  }

  let isValid = false;

  try {
    isValid = await bcrypt.compare(
      trimmedPassword,
      parsedRow.data.password_hash,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "비밀번호를 검증하지 못했습니다.";

    return failure(
      500,
      reviewErrorCodes.fetchFailed,
      message,
    );
  }

  if (!isValid) {
    return failure(
      401,
      reviewErrorCodes.verifyFailed,
      "비밀번호가 일치하지 않습니다.",
    );
  }

  const payload: VerifyReviewPasswordResponse = {
    verified: true,
  };

  const validation = VerifyReviewPasswordResponseSchema.safeParse(payload);

  if (!validation.success) {
    return failure(
      500,
      reviewErrorCodes.validationFailed,
      "비밀번호 검증 응답 데이터를 검증하지 못했습니다.",
      validation.error.format(),
    );
  }

  return success(validation.data);
};

export const deleteReview = async (
  client: SupabaseClient,
  reviewId: string,
): Promise<HandlerResult<null, ReviewServiceError, unknown>> => {
  const { error } = await client.from(REVIEWS_TABLE).delete().eq("id", reviewId);

  if (error) {
    return failure(500, reviewErrorCodes.deleteFailed, error.message);
  }

  return success(null, 204);
};

export const getReviewById = async (
  client: SupabaseClient,
  reviewId: string,
): Promise<HandlerResult<Review, ReviewServiceError, unknown>> => {
  const { data, error } = await client
    .from(REVIEWS_TABLE)
    .select(REVIEW_SELECT_COLUMNS)
    .eq("id", reviewId)
    .maybeSingle();

  if (error) {
    return failure(500, reviewErrorCodes.fetchFailed, error.message);
  }

  if (!data) {
    return failure(404, reviewErrorCodes.notFound, "리뷰를 찾을 수 없습니다.");
  }

  const parsed = ReviewRowSchema.safeParse(data);
  if (!parsed.success) {
    return failure(
      500,
      reviewErrorCodes.validationFailed,
      "리뷰 데이터를 검증하지 못했습니다.",
      parsed.error.format(),
    );
  }

  const review = mapRowToReview(parsed.data);
  const validation = ReviewSchema.safeParse(review);
  if (!validation.success) {
    return failure(
      500,
      reviewErrorCodes.validationFailed,
      "리뷰 응답 데이터를 검증하지 못했습니다.",
      validation.error.format(),
    );
  }

  return success(validation.data);
};

export const updateReview = async (
  client: SupabaseClient,
  reviewId: string,
  payload: UpdateReviewRequest,
): Promise<HandlerResult<Review, ReviewServiceError, unknown>> => {
  // 입력 검증
  const parsedPayload = UpdateReviewRequestSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return failure(
      400,
      reviewErrorCodes.validationFailed,
      "리뷰 입력값을 확인해 주세요.",
      parsedPayload.error.format(),
    );
  }

  // 비밀번호 검증
  const verify = await verifyReviewPassword(
    client,
    reviewId,
    parsedPayload.data.password,
  );
  if (!verify.ok) {
    return verify as HandlerResult<Review, ReviewServiceError, unknown>;
  }

  const { data, error } = await client
    .from(REVIEWS_TABLE)
    .update({
      author_name: parsedPayload.data.author_name.trim(),
      rating: Math.trunc(parsedPayload.data.rating),
      content: parsedPayload.data.content.trim(),
    })
    .eq("id", reviewId)
    .select(REVIEW_SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    return failure(500, reviewErrorCodes.fetchFailed, error.message);
  }

  if (!data) {
    return failure(404, reviewErrorCodes.notFound, "리뷰를 찾을 수 없습니다.");
  }

  const parsed = ReviewRowSchema.safeParse(data);
  if (!parsed.success) {
    return failure(
      500,
      reviewErrorCodes.validationFailed,
      "리뷰 데이터를 검증하지 못했습니다.",
      parsed.error.format(),
    );
  }

  const review = mapRowToReview(parsed.data);
  const validation = ReviewSchema.safeParse(review);
  if (!validation.success) {
    return failure(
      500,
      reviewErrorCodes.validationFailed,
      "리뷰 응답 데이터를 검증하지 못했습니다.",
      validation.error.format(),
    );
  }

  return success(validation.data);
};
