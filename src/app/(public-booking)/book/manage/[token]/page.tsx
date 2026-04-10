import { ManageBookingClient } from "@/components/booking/manage-booking-client";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function ManageAppointmentPage({ params }: PageProps) {
  const { token } = await params;

  return (
    <div className="mx-auto min-h-full w-full min-w-0 max-w-3xl px-2 py-8 sm:px-5 md:px-8">
      <ManageBookingClient token={token} />
    </div>
  );
}
