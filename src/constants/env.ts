import { z } from 'zod';

const clientEnvSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_NAVER_MAPS_KEY_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID: z.string().min(1).optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.NEXT_PUBLIC_NAVER_MAPS_KEY_ID ||
          value.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID,
      ),
    {
      message:
        "NEXT_PUBLIC_NAVER_MAPS_KEY_ID 또는 NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID 중 하나는 반드시 설정해야 합니다.",
      path: ["NEXT_PUBLIC_NAVER_MAPS_KEY_ID"],
    },
  );

const _clientEnv = clientEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_NAVER_MAPS_KEY_ID: process.env.NEXT_PUBLIC_NAVER_MAPS_KEY_ID,
  NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID: process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID,
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

if (!_clientEnv.success) {
  console.error('환경 변수 검증 실패:', _clientEnv.error.flatten().fieldErrors);
  throw new Error('환경 변수를 확인하세요.');
}

export const env: ClientEnv = _clientEnv.data;
