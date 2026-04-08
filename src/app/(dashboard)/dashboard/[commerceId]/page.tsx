import { CommerceSettingsForm } from "@/components/dashboard/commerce-settings-form";

type PageProps = {
  params: Promise<{ commerceId: string }>;
};

export default async function DashboardCommercePage({ params }: PageProps) {
  const { commerceId } = await params;

  return (
    <div className="mx-auto min-h-full w-full max-w-3xl px-4 py-8">
      <CommerceSettingsForm commerceId={commerceId} />
    </div>
  );
}
