import { PageHeader } from "@/components/admin/page-header";
import { DietTemplateForm } from "@/components/admin/diet-template-form";

export default function NewDietTemplatePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="新建饮食模板" description="新建页与编辑页使用统一校验逻辑，确保模板结构稳定可复用。" />
      <div className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
        <DietTemplateForm mode="create" />
      </div>
    </div>
  );
}
