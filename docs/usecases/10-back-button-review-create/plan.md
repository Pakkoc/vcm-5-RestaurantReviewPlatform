# Implementation Plan: UC-010 뒤로가기 버튼 클릭 (리뷰 작성 페이지)

## 개요

리뷰 작성 페이지에서 뒤로가기 버튼 클릭 시 데이터 손실 경고 및 네비게이션 기능을 구현합니다.

### 모듈 목록

| 모듈 | 위치 | 설명 |
|------|------|------|
| **ReviewCreatePage** | `src/app/review/create/page.tsx` | 뒤로가기 핸들러 추가 |
| **ConfirmDialog Component** | `src/components/ui/confirm-dialog.tsx` | 확인 다이얼로그 (공통) |

---

## Implementation Plan

### 1. Component: `src/components/ui/confirm-dialog.tsx`

```typescript
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
};

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
}: ConfirmDialogProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>확인</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
```

### 2. Page 수정: `src/app/review/create/page.tsx`

```typescript
const [showConfirmDialog, setShowConfirmDialog] = useState(false);
const formValues = watch(); // react-hook-form

const hasFormData = () => {
  return (
    formValues.author_name.trim() ||
    formValues.rating > 0 ||
    formValues.content.trim() ||
    formValues.password.trim()
  );
};

const handleBack = () => {
  if (hasFormData()) {
    setShowConfirmDialog(true);
  } else {
    router.back();
  }
};

const handleConfirmBack = () => {
  setShowConfirmDialog(false);
  router.back();
};

// JSX
<Button variant="ghost" onClick={handleBack}>
  <ArrowLeft className="mr-2 h-4 w-4" />
  뒤로가기
</Button>

<ConfirmDialog
  isOpen={showConfirmDialog}
  onClose={() => setShowConfirmDialog(false)}
  onConfirm={handleConfirmBack}
  title="페이지를 나가시겠습니까?"
  description="작성 중인 내용이 저장되지 않습니다."
/>
```

### 3. QA Sheet

- ✅ 데이터 입력 시 확인 다이얼로그 표시
- ✅ 데이터 없을 시 즉시 뒤로가기
- ✅ 확인 시 네비게이션
- ✅ 취소 시 현재 페이지 유지

### 4. 의존성

- **선행 작업**: UC-008
- **후속 작업**: 없음
- **shadcn-ui**: alert-dialog 컴포넌트 필요

