# Database Design

## 데이터 플로우 개요
- **UF-001 & UF-005 지도 마커 노출**: `GET /api/restaurants/markers`는 `restaurant_markers` 뷰를 조회해 리뷰가 1건 이상인 음식점의 기본 정보(이름, 좌표, 카테고리, 평균 평점, 리뷰 수)를 반환한다.
- **UF-003 & UF-019 검색 결과 → 리뷰 작성 진입**: 검색 결과 항목 선택 시 `naver_place_id`로 `restaurants`를 조회하고, 존재하지 않으면 동일 데이터를 INSERT 후 생성된 `id`를 사용해 리뷰 작성 페이지로 라우팅한다.
- **UF-007 & UF-011 상세 페이지 로드**: `GET /api/restaurants/{id}`는 `restaurants`와 `restaurant_review_aggregates` 뷰를 조인해 음식점 기본 정보와 통계를 제공하고, `GET /api/restaurants/{id}/reviews`는 `reviews` 테이블에서 최신순으로 리뷰 목록을 불러온다.
- **UF-009 리뷰 작성 제출 & UF-020 통계 반영**: 신규 리뷰가 `reviews`에 INSERT되면 패스워드는 서버에서 해시되어 저장되고, 이후 통계 뷰가 자동 집계되어 평균 평점과 리뷰 수가 최신 상태로 제공된다. `touch_updated_at` 트리거가 `restaurants.updated_at`을 동기화한다.
- **UF-021 비밀번호 검증(향후)**: 수정/삭제 요청 시 입력 비밀번호를 동일한 방식으로 해시해 `reviews.password_hash`와 비교한다.

## 스키마 설계 (PostgreSQL)

### restaurants
| 컬럼 | 타입 | 제약/설명 |
| --- | --- | --- |
| `id` | uuid | PK, DEFAULT `gen_random_uuid()` |
| `name` | varchar(255) | NOT NULL |
| `address` | text | NOT NULL |
| `category` | varchar(100) | NULL 허용 (네이버 응답에 따라 비어있을 수 있음) |
| `latitude` | numeric(9,6) | NOT NULL, CHECK `latitude BETWEEN -90 AND 90` |
| `longitude` | numeric(9,6) | NOT NULL, CHECK `longitude BETWEEN -180 AND 180` |
| `naver_place_id` | varchar(255) | UNIQUE, NULL 허용 |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() |

**인덱스**
- `restaurants_naver_place_id_key` (UNIQUE) — UF-019에서 중복 저장 방지.
- `idx_restaurants_location` ON (`latitude`, `longitude`) — 지도 범위 필터링 대비.

### reviews
| 컬럼 | 타입 | 제약/설명 |
| --- | --- | --- |
| `id` | uuid | PK, DEFAULT `gen_random_uuid()` |
| `restaurant_id` | uuid | NOT NULL, FK → `restaurants(id)` ON DELETE CASCADE |
| `author_name` | varchar(20) | NOT NULL, CHECK `char_length(btrim(author_name)) BETWEEN 1 AND 20` |
| `rating` | smallint | NOT NULL, CHECK `rating BETWEEN 1 AND 5` |
| `content` | text | NOT NULL, CHECK `char_length(btrim(content)) BETWEEN 10 AND 500` |
| `password_hash` | varchar(128) | NOT NULL, 해시된 비밀번호 (UF-009, UF-021) |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() |

**인덱스**
- `idx_reviews_restaurant_created_at` ON (`restaurant_id`, `created_at` DESC) — UF-011에서 최신순 목록 응답.

## 파생 객체

### restaurant_review_aggregates 뷰
```sql
CREATE OR REPLACE VIEW restaurant_review_aggregates AS
SELECT
  r.id AS restaurant_id,
  COUNT(rv.id) AS review_count,
  COALESCE(ROUND(AVG(rv.rating)::numeric, 1), 0) AS average_rating
FROM restaurants r
LEFT JOIN reviews rv ON rv.restaurant_id = r.id
GROUP BY r.id;
```
- 상세 페이지와 기타 통계성 API에서 공통으로 사용한다.
- 리뷰가 없을 경우 `review_count = 0`, `average_rating = 0`으로 처리해 첫 리뷰 유도 UI를 구성한다.

### restaurant_markers 뷰
```sql
CREATE OR REPLACE VIEW restaurant_markers AS
SELECT
  r.id,
  r.name,
  r.category,
  r.latitude,
  r.longitude,
  agg.review_count,
  agg.average_rating
FROM restaurants r
JOIN restaurant_review_aggregates agg ON agg.restaurant_id = r.id
WHERE agg.review_count > 0;
```
- UF-001/UF-005에서 요구한 “리뷰가 있는 음식점만 마커 표시” 조건을 만족시키기 위한 최소 집계 뷰다.

### touch_updated_at 트리거
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
- UF-020에서 명시된 `restaurants.updated_at` 갱신을 자동화하며, 미래의 리뷰 수정 시나리오에서도 일관된 타임스탬프 관리를 보장한다.

