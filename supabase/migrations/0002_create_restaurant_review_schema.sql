-- Migration: create core restaurant & review tables, supporting views, and triggers
-- Ensures pgcrypto extension available for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

BEGIN;

-- 음식점 정보 저장 테이블 (UF-003, UF-019, UF-011)
CREATE TABLE IF NOT EXISTS public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL CHECK (char_length(btrim(name)) > 0),
  address text NOT NULL,
  category varchar(100),
  latitude numeric(10,7) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(11,7) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  naver_place_id varchar(255) UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 리뷰 데이터 저장 테이블 (UF-009, UF-011)
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  author_name varchar(20) NOT NULL CHECK (char_length(btrim(author_name)) BETWEEN 1 AND 20),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 10 AND 500),
  password_hash varchar(72) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 지도 및 상세 조회 성능을 위한 인덱스 (UF-001, UF-011)
CREATE UNIQUE INDEX IF NOT EXISTS restaurants_naver_place_id_key
  ON public.restaurants (naver_place_id);

CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_created_at
  ON public.reviews (restaurant_id, created_at DESC);

-- 리뷰 통계 뷰 (UF-001, UF-005, UF-011, UF-020)
CREATE OR REPLACE VIEW public.restaurant_review_aggregates AS
SELECT
  r.id AS restaurant_id,
  COUNT(rv.id) AS review_count,
  CASE
    WHEN COUNT(rv.id) = 0 THEN NULL
    ELSE ROUND(AVG(rv.rating)::numeric, 1)
  END AS average_rating
FROM public.restaurants r
LEFT JOIN public.reviews rv ON rv.restaurant_id = r.id
GROUP BY r.id;

-- updated_at 자동 갱신 함수 및 트리거 (UF-020)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- restaurants.updated_at 동기화
DROP TRIGGER IF EXISTS trg_restaurants_updated_at ON public.restaurants;
CREATE TRIGGER trg_restaurants_updated_at
BEFORE UPDATE ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- reviews.updated_at 동기화
DROP TRIGGER IF EXISTS trg_reviews_updated_at ON public.reviews;
CREATE TRIGGER trg_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- RLS 비활성화 (요구사항: MUST NOT use RLS)
ALTER TABLE IF EXISTS public.restaurants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews DISABLE ROW LEVEL SECURITY;

COMMIT;

