import type { ReactNode } from "react";

import { CommerceAccessGate } from "@/components/dashboard/commerce-access-gate";
import { CommerceSubnav } from "@/components/dashboard/commerce-subnav";

type Props = {
  children: ReactNode;
  params: Promise<{ commerceId: string }>;
};

export default async function CommerceDashboardLayout({ children, params }: Props) {
  const { commerceId } = await params;

  return (
    <CommerceAccessGate commerceId={commerceId}>
      <CommerceSubnav commerceId={commerceId} />
      {children}
    </CommerceAccessGate>
  );
}
