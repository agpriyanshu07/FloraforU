import { PageHeader } from "@/components/admin/ui";
import ProductForm from "@/components/admin/ProductForm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await db.category.findMany({
    orderBy: { displayOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <>
      <PageHeader
        title="Add a product"
        description="It goes live on the site as soon as you save, unless you untick Published."
      />
      <ProductForm categories={categories} />
    </>
  );
}
