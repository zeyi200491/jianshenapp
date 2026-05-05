"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormFieldWrapper, Input } from "@/components/ui/form-field";
import { apiRequest } from "@/lib/api-client";
import { flattenZodErrors, loginSchema } from "@/lib/validation";
import type { LoginResult } from "@/lib/contracts";
import { sanitizeInternalPath } from "@/lib/navigation";

function describeLoginError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("UNAUTHORIZED") || error.message.includes("401")) return "管理员账号或密码错误";
    if (error.message.includes("TOO_MANY_REQUESTS") || error.message.includes("429")) return "请求过于频繁，请稍后重试";
    if (error.message.includes("fetch")) return "网络请求失败，请检查网络连接";
  }
  return "登录失败，请重试";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [values, setValues] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    const result = loginSchema.safeParse(values);
    if (!result.success) {
      setErrors(flattenZodErrors(result.error));
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      await apiRequest<LoginResult>("/api/v1/admin/auth/login", {
        method: "POST",
        body: JSON.stringify(result.data),
      });
      router.push(sanitizeInternalPath(searchParams.get("next"), "/dashboard"));
      router.refresh();
    } catch (error) {
      setSubmitError(describeLoginError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FormFieldWrapper label="邮箱" error={errors.email}>
        <Input
          type="email"
          value={values.email}
          error={errors.email}
          onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
        />
      </FormFieldWrapper>
      <FormFieldWrapper label="密码" error={errors.password} hint="使用后端配置的管理员账号登录。">
        <Input
          type="password"
          value={values.password}
          error={errors.password}
          onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
        />
      </FormFieldWrapper>
      {submitError ? <p className="text-sm text-[#a14e3a]">{submitError}</p> : null}
      <Button className="w-full" disabled={submitting} type="submit">
        {submitting ? "登录中..." : "进入后台"}
      </Button>
    </form>
  );
}
