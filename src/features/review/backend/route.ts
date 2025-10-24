"use strict";

import { z } from "zod";
import type { Hono } from "hono";
import {
  failure,
  respond,
  type ErrorResult,
} from "@/backend/http/response";
import {
  getLogger,
  getSupabase,
  type AppEnv,
} from "@/backend/hono/context";
import {
  createReview,
  getReviews,
  verifyReviewPassword,
} from "@/features/review/backend/service";
import {
  reviewErrorCodes,
  type ReviewServiceError,
} from "@/features/review/backend/error";
import {
  CreateReviewRequestSchema,
  VerifyReviewPasswordRequestSchema,
} from "@/features/review/backend/schema";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 30;
const MAX_VERIFY_ATTEMPTS = 3;
const VERIFY_BLOCK_DURATION_MS = 5 * 60 * 1000;

type VerificationRecord = {
  count: number;
  blockedUntil: number | null;
};

const verificationAttemptStore = new Map<string, VerificationRecord>();

const getClientIp = (request: Request) => {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const [first] = forwarded.split(",").map((value) => value.trim());
    if (first && first.length > 0) {
      return first;
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown";
};

const upsertVerificationRecord = (
  key: string,
  updater: (record: VerificationRecord | undefined) => VerificationRecord,
) => {
  const nextRecord = updater(verificationAttemptStore.get(key));
  verificationAttemptStore.set(key, nextRecord);
  return nextRecord;
};

export const registerReviewRoutes = (app: Hono<AppEnv>) => {
  app.post("/api/restaurants/:restaurantId/reviews", async (c) => {
    const logger = getLogger(c);
    const supabase = getSupabase(c);
    const restaurantIdParam = c.req.param("restaurantId");

    const restaurantId = z.string().uuid().safeParse(restaurantIdParam);

    if (!restaurantId.success) {
      return respond(
        c,
        failure(
          400,
          reviewErrorCodes.createRequestInvalid,
          "유효한 음식점 ID가 필요합니다.",
        ),
      );
    }

    let payload: unknown;

    try {
      payload = await c.req.json();
    } catch (error) {
      logger.warn("Failed to parse create review payload", error);
      return respond(
        c,
        failure(
          400,
          reviewErrorCodes.createRequestInvalid,
          "요청 본문을 읽는 중 문제가 발생했습니다.",
        ),
      );
    }

    const parsedPayload = CreateReviewRequestSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return respond(
        c,
        failure(
          400,
          reviewErrorCodes.createRequestInvalid,
          "리뷰 입력값을 확인해 주세요.",
          parsedPayload.error.format(),
        ),
      );
    }

    const result = await createReview(
      supabase,
      restaurantId.data,
      parsedPayload.data,
    );

    if (!result.ok) {
      const errorResult = result as ErrorResult<
        ReviewServiceError,
        unknown
      >;

      logger.error(
        "Failed to create review",
        errorResult.error.message,
        errorResult.error.details ?? null,
      );
    }

    return respond(c, result);
  });

  app.get("/api/restaurants/:restaurantId/reviews", async (c) => {
    const logger = getLogger(c);
    const supabase = getSupabase(c);
    const restaurantIdParam = c.req.param("restaurantId");

    const restaurantId = z.string().uuid().safeParse(restaurantIdParam);

    if (!restaurantId.success) {
      return respond(
        c,
        failure(
          400,
          reviewErrorCodes.fetchFailed,
          "유효한 음식점 ID가 필요합니다.",
        ),
      );
    }

    const pageRaw = c.req.query("page");
    const limitRaw = c.req.query("limit");

    const page =
      pageRaw && Number.isFinite(Number(pageRaw))
        ? Math.max(Number(pageRaw), 1)
        : 1;

    const limitCandidate =
      limitRaw && Number.isFinite(Number(limitRaw))
        ? Math.max(Number(limitRaw), 1)
        : DEFAULT_PAGE_SIZE;

    const limit = Math.min(limitCandidate, MAX_PAGE_SIZE);
    const offset = (page - 1) * limit;

    const result = await getReviews(
      supabase,
      restaurantId.data,
      limit,
      offset,
    );

    if (!result.ok) {
      const errorResult = result as ErrorResult<
        ReviewServiceError,
        unknown
      >;

      if (
        errorResult.error.code === reviewErrorCodes.fetchFailed ||
        errorResult.error.code === reviewErrorCodes.validationFailed
      ) {
        logger.error(
          "Failed to load restaurant reviews",
          errorResult.error.message,
          errorResult.error.details ?? null,
        );
      }
    }

    return respond(c, result);
  });

  app.post("/api/reviews/:reviewId/verify-password", async (c) => {
    const logger = getLogger(c);
    const supabase = getSupabase(c);
    const reviewIdParam = c.req.param("reviewId");

    const reviewId = z.string().uuid().safeParse(reviewIdParam);

    if (!reviewId.success) {
      return respond(
        c,
        failure(
          400,
          reviewErrorCodes.verifyRequestInvalid,
          "유효한 리뷰 ID가 필요합니다.",
        ),
      );
    }

    let payload: unknown;

    try {
      payload = await c.req.json();
    } catch (error) {
      logger.warn("Failed to parse verify password payload", error);
      return respond(
        c,
        failure(
          400,
          reviewErrorCodes.verifyRequestInvalid,
          "요청 본문을 읽는 중 문제가 발생했습니다.",
        ),
      );
    }

    const parsedPayload = VerifyReviewPasswordRequestSchema.safeParse(
      payload,
    );

    if (!parsedPayload.success) {
      return respond(
        c,
        failure(
          400,
          reviewErrorCodes.verifyRequestInvalid,
          "비밀번호를 다시 확인해 주세요.",
          parsedPayload.error.format(),
        ),
      );
    }

    const clientIp = getClientIp(c.req.raw);
    const attemptKey = `${reviewId.data}:${clientIp}`;
    const now = Date.now();
    const existingRecord = verificationAttemptStore.get(attemptKey);

    if (
      existingRecord?.blockedUntil &&
      existingRecord.blockedUntil > now
    ) {
      return respond(
        c,
        failure(
          429,
          reviewErrorCodes.verifyRateLimited,
          "비밀번호 검증이 일시적으로 제한되었습니다. 잠시 후 다시 시도해 주세요.",
          { blockedUntil: existingRecord.blockedUntil },
        ),
      );
    }

    const result = await verifyReviewPassword(
      supabase,
      reviewId.data,
      parsedPayload.data.password,
    );

    if (!result.ok) {
      const errorResult = result as ErrorResult<
        ReviewServiceError,
        unknown
      >;

      if (errorResult.error.code === reviewErrorCodes.verifyFailed) {
        const nextRecord = upsertVerificationRecord(
          attemptKey,
          (record) => {
            const nextCount = (record?.count ?? 0) + 1;
            const blockedUntil =
              nextCount >= MAX_VERIFY_ATTEMPTS
                ? now + VERIFY_BLOCK_DURATION_MS
                : null;

            return {
              count: blockedUntil ? MAX_VERIFY_ATTEMPTS : nextCount,
              blockedUntil,
            };
          },
        );

        const attemptsLeft =
          nextRecord.blockedUntil !== null
            ? 0
            : Math.max(
                MAX_VERIFY_ATTEMPTS - (nextRecord.count ?? 0),
                0,
              );

        return respond(
          c,
          failure(
            errorResult.status,
            errorResult.error.code,
            errorResult.error.message,
            { attemptsLeft },
          ),
        );
      }

      if (
        errorResult.error.code === reviewErrorCodes.fetchFailed ||
        errorResult.error.code === reviewErrorCodes.validationFailed
      ) {
        logger.error(
          "Failed to verify review password",
          errorResult.error.message,
          errorResult.error.details ?? null,
        );
      }

      return respond(c, result);
    }

    verificationAttemptStore.delete(attemptKey);
    return respond(c, result);
  });
};
