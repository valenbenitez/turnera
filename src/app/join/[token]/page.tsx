import { JoinInviteClient } from "@/components/join/join-invite-client";

type PageProps = { params: Promise<{ token: string }> };

export default async function JoinInvitePage({ params }: PageProps) {
  const { token } = await params;
  const normalized = token.trim().toLowerCase();
  return (
    <div className="flex min-h-dvh flex-col justify-center px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <JoinInviteClient token={normalized} />
      </div>
    </div>
  );
}
