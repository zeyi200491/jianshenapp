import { Button } from "@/components/ui/button";

export function LoadingState({ title = "正在加载数据..." }: { title?: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-black/15 bg-white/70 px-6 py-12 text-center text-sm text-black/55">
      {title}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-black/15 bg-white/70 px-6 py-12 text-center">
      <h3 className="font-serif text-2xl text-ink">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-black/55">{description}</p>
      {actionLabel && onAction ? (
        <div className="mt-6">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      ) : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-[#efd3cb] bg-[#fff4f1] px-6 py-12 text-center">
      <h3 className="font-serif text-2xl text-[#7f3f33]">加载失败</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#8b5b4f]">{message}</p>
      {onRetry ? (
        <div className="mt-6">
          <Button variant="danger" onClick={onRetry}>
            重试
          </Button>
        </div>
      ) : null}
    </div>
  );
}

