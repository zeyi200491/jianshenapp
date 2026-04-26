import Link from 'next/link';
import { APP_BRAND_NAME } from '@/lib/brand';

const sections = [
  {
    title: '我们会收集哪些信息',
    body: `${APP_BRAND_NAME}会处理邮箱、登录会话、训练目标、身体数据、饮食偏好、每日打卡、AI 对话和使用反馈。这些数据只用于生成训练饮食计划、同步执行状态和改进产品体验。`,
  },
  {
    title: '身体数据如何使用',
    body: '身高、体重、训练经验、目标类型和饮食限制等信息，会用于计算热量目标、训练强度和执行提醒。系统不会把这些数据当作医疗诊断，也不能替代医生或营养师建议。',
  },
  {
    title: '数据保存与删除',
    body: '用户可以在个人中心提交数据删除申请。申请进入待处理状态后，运营人员需要完成身份核验、留存确认和删除执行记录归档。',
  },
  {
    title: '安全措施',
    body: '正式环境使用 HttpOnly Cookie 会话、生产密钥强制校验、CORS 白名单和后台权限校验。日志与运维记录应避免输出邮箱、身体数据和会话令牌。',
  },
];

export default function PrivacyPage() {
  return (
    <main id="main-content" className="min-h-screen bg-[#f4f0e8] px-6 py-16">
      <section className="mx-auto max-w-4xl rounded-[36px] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6a7f4f]">Privacy</p>
        <h1 className="mt-4 text-5xl font-semibold text-[#17324d]">隐私政策</h1>
        <p className="mt-5 text-lg leading-9 text-[#5f768d]">
          本页面说明{APP_BRAND_NAME}在训练、饮食和 AI 助手场景中如何处理个人信息与身体数据。上线前仍应由法务或负责人按实际运营主体复核。
        </p>
        <div className="mt-10 grid gap-5">
          {sections.map((section) => (
            <article key={section.title} className="rounded-[28px] bg-[#eef4f9] p-6">
              <h2 className="text-xl font-semibold text-[#17324d]">{section.title}</h2>
              <p className="mt-3 text-base leading-8 text-[#5f768d]">{section.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/terms" className="rounded-full bg-[#17324d] px-5 py-3 text-sm font-semibold text-white">
            查看用户协议
          </Link>
          <Link href="/data-deletion" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#17324d]">
            数据删除说明
          </Link>
        </div>
      </section>
    </main>
  );
}
