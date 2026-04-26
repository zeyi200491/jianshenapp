"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { LoadingState } from "@/components/admin/resource-state";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      const response = await fetch("/api/v1/admin/auth/me", {
        method: "GET",
        cache: "no-store",
      });

      if (cancelled) {
        return;
      }

      if (!response.ok) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      setChecked(true);
    }

    verifySession().catch(() => {
      if (!cancelled) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!checked) {
    return (
      <div className="min-h-screen bg-sand p-6">
        <LoadingState title="正在校验登录状态..." />
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
