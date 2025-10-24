"use strict";

export const reviewErrorCodes = {
  createRequestInvalid: "REVIEW_CREATE_REQUEST_INVALID",
  createHashFailed: "REVIEW_CREATE_HASH_FAILED",
  createInsertFailed: "REVIEW_CREATE_INSERT_FAILED",
  fetchFailed: "REVIEW_FETCH_FAILED",
  validationFailed: "REVIEW_VALIDATION_FAILED",
  notFound: "REVIEW_NOT_FOUND",
  verifyRequestInvalid: "REVIEW_VERIFY_REQUEST_INVALID",
  verifyFailed: "REVIEW_VERIFY_FAILED",
  verifyRateLimited: "REVIEW_VERIFY_RATE_LIMITED",
} as const;

export type ReviewServiceError =
  (typeof reviewErrorCodes)[keyof typeof reviewErrorCodes];
