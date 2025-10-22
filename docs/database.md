# Database Design

## 데이터 플로우 개요
- **UF-001/UF-005 지도 마커 로드**: `GET /api/restaurants/markers` 호출 시 `restaurants`와 리뷰 통계 뷰를 조인해 리뷰가 1건 이상인 음식점의 기본 정보(이름, 좌표, 카테고리, 평균 평점, 리뷰 수)를 반환한다.
- **UF-003/UF-019 검색 결과에서 리뷰 작성 진입**: 검색 결과 항목을 선택하면 `naver_place_id` 기준으로 음식점 존재 여부를 확인하고, 없으면 `restaurants`에 새 레코드를 생성한 뒤 생성된 `id`를 반환한다.
- **UF-009 리뷰 작성 제출 & UF-020 통계 갱신**: 사용자가 리뷰를 제출하면 `reviews`에 레코드가 추가되고, 트리거가 `restaurants`의 `updated_at`을 갱신하며 통계 뷰에서 평균 평점과 리뷰 수가 즉시 반영된다.
- **UF-007/UF-011 상세 페이지 진입**: `GET /api/restaurants/{id}`는 `restaurants`와 리뷰 통계 뷰를 조회해 음식점 기본 정보와 집계값을 응답하고, `GET /api/restaurants/{id}/reviews`는 `reviews` 테이블에서 최신순으로 목록을 가져와 작성자명, 평점, 내용, 작성일을 전달한다.
- **UF-021 리뷰 비밀번호 검증(미래 기능)**: 리뷰 수정·삭제 전 검증 시 입력 비밀번호를 해시한 뒤 `reviews.password_hash`와 비교해 일치 여부를 판단한다.

## 테이블 설계

### `restaurants`
| 컬럼 | 타입 | 제약/설명 |
| --- | --- | --- |
| `id` | uuid | 기본 키, `gen_random_uuid()` 기본값 |
| `name` | varchar(255) | NOT NULL, 음식점 이름 |
| `address` | text | NOT NULL, 전체 주소 |
| `category` | varchar(100) | NULL 허용, 음식 카테고리 |
| `latitude` | numeric(9,6) | NOT NULL, 위도 |
| `longitude` | numeric(9,6) | NOT NULL, 경도 |
| `naver_place_id` | varchar(255) | 고유 인덱스, 네이버 플레이스 ID |
| `created_at` | timestamptz | NOT NULL, 기본값 `now()` |
| `updated_at` | timestamptz | NOT NULL, 기본값 `now()`, 업데이트 트리거로 갱신 |

**인덱스**
- `restaurants_naver_place_id_key` (UNIQUE) — UF-019에서 중복 저장 방지.
- `(latitude, longitude)` B-Tree — 지도 범위 내 필터링을 대비한 위치 기반 조회 최적화.

### `reviews`
| 컬럼 | 타입 | 제약/설명 |
| --- | --- | --- |
| `id` | uuid | 기본 키, `gen_random_uuid()` 기본값 |
| `restaurant_id` | uuid | NOT NULL, `restaurants.id` 참조 (ON DELETE CASCADE) |
| `author_name` | varchar(20) | NOT NULL, 작성자명 (UF-008 길이 제한) |
| `rating` | smallint | NOT NULL, CHECK `rating BETWEEN 1 AND 5` |
| `content` | text | NOT NULL, CHECK `char_length(content) BETWEEN 10 AND 500` |
| `password_hash` | varchar(255) | NOT NULL, 해시된 비밀번호 (UF-009, UF-021) |
| `created_at` | timestamptz | NOT NULL, 기본값 `now()` |
| `updated_at` | timestamptz | NOT NULL, 기본값 `now()`, 업데이트 트리거로 갱신 |

**인덱스**
- `reviews_restaurant_id_idx` — 음식점 상세/리뷰 목록 조회(UF-011) 최적화.
- `reviews_created_at_idx` — 최신순 정렬 보조 인덱스.

## 파생 뷰 및 트리거

### `restaurant_review_stats` 뷰
```sql
CREATE VIEW restaurant_review_stats AS
SELECT
  r.id AS restaurant_id,
  COUNT(rv.id) AS review_count,
  COALESCE(ROUND(AVG(rv.rating)::numeric, 1), 0) AS average_rating
FROM restaurants r
LEFT JOIN reviews rv ON rv.restaurant_id = r.id
GROUP BY r.id;
```
- UF-001/UF-005의 마커 데이터와 UF-011 상세 정보에서 평균 평점, 리뷰 수를 일관되게 제공하기 위한 집계 레이어.
- 리뷰가 없는 경우 `review_count`는 0, `average_rating`은 0으로 반환하여 UI에서 첫 리뷰 유도를 처리한다.

### 타임스탬프 갱신 트리거
```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_restaurants_updated_at
BEFORE UPDATE ON restaurants
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```
- Supabase 가이드라인과 UF-020의 “음식점 레코드의 updated_at 타임스탬프 갱신” 요구를 충족한다.
- 리뷰 수정(미래 기능) 시에도 동일 로직으로 타임스탬프가 갱신된다.

