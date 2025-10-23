# Implementation Plan: UC-020 리뷰 통계 업데이트

## 개요

리뷰 작성 시 음식점의 평균 평점 및 리뷰 개수를 자동으로 업데이트하는 기능입니다. 데이터베이스 뷰를 사용하여 자동으로 처리됩니다.

### 모듈 목록

| 모듈 | 위치 | 설명 |
|------|------|------|
| **restaurant_review_aggregates View** | `supabase/migrations/0002_*.sql` | UC-001에서 이미 생성됨 |
| **touch_updated_at Trigger** | `supabase/migrations/0002_*.sql` | UC-001에서 이미 생성됨 |

---

## Implementation Plan

### 1. 기존 구현 확인

UC-001의 마이그레이션에서 다음이 이미 구현됨:

#### 1.1. restaurant_review_aggregates 뷰

```sql
CREATE OR REPLACE VIEW restaurant_review_aggregates AS
SELECT
  r.id AS restaurant_id,
  COUNT(rv.id) AS review_count,
  CASE
    WHEN COUNT(rv.id) = 0 THEN NULL
    ELSE ROUND(AVG(rv.rating)::numeric, 1)
  END AS average_rating
FROM restaurants r
LEFT JOIN reviews rv ON rv.restaurant_id = r.id
GROUP BY r.id;
```

#### 1.2. updated_at 자동 갱신 트리거

```sql
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restaurants_updated_at
BEFORE UPDATE ON restaurants
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
```

### 2. 동작 방식

1. **리뷰 작성 시**:
   - `reviews` 테이블에 INSERT
   - `restaurant_review_aggregates` 뷰가 자동으로 최신 통계 반영
   - 다음 조회 시 업데이트된 평균 평점 및 리뷰 개수 반환

2. **음식점 정보 조회 시**:
   - `restaurants` 테이블과 `restaurant_review_aggregates` 뷰 조인
   - 실시간 통계 제공

### 3. 추가 작업

없음. 데이터베이스 뷰가 자동으로 처리합니다.

### 4. QA Sheet

- ✅ 리뷰 작성 시 평균 평점 자동 계산
- ✅ 리뷰 개수 자동 증가
- ✅ 소수점 첫째 자리까지 반올림
- ✅ 리뷰 0개 시 평균 평점 NULL
- ✅ updated_at 자동 갱신

### 5. 의존성

- **선행 작업**: UC-001 (마이그레이션), UC-009 (리뷰 작성)
- **후속 작업**: 없음

