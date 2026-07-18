import { CategoryForm } from "@/components/settings/category-form";

export default async function NewCategoryPage({ searchParams }: { searchParams: Promise<{ kind?: string; next?: string }> }) {
  const { kind, next } = await searchParams;
  return <CategoryForm kind={kind} next={next} />;
}
