import type { ReactNode } from "react";

import { DashboardChrome } from "@/components/dashboard/dashboard-chrome";

export default function DashboardSectionLayout({ children }: { children: ReactNode }) {
  return <DashboardChrome>{children}</DashboardChrome>;
}
