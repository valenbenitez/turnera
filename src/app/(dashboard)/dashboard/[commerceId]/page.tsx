import { CommerceOnboardingTour } from "@/components/dashboard/commerce-onboarding-tour";
import { CommerceSettingsForm } from "@/components/dashboard/commerce-settings-form";

type PageProps = {
  params: Promise<{ commerceId: string }>;
  searchParams: Promise<{ onboarding?: string }>;
};

export default async function DashboardCommercePage({
  params,
  searchParams,
}: PageProps) {
  const { commerceId } = await params;
  const sp = await searchParams;

  return (
    <div className="mx-auto min-h-full w-full max-w-3xl px-4 py-8">
      <CommerceOnboardingTour
        commerceId={commerceId}
        startFromQuery={sp.onboarding === "1"}
      />
      <CommerceSettingsForm commerceId={commerceId} />
    </div>
  );
}
