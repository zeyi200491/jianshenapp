import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="新建商品" description="只维护展示所需字段，后续若接入正式商城链路可在此基础上扩展。" />
      <div className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
        <ProductForm mode="create" />
      </div>
    </div>
  );
}
