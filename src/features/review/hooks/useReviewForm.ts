"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ReviewFormSchema,
  type ReviewFormData,
} from "@/features/review/lib/validation";

export const useReviewForm = () => {
  const form = useForm<ReviewFormData>({
    resolver: zodResolver(ReviewFormSchema),
    defaultValues: {
      authorName: "",
      rating: 0,
      content: "",
      password: "",
    },
    mode: "onChange",
  });

  const values = form.watch();

  const hasDirtyValue = useMemo(() => {
    return (
      values.authorName.trim().length > 0 ||
      values.rating > 0 ||
      values.content.trim().length > 0 ||
      values.password.trim().length > 0
    );
  }, [values.authorName, values.content, values.password, values.rating]);

  return {
    form,
    hasDirtyValue,
  };
};
