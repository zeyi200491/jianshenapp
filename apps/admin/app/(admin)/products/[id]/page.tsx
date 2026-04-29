"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/resource-state";
import { useApiResource } from "@/hooks/use-api-resource";
import type { Product } from "@/lib/contracts";
import { formatPrice } from "@/lib/utils";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading, reload } = useApiResource<Product>(`/api/v1/admin/products/${params.id}`);

  if (isLoading) {
    return <LoadingState title="正在加载商品详情..." />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? "商品不存在"} onRetry={() => void reload()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={data.name} description={data.subtitle} actions={[{ label: "编辑商品", href: `/products/${data.id}/edit` }]} />
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
          <div className="overflow-hidden rounded-[28px]">
            <Image alt={data.name} src={data.coverImageUrl} width={640} height={480} className="aspect-[4/3] w-full object-cover" unoptimized />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge tone={data.status}>{data.status}</Badge>
            <Badge tone="reviewed">{data.categoryName}</Badge>
          </div>
          <p className="mt-6 font-serif text-4xl text-ink">{formatPrice(data.priceCents)}</p>
          <p className="mt-4 text-sm leading-7 text-black/65">{data.description}</p>
        </section>
        <section className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl text-ink">商品信息</h2>
            <Link href="/products" className="text-sm text-leaf">返回列表</Link>
          </div>
          <dl className="mt-6 space-y-5 text-sm text-black/60">
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-black/40">分类标识</dt>
              <dd className="mt-2 text-base text-ink">{data.categorySlug}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-black/40">适用目标</dt>
              <dd className="mt-2 flex flex-wrap gap-2">{data.targetTags.map((tag) => <span key={tag} className="rounded-full bg-sand px-3 py-1 text-xs text-ink">{tag}</span>)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-black/40">适用场景</dt>
              <dd className="mt-2 flex flex-wrap gap-2">{data.sceneTags.map((tag) => <span key={tag} className="rounded-full bg-sand px-3 py-1 text-xs text-ink">{tag}</span>)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-black/40">详情图</dt>
              <dd className="mt-3 grid gap-3 md:grid-cols-2">
                {data.detailImages.map((image) => (
                  <div key={image} className="overflow-hidden rounded-[20px]">
                    <Image alt={data.name} src={image} width={640} height={480} className="aspect-[4/3] w-full object-cover" unoptimized />
                  </div>
                ))}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
