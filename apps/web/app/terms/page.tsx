import Link from 'next/link';
import { APP_BRAND_NAME } from '@/lib/brand';

const terms = [
  `${APP_BRAND_NAME}提供训练、饮食和执行复盘建议，所有内容仅用于健康管理参考，不替代医疗建议、疾病诊断或治疗方案。`,
  '用户应保证填写的邮箱、身体数据、训练目标和饮食限制真实准确。错误数据可能导致计划不适合当前身体状态。',
  '如果出现胸痛、眩晕、明显不适或医生明确限制运动，应立即停止训练并寻求专业帮助。',
  '用户不得绕过鉴权、抓取他人数据、攻击服务或上传违法内容。后台账号仅限授权运营人员使用。',
  '平台可以基于安全、合规或产品维护原因暂停部分功能，并会通过页面或运营渠道说明重要变更。',
];

export default function TermsPage() {
  return (
    <main id="main-content" className="min-h-screen bg-[#eef4f9] px-6 py-16">
      <section className="mx-auto max-w-4xl rounded-[36px] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#0f7ea5]">Terms</p>
        <h1 className="mt-4 text-5xl font-semibold text-[#17324d]">用户协议</h1>
        <p className="mt-5 text-lg leading-9 text-[#5f768d]">
          使用{APP_BRAND_NAME}前，请确认你理解产品边界：它是训练饮食执行工具，不是医疗服务。
        </p>
        <ol className="mt-10 grid gap-4">
          {terms.map((item, index) => (
            <li key={item} className="rounded-[28px] bg-[#f4f0e8] p-6 text-base leading-8 text-[#5f768d]">
              <span className="mr-3 font-semibold text-[#17324d]">{index + 1}.</span>
              {item}
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/privacy" className="rounded-full bg-[#17324d] px-5 py-3 text-sm font-semibold text-white">
            查看隐私政策
          </Link>
          <Link href="/account" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#17324d]">
            前往个人中心
          </Link>
        </div>
      </section>
    </main>
  );
}
