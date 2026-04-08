import { AgendaPageClient } from "@/components/dashboard/agenda-page-client";

type PageProps = {
  params: Promise<{ commerceId: string }>;
};

export default async function AgendaPage({ params }: PageProps) {
  const { commerceId } = await params;

  return <AgendaPageClient commerceId={commerceId} />;
}
