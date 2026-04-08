import { StaffPageClient } from "@/components/dashboard/staff-page-client";

type PageProps = {
  params: Promise<{ commerceId: string }>;
};

export default async function CommerceStaffPage({ params }: PageProps) {
  const { commerceId } = await params;
  return <StaffPageClient commerceId={commerceId} />;
}
