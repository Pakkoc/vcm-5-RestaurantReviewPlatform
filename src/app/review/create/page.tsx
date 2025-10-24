"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReviewCreatePageProps = {
  params: Promise<Record<string, never>>;
  searchParams?: Promise<Record<string, string | string[]>>;
};

export default function ReviewCreatePage({ params, searchParams }: ReviewCreatePageProps) {
  void params;
  void searchParams;

  const router = useRouter();
  const query = useSearchParams();
  const restaurantId = query.get("restaurantId");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">리뷰 작성</h1>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          뒤로가기
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            선택된 음식점 ID: <span className="font-mono text-slate-600">{restaurantId ?? "알 수 없음"}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-md">
            <Image
              src="https://picsum.photos/seed/restaurant/640/360"
              alt="placeholder"
              width={640}
              height={360}
              priority
            />
          </div>
          <p className="text-sm text-slate-600">
            이 페이지는 UC-007에서 폼과 제출 기능이 추가될 예정입니다.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}


