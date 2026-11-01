import { requireAdmin } from "@/lib/admin-auth";
import { AccountClient } from "@/components/AccountClient";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { user, admin } = await requireAdmin();
  return (
    <>
      <h1>Mi cuenta</h1>
      <AccountClient
        userId={user.id}
        email={user.email ?? ""}
        emailVerified={Boolean(user.email_confirmed_at)}
        fullName={admin.full_name ?? ""}
        phone={admin.phone ?? ""}
        avatarUrl={admin.avatar_url}
      />
    </>
  );
}
