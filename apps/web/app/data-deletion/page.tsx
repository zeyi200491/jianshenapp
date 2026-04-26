import Link from 'next/link';
import { APP_BRAND_NAME } from '@/lib/brand';

const steps = [
  '登录后进入个人中心，点击“申请删除数据”。',
  '系统会生成待处理申请，运营人员会按账号身份和风险记录完成核验。',
  '核验通过后，会删除账号相关的训练、饮食、打卡、AI 对话和身体数据。',
  '如存在法律、财务或安全审计必须保留的记录，只会保留最小必要字段并做脱敏处理。',
];

export default function DataDeletionPage() {
  return (
    <main id="main-content" className="min-h-screen bg-[#17324d] px-6 py-16 text-white">
      <section className="mx-auto max-w-4xl rounded-[36px] bg-white/10 p-8 shadow-sm ring-1 ring-white/15">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#c9d8a8]">Data Rights</p>
        <h1 className="mt-4 text-5xl font-semibold">数据删除</h1>
        <p className="mt-5 text-lg leading-9 text-white/78">
          {APP_BRAND_NAME}提供账号数据删除申请机制。由于产品涉及身体数据、训练记录和饮食偏好，删除前需要确认申请来自本人。
        </p>
        <div className="mt-10 grid gap-4">
          {steps.map((step, index) => (
            <div key={step} className="rounded-[28px] bg-white p-6 text-[#17324d]">
              <p className="text-sm font-semibold text-[#0f7ea5]">步骤 {index + 1}</p>
              <p className="mt-2 text-base leading-8">{step}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/account" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#17324d]">
            前往个人中心
          </Link>
          <Link href="/privacy" className="rounded-full bg-white/15 px-5 py-3 text-sm font-semibold text-white">
            查看隐私政策
          </Link>
        </div>
      </section>
    </main>
  );
}
