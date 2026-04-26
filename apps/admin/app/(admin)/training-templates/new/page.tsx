import { PageHeader } from "@/components/admin/page-header";
import { TrainingTemplateForm } from "@/components/admin/training-template-form";

export default function NewTrainingTemplatePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="新建训练模板" description="统一用表单校验控制动作结构、组次、强度和标签，降低模板脏数据风险。" />
      <div className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
        <TrainingTemplateForm mode="create" />
      </div>
    </div>
  );
}
