# Implementation Plan: UC-013 뒤로가기 버튼 클릭 (음식점 세부 정보 페이지)

## 개요

음식점 세부 정보 페이지에서 뒤로가기 버튼 클릭 시 이전 페이지 또는 메인 페이지로 이동하는 기능입니다.

### 모듈 목록

| 모듈 | 위치 | 설명 |
|------|------|------|
| **RestaurantDetailPage** | `src/app/restaurant/[restaurantId]/page.tsx` | 뒤로가기 버튼 (이미 구현됨) |

---

## Implementation Plan

### 1. 기존 구현 확인

UC-011에서 이미 구현됨:
```typescript
<Button variant="ghost" onClick={() => router.back()}>
  <ArrowLeft className="mr-2 h-4 w-4" />
  뒤로가기
</Button>
```

`router.back()`은 브라우저 히스토리가 있으면 이전 페이지로, 없으면 자동으로 처리됩니다.

### 2. 추가 작업 (선택 사항)

히스토리 없을 때 명시적 처리:
```typescript
const handleBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/');
  }
};
```

### 3. QA Sheet

- ✅ 히스토리 있을 때 이전 페이지로 이동
- ✅ 히스토리 없을 때 메인 페이지로 이동
- ✅ 페이지 전환 애니메이션

### 4. 의존성

- **선행 작업**: UC-011
- **후속 작업**: 없음

