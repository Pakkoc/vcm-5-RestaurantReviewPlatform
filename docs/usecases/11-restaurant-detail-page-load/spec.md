# UC-011: 음식점 세부 정보 페이지 로드

## Primary Actor
일반 사용자 (음식점의 상세 정보와 리뷰를 확인하고자 하는 사용자)

## Precondition
- 사용자가 지도 마커 클릭 또는 리뷰 작성 완료 후 리다이렉트를 통해 접근
- 음식점이 데이터베이스에 존재함

## Trigger
사용자가 음식점 세부 정보 페이지 URL로 접근 (`/restaurant/{restaurantId}`)

## Main Scenario

1. 사용자가 음식점 세부 정보 페이지 URL로 접근한다
2. 시스템은 URL 파라미터에서 음식점 ID를 추출한다
3. 시스템은 음식점 ID의 유효성을 검사한다
4. 시스템은 병렬로 두 개의 API를 호출한다:
   - 음식점 상세 정보: `GET /api/restaurants/{id}`
   - 리뷰 목록: `GET /api/restaurants/{restaurantId}/reviews`
5. 시스템은 음식점 정보 응답을 처리한다:
   - 음식점 이름
   - 전체 주소
   - 음식 카테고리
   - 평균 별점 (소수점 1자리)
   - 리뷰 개수
6. 시스템은 리뷰 목록 응답을 처리한다:
   - 최신순 정렬 (서버에서 정렬 또는 클라이언트 정렬)
   - 각 리뷰 데이터 포맷팅
7. 시스템은 페이지 컴포넌트를 렌더링한다
8. 사용자에게 음식점 정보와 리뷰 목록이 표시된다

## Edge Cases

### 음식점 ID 누락 또는 유효하지 않음
- **원인**: URL에 ID가 없거나 UUID 형식이 아님
- **처리**: 404 에러 페이지 표시, 메인 페이지로 돌아가기 버튼 제공

### 음식점 존재하지 않음 (404)
- **원인**: 음식점이 삭제되었거나 잘못된 ID
- **처리**: "음식점을 찾을 수 없습니다" 메시지 표시, 메인 페이지로 리다이렉트 유도

### 음식점 정보 API 호출 실패
- **원인**: 네트워크 오류, 서버 에러, 타임아웃
- **처리**: 에러 메시지 표시, 재시도 버튼 제공

### 리뷰 목록 API 호출 실패
- **원인**: 네트워크 오류, 서버 에러
- **처리**: 음식점 정보만 표시, 리뷰 로드 재시도 버튼 제공

### 리뷰가 없는 경우
- **원인**: 음식점에 아직 작성된 리뷰가 없음
- **처리**: "아직 리뷰가 없습니다. 첫 리뷰를 작성해보세요!" 메시지 표시

### 평균 평점 계산 오류
- **원인**: 리뷰는 있지만 평점 집계 오류
- **처리**: 평점 정보 숨김 또는 기본값(0.0) 표시

### 대량의 리뷰
- **원인**: 리뷰가 100개 이상 존재
- **처리**: 초기 로드 시 일부만 표시 (예: 10개), 더보기 버튼 또는 무한 스크롤 구현

### 병렬 API 호출 중 하나만 실패
- **원인**: 음식점 정보는 성공했으나 리뷰 목록 실패 (또는 그 반대)
- **처리**: 성공한 데이터만 표시, 실패한 부분은 재시도 옵션 제공

## Business Rules

- BR-001: 음식점 ID는 필수 파라미터이며, 유효하지 않으면 404 페이지를 표시한다
- BR-002: 평균 평점은 소수점 첫째 자리까지 표시한다
- BR-003: 리뷰는 최신순으로 정렬하여 표시한다
- BR-004: 리뷰가 없을 경우 안내 메시지와 함께 리뷰 작성 유도 버튼을 표시한다
- BR-005: 음식점 정보와 리뷰 목록은 병렬로 조회하여 로딩 시간을 최소화한다

## Sequence Diagram

```plantuml
@startuml
actor User
participant FE as "Frontend"
participant BE as "Backend"
database DB as "Database"

User -> FE: 페이지 접근\n/restaurant/{restaurantId}
activate FE

FE -> FE: URL 파라미터에서\n음식점 ID 추출

alt ID 누락 또는 유효하지 않음
    FE --> User: 404 에러 페이지
else ID 유효
    par 병렬 API 호출
        FE -> BE: GET /api/restaurants/{id}
        activate BE
        
        BE -> DB: SELECT * FROM restaurants\nLEFT JOIN restaurant_review_aggregates\nWHERE id = ?
        activate DB
        
        alt 음식점 존재
            DB --> BE: 음식점 정보 + 통계
            deactivate DB
            BE --> FE: {name, address, category,\naverage_rating, review_count}
            deactivate BE
        else 음식점 없음
            DB --> BE: NULL
            deactivate DB
            BE --> FE: 404 Not Found
            deactivate BE
        end
    and
        FE -> BE: GET /api/restaurants/{id}/reviews
        activate BE
        
        BE -> DB: SELECT * FROM reviews\nWHERE restaurant_id = ?\nORDER BY created_at DESC
        activate DB
        DB --> BE: 리뷰 목록
        deactivate DB
        
        BE --> FE: [{author_name, rating,\ncontent, created_at}, ...]
        deactivate BE
    end
    
    alt 모든 API 성공
        FE -> FE: 페이지 컴포넌트 렌더링
        
        FE --> User: 음식점 세부 정보 페이지\n- 음식점 정보\n- 평균 평점 및 리뷰 개수\n- 리뷰 목록
    else 음식점 정보 실패
        FE --> User: 404 에러 페이지\n메인으로 돌아가기 버튼
    else 리뷰 목록만 실패
        FE --> User: 음식점 정보 표시\n리뷰 로드 재시도 버튼
    end
end

deactivate FE

@enduml
```

