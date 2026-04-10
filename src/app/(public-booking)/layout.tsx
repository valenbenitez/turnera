import type { ReactNode } from "react";

import { BookingPageChrome } from "./booking-page-chrome";

export default function PublicBookingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <BookingPageChrome />
      <div className="public-booking-root">{children}</div>
    </>
  );
}
