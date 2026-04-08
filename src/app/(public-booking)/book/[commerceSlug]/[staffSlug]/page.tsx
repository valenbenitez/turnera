import { BookCommerceClient } from "@/components/booking/book-commerce-client";

type PageProps = {
  params: Promise<{ commerceSlug: string; staffSlug: string }>;
};

export default async function BookStaffPage({ params }: PageProps) {
  const { commerceSlug, staffSlug } = await params;

  return (
    <BookCommerceClient
      commerceSlug={commerceSlug}
      initialStaffSlug={staffSlug}
    />
  );
}
