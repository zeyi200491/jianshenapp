"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormFieldWrapper, Input, Select, Textarea } from "@/components/ui/form-field";
import { apiRequest } from "@/lib/api-client";
import type { Product } from "@/lib/contracts";
import { flattenZodErrors, productSchema } from "@/lib/validation";
import { splitLines } from "@/lib/utils";

export function ProductForm({ initialValue, mode }: { initialValue?: Product; mode: "create" | "edit" }) {
  const router = useRouter();
  const [values, setValues] = useState({
    name: initialValue?.name ?? "",
    categoryName: initialValue?.categoryName ?? "基础补剂",
    categorySlug: initialValue?.categorySlug ?? "supplement",
    subtitle: initialValue?.subtitle ?? "",
    description: initialValue?.description ?? "",
    targetTags: initialValue?.targetTags ?? [],
    sceneTags: initialValue?.sceneTags ?? [],
    priceCents: initialValue?.priceCents ?? 0,
    coverImageUrl: initialValue?.coverImageUrl ?? "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80",
    detailImages: initialValue?.detailImages ?? [],
    status: initialValue?.status ?? "draft",
    sortOrder: initialValue?.sortOrder ?? 0,
  });
  const [targetTagText, setTargetTagText] = useState((initialValue?.targetTags ?? []).join("\n"));
  const [sceneTagText, setSceneTagText] = useState((initialValue?.sceneTags ?? []).join("\n"));
  const [detailImageText, setDetailImageText] = useState((initialValue?.detailImages ?? []).join("\n"));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const title = useMemo(() => (mode === "create" ? "创建商品" : "保存商品"), [mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    const payload = {
      ...values,
      targetTags: splitLines(targetTagText),
      sceneTags: splitLines(sceneTagText),
      detailImages: splitLines(detailImageText),
    };

    const result = productSchema.safeParse(payload);
    if (!result.success) {
      setErrors(flattenZodErrors(result.error));
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const response = await apiRequest<Product>(mode === "create" ? "/api/v1/admin/products" : `/api/v1/admin/products/${initialValue?.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        body: JSON.stringify(result.data),
      });
      router.push(`/products/${response.id}`);
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 lg:grid-cols-2">
        <FormFieldWrapper label="商品名称" error={errors.name}>
          <Input value={values.name} error={errors.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} />
        </FormFieldWrapper>
        <FormFieldWrapper label="副标题" error={errors.subtitle}>
          <Input value={values.subtitle} error={errors.subtitle} onChange={(event) => setValues((current) => ({ ...current, subtitle: event.target.value }))} />
        </FormFieldWrapper>
        <FormFieldWrapper label="分类名称" error={errors.categoryName}>
          <Input value={values.categoryName} error={errors.categoryName} onChange={(event) => setValues((current) => ({ ...current, categoryName: event.target.value }))} />
        </FormFieldWrapper>
        <FormFieldWrapper label="分类标识" error={errors.categorySlug} hint="建议使用英文短标识，例如 supplement。">
          <Input value={values.categorySlug} error={errors.categorySlug} onChange={(event) => setValues((current) => ({ ...current, categorySlug: event.target.value }))} />
        </FormFieldWrapper>
        <FormFieldWrapper label="价格(分)" error={errors.priceCents}>
          <Input type="number" value={values.priceCents} error={errors.priceCents} onChange={(event) => setValues((current) => ({ ...current, priceCents: Number(event.target.value) }))} />
        </FormFieldWrapper>
        <FormFieldWrapper label="排序值" error={errors.sortOrder}>
          <Input type="number" value={values.sortOrder} error={errors.sortOrder} onChange={(event) => setValues((current) => ({ ...current, sortOrder: Number(event.target.value) }))} />
        </FormFieldWrapper>
        <FormFieldWrapper label="状态" error={errors.status}>
          <Select value={values.status} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as Product["status"] }))}>
            <option value="draft">草稿</option>
            <option value="active">已上架</option>
            <option value="inactive">已下架</option>
          </Select>
        </FormFieldWrapper>
        <FormFieldWrapper label="封面图 URL" error={errors.coverImageUrl}>
          <Input value={values.coverImageUrl} error={errors.coverImageUrl} onChange={(event) => setValues((current) => ({ ...current, coverImageUrl: event.target.value }))} />
        </FormFieldWrapper>
      </div>

      <FormFieldWrapper label="商品描述" error={errors.description}>
        <Textarea value={values.description} error={errors.description} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} />
      </FormFieldWrapper>

      <div className="grid gap-4 lg:grid-cols-3">
        <FormFieldWrapper label="适用目标" error={errors.targetTags} hint="每行一个标签，例如：减脂、增肌。">
          <Textarea value={targetTagText} error={errors.targetTags} onChange={(event) => setTargetTagText(event.target.value)} />
        </FormFieldWrapper>
        <FormFieldWrapper label="适用场景" error={errors.sceneTags} hint="每行一个场景标识，例如：canteen、dorm。">
          <Textarea value={sceneTagText} error={errors.sceneTags} onChange={(event) => setSceneTagText(event.target.value)} />
        </FormFieldWrapper>
        <FormFieldWrapper label="详情图 URL" error={errors.detailImages} hint="每行一张图片地址。">
          <Textarea value={detailImageText} error={errors.detailImages} onChange={(event) => setDetailImageText(event.target.value)} />
        </FormFieldWrapper>
      </div>

      {submitError ? <p className="text-sm text-[#a14e3a]">{submitError}</p> : null}
      <div className="flex gap-3">
        <Button disabled={submitting} type="submit">{submitting ? `${title}中...` : title}</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>取消</Button>
      </div>
    </form>
  );
}
