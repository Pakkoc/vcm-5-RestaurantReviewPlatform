"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PasswordDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  attemptsLeft?: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: (password: string) => Promise<void> | void;
};

export const PasswordDialog = ({
  open,
  title,
  description = "리뷰 작성 시 입력했던 비밀번호를 입력해 주세요.",
  confirmLabel = "확인",
  cancelLabel = "취소",
  isSubmitting,
  errorMessage,
  attemptsLeft,
  onOpenChange,
  onConfirm,
}: PasswordDialogProps) => {
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setLocalError(null);
    }
  }, [open]);

  const handleConfirm = async () => {
    const trimmed = password.trim();

    if (trimmed.length < 4) {
      setLocalError("비밀번호는 최소 4자 이상 입력해 주세요.");
      return;
    }

    setLocalError(null);
    await onConfirm(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="review-password">비밀번호</Label>
            <Input
              id="review-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleConfirm();
                }
              }}
              placeholder="비밀번호를 입력하세요"
              autoFocus
              disabled={isSubmitting}
            />
          </div>
          {localError ? (
            <p className="text-sm text-red-500">{localError}</p>
          ) : null}
          {errorMessage ? (
            <p className="text-sm text-red-500">{errorMessage}</p>
          ) : null}
          {typeof attemptsLeft === "number" ? (
            <p className="text-xs text-slate-500">
              남은 시도 횟수: {attemptsLeft}회
            </p>
          ) : null}
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isSubmitting}
          >
            {isSubmitting ? "확인 중..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
