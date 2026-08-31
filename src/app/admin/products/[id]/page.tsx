import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import ProductForm from "@/components/admin/ProductForm";
import DeleteButton from "@/components/admin/DeleteButton";
import { deleteProductAction } from "@/lib/admin-actions";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { images: { orderBy: { position: "asc" } } },
    }),
    db.category.findMany({ orderBy: { displayOrder: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!product) notFound();

  return (
    <>
      <PageHeader
        title="Edit product"
        description={`Last updated ${product.updatedAt.toLocaleString("en-IN")}.`}
        action={
          <div className="flex gap-2">
            <Link href={`/product/${product.slug}`} target="_blank" className="btn-ghost btn-sm">
              View on site ↗
            </Link>
            <DeleteButton
              action={deleteProductAction}
              id={product.id}
              label="Delete product"
              confirmText={`Delete "${product.name}"? This removes it from the site immediately and can't be undone.`}
            />
          </div>
        }
      />
      <ProductForm
        categories={categories}
        values={{
          id: product.id,
          name: product.name,
          categoryId: product.categoryId,
          spec: product.spec,
          description: product.description,
          code: product.code,
          price: product.price,
          priceOnEnquiry: product.priceOnEnquiry,
          availability: product.availability,
          published: product.published,
          isNew: product.isNew,
          slug: product.slug,
          imageUrls: product.images.map((i) => i.url),
        }}
      />
    </>
  );
}
