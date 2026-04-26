import { PageHeader } from "@/components/admin/page-header";
import { WeeklyTrainingTemplateForm } from "@/components/admin/weekly-training-template-form";

export default function NewWeeklyTrainingTemplatePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="新建周训练模板" description="按周一到周天录入训练和休息安排，让模板更贴合真实训练节奏。" />
      <div className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
        <WeeklyTrainingTemplateForm mode="create" />
      </div>
    </div>
  );
}
