# Database Design

## 데이터 플로우 개요
- **UF-001 · UF-005 지도 마커 노출**: `GET /api/restaurants/markers`가 `restaurant_review_metrics` 뷰를 조회해 리뷰 수가 1건 이상인 음식점의 좌표, 이름, 카테고리, 평균 평점, 리뷰 수를 반환한다.
- **UF-003 · UF-019 검색 결과 → 리뷰 작성 진입**: 검색 결과 항목을 선택하면 `naver_place_id`로 `restaurants`를 조회하고, 없으면 동일 정보를 레코드로 저장한 뒤 생성된 `id`로 리뷰 작성 페이지를 구성한다.
- **UF-007 · UF-011 상세 페이지 로드**: `GET /api/restaurants/{id}`는 `restaurants`와 `restaurant_review_metrics`를 조인해 음식점 기본 정보와 통계를 반환하고, `GET /api/restaurants/{id}/reviews`는 `reviews`를 최신순으로 목록화한다.
- **UF-009 리뷰 작성 제출 & UF-020 통계 반영**: 신규 리뷰가 `reviews`에 insert되면 트리거가 `restaurants.updated_at`를 갱신하고, 통계 뷰가 즉시 반영되어 평균 평점과 리뷰 수가 최신 상태로 노출된다.
- **UF-021 비밀번호 검증(향후)**: 리뷰 수정·삭제 전 입력된 비밀번호를 애플리케이션에서 해싱 후 `reviews.password_hash`와 비교한다.

## 스키마 설계 (PostgreSQL)

### restaurants
| 컬럼 | 타입 | 제약/설명 |
| --- | --- | --- |
| `id` | uuid | PK, `gen_random_uuid()` |
| `name` | varchar(255) | NOT NULL |
| `address` | text | NOT NULL |
| `category` | varchar(100) | NULL 허용 |
| `latitude` | numeric(9,6) | NOT NULL, CHECK `latitude BETWEEN -90 AND 90` |
| `longitude` | numeric(9,6) | NOT NULL, CHECK `longitude BETWEEN -180 AND 180` |
| `naver_place_id` | varchar(255) | UNIQUE, NULL 허용 |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() |

**인덱스**
- `idx_restaurants_location` ON (`latitude`, `longitude`) — 지도 범위 필터링 최적화.
- `restaurants_naver_place_id_key` UNIQUE — 동일 플레이스 중복 생성 방지.

### reviews
| 컬럼 | 타입 | 제약/설명 |
| --- | --- | --- |
| `id` | uuid | PK, `gen_random_uuid()` |
| `restaurant_id` | uuid | NOT NULL, FK → `restaurants(id)` ON DELETE CASCADE |
| `author_name` | varchar(20) | NOT NULL, CHECK `char_length(btrim(author_name)) BETWEEN 1 AND 20` |
| `rating` | smallint | NOT NULL, CHECK `rating BETWEEN 1 AND 5` |
| `content` | text | NOT NULL, CHECK `char_length(btrim(content)) BETWEEN 10 AND 500` |
| `password_hash` | varchar(72) | NOT NULL (bcrypt 등 해시 문자열 저장) |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() |

**인덱스**
- `idx_reviews_restaurant_created_at` ON (`restaurant_id`, `created_at` DESC) — 상세 페이지 최신순 조회 지원.

## 파생 객체

### restaurant_review_metrics 뷰
```sql
CREATE OR REPLACE VIEW restaurant_review_metrics AS
SELECT
  r.id AS restaurant_id,
  COUNT(rv.id) AS review_count,
  COALESCE(ROUND(AVG(rv.rating)::numeric, 1), 0) AS average_rating
FROM restaurants r
LEFT JOIN reviews rv ON rv.restaurant_id = r.id
GROUP BY r.id;
```
- 지도 마커, 상세 페이지, 통계 갱신 API에서 동일 로직을 재사용한다.
- 리뷰 없는 음식점은 `review_count = 0`, `average_rating = 0`으로 반환되어 첫 리뷰 유도 UI를 구성할 수 있다.

### updated_at 트리거
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
- UF-020에서 명시된 `restaurants.updated_at` 갱신을 자동화하고, 향후 리뷰 수정 기능이 추가돼도 `reviews.updated_at`이 일관되게 관리된다.
