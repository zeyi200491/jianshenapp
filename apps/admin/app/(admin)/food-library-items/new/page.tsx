import { PageHeader } from "@/components/admin/page-header";
import { FoodLibraryItemForm } from "@/components/admin/food-library-item-form";

export default function NewFoodLibraryItemPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="新建食物"
        description="新建与编辑复用同一份表单，确保食物编码、营养数据和标签结构一致。"
      />
      <div className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
        <FoodLibraryItemForm mode="create" />
      </div>
    </div>
  );
}
