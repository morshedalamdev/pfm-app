import { CategoryForm } from "@/components/settings/category-form";

export default async function EditCategoryPage({ params }: { params: Promise<{ categoryId: string }> }) {
  const { categoryId } = await params;
  return <CategoryForm categoryId={categoryId} />;
}
