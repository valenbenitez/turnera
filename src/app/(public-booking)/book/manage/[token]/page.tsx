import { ManageBookingClient } from "@/components/booking/manage-booking-client";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function ManageAppointmentPage({ params }: PageProps) {
  const { token } = await params;

  return (
    <div className="mx-auto min-h-full max-w-lg px-4 py-8">
      <ManageBookingClient token={token} />
    </div>
  );
}
