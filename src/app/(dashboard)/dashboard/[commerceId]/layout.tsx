import type { ReactNode } from "react";

import { CommerceAccessGate } from "@/components/dashboard/commerce-access-gate";
import { CommerceSubnav } from "@/components/dashboard/commerce-subnav";
import { ProviderRouteGuard } from "@/components/dashboard/provider-route-guard";

type Props = {
  children: ReactNode;
  params: Promise<{ commerceId: string }>;
};

export default async function CommerceDashboardLayout({ children, params }: Props) {
  const { commerceId } = await params;

  return (
    <CommerceAccessGate commerceId={commerceId}>
      <CommerceSubnav commerceId={commerceId} />
      <ProviderRouteGuard commerceId={commerceId} />
      {children}
    </CommerceAccessGate>
  );
}
