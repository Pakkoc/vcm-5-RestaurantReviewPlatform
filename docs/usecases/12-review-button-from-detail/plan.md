# Implementation Plan: UC-012 음식점 세부 정보 페이지에서 리뷰 작성 버튼 클릭

## 개요

음식점 세부 정보 페이지에서 리뷰 작성 버튼 클릭 시 리뷰 작성 페이지로 네비게이션하는 기능입니다.

### 모듈 목록

| 모듈 | 위치 | 설명 |
|------|------|------|
| **RestaurantDetailPage** | `src/app/restaurant/[restaurantId]/page.tsx` | 리뷰 작성 버튼 핸들러 (이미 구현됨) |

---

## Implementation Plan

### 1. 기존 구현 확인

UC-011에서 이미 구현됨:
```typescript
<Button
  onClick={() => router.push(`/review/create?restaurantId=${restaurantId}`)}
  className="w-full"
>
  리뷰 작성하기
</Button>
```

### 2. 추가 작업

디바운싱 추가 (선택 사항):
```typescript
const [isNavigating, setIsNavigating] = useState(false);

const handleReviewButtonClick = () => {
  if (isNavigating) return;
  
  setIsNavigating(true);
  router.push(`/review/create?restaurantId=${restaurantId}`);
};
```

### 3. QA Sheet

- ✅ 리뷰 작성 페이지로 네비게이션
- ✅ restaurantId 파라미터 전달
- ✅ 연속 클릭 방지

### 4. 의존성

- **선행 작업**: UC-011
- **후속 작업**: UC-007

