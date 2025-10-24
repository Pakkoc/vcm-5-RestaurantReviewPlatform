import { z } from 'zod';
import type { AppConfig } from '@/backend/hono/context';

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NAVER_SEARCH_API_BASE_URL: z
    .string()
    .url()
    .default("https://openapi.naver.com/v1/search/local.json"),
  NAVER_SEARCH_CLIENT_ID: z
    .string()
    .min(1)
    .default("development-client-id"),
  NAVER_SEARCH_CLIENT_SECRET: z
    .string()
    .min(1)
    .default("development-client-secret"),
  NAVER_SEARCH_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(10_000),
  NAVER_SEARCH_RESULT_LIMIT: z.coerce
    .number()
    .int()
    .positive()
    .default(10),
});

let cachedConfig: AppConfig | null = null;

export const getAppConfig = (): AppConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = envSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NAVER_SEARCH_API_BASE_URL: process.env.NAVER_SEARCH_API_BASE_URL,
    NAVER_SEARCH_CLIENT_ID: process.env.NAVER_SEARCH_CLIENT_ID,
    NAVER_SEARCH_CLIENT_SECRET: process.env.NAVER_SEARCH_CLIENT_SECRET,
    NAVER_SEARCH_TIMEOUT_MS: process.env.NAVER_SEARCH_TIMEOUT_MS,
    NAVER_SEARCH_RESULT_LIMIT: process.env.NAVER_SEARCH_RESULT_LIMIT,
  });

  if (!parsed.success) {
    const messages = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'config'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid backend configuration: ${messages}`);
  }

  const isUsingPlaceholderCreds =
    parsed.data.NAVER_SEARCH_CLIENT_ID === "development-client-id" ||
    parsed.data.NAVER_SEARCH_CLIENT_SECRET === "development-client-secret";

  if (isUsingPlaceholderCreds) {
    console.warn(
      "[config] NAVER search credentials are not set. Placeholder credentials are being used for local development.",
    );
  }

  cachedConfig = {
    supabase: {
      url: parsed.data.SUPABASE_URL,
      serviceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
    },
    naver: {
      search: {
        baseUrl: parsed.data.NAVER_SEARCH_API_BASE_URL,
        clientId: parsed.data.NAVER_SEARCH_CLIENT_ID,
        clientSecret: parsed.data.NAVER_SEARCH_CLIENT_SECRET,
        timeoutMs: parsed.data.NAVER_SEARCH_TIMEOUT_MS,
        maxResults: parsed.data.NAVER_SEARCH_RESULT_LIMIT,
      },
    },
  } satisfies AppConfig;

  return cachedConfig;
};
