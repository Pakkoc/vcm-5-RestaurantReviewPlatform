# Database Design

## 데이터 플로우 개요
- **UF-001 · UF-005 지도 마커 노출**: `GET /api/restaurants/markers`는 `restaurant_review_aggregates` 뷰에서 리뷰 수가 1 이상인 레코드만 가져와 음식점명, 좌표, 카테고리, 평균 평점, 리뷰 개수를 지도 툴팁에 전달한다.
- **UF-003 · UF-019 검색 결과 → 리뷰 작성 진입**: 검색 모달에서 리뷰 작성 버튼을 누르면 `naver_place_id` 기준으로 `restaurants`를 조회하고, 미존재 시 동일 데이터를 INSERT 한 뒤 반환된 `id`로 리뷰 작성 페이지를 연다.
- **UF-007 · UF-011 상세 페이지 로드**: `GET /api/restaurants/{id}`는 `restaurants`와 `restaurant_review_aggregates` 뷰를 조인해 기본 정보·통계를 제공하고, `GET /api/restaurants/{id}/reviews`는 `reviews`를 최신순으로 조회해 작성자명, 작성일, 평점, 내용을 전달한다.
- **UF-009 리뷰 작성 제출 & UF-020 통계 반영**: 신규 리뷰가 `reviews`에 INSERT되면 서버가 비밀번호를 해시하여 저장하고, 뷰 집계 결과가 즉시 업데이트된다. `touch_updated_at` 트리거가 `restaurants.updated_at`을 동기화해 마커/상세 정보 API가 최신 상태를 제공한다.
- **UF-021 비밀번호 검증(향후)**: 리뷰 수정·삭제 시 입력된 비밀번호를 동일한 해시 방식으로 처리해 `reviews.password_hash`와 비교하여 일치 여부를 검증한다.

## 스키마 설계 (PostgreSQL)

### restaurants
| 컬럼 | 타입 | 제약/설명 |
| --- | --- | --- |
| `id` | uuid | PK, DEFAULT `gen_random_uuid()` |
| `name` | varchar(255) | NOT NULL, CHECK `char_length(btrim(name)) > 0` |
| `address` | text | NOT NULL |
| `category` | varchar(100) | NULL 허용 (네이버 응답에 따라 비어있을 수 있음) |
| `latitude` | numeric(10,7) | NOT NULL, CHECK `latitude BETWEEN -90 AND 90` |
| `longitude` | numeric(11,7) | NOT NULL, CHECK `longitude BETWEEN -180 AND 180` |
| `naver_place_id` | varchar(255) | UNIQUE, NULL 허용 |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() |

**인덱스**
- `restaurants_naver_place_id_key` (UNIQUE) — UF-019에서 중복 저장을 차단한다.

### reviews
| 컬럼 | 타입 | 제약/설명 |
| --- | --- | --- |
| `id` | uuid | PK, DEFAULT `gen_random_uuid()` |
| `restaurant_id` | uuid | NOT NULL, FK → `restaurants(id)` ON DELETE CASCADE |
| `author_name` | varchar(20) | NOT NULL, CHECK `char_length(btrim(author_name)) BETWEEN 1 AND 20` |
| `rating` | smallint | NOT NULL, CHECK `rating BETWEEN 1 AND 5` |
| `content` | text | NOT NULL, CHECK `char_length(btrim(content)) BETWEEN 10 AND 500` |
| `password_hash` | varchar(72) | NOT NULL (bcrypt 등 고정 길이 해시 문자열 저장) |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() |

**인덱스**
- `idx_reviews_restaurant_created_at` ON (`restaurant_id`, `created_at` DESC) — UF-011에서 최신순 목록 응답에 사용한다.

## 파생 객체

### restaurant_review_aggregates 뷰
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
- 지도 마커, 상세 페이지, 통계 갱신 로직이 동일 집계 결과를 공유한다.
- 리뷰가 없으면 `review_count = 0`, `average_rating = NULL`로 반환되어 UI에서 “첫 리뷰 작성” 메시지를 자연스럽게 안내할 수 있다.

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
- UF-020이 요구하는 `restaurants.updated_at` 자동 갱신을 보장하며, 추후 리뷰 수정 기능이 추가될 때도 `reviews.updated_at`이 일관되게 유지된다.

