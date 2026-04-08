import { ServicesPageClient } from "@/components/dashboard/services-page-client";

type PageProps = {
  params: Promise<{ commerceId: string }>;
};

export default async function CommerceServicesPage({ params }: PageProps) {
  const { commerceId } = await params;
  return <ServicesPageClient commerceId={commerceId} />;
}
