import { BookCommerceClient } from "@/components/booking/book-commerce-client";

type PageProps = {
  params: Promise<{ commerceSlug: string }>;
};

export default async function BookCommercePage({ params }: PageProps) {
  const { commerceSlug } = await params;

  return <BookCommerceClient commerceSlug={commerceSlug} />;
}
