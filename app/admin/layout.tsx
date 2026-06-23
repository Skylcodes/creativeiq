import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Hard server-side gate — redirect any non-admin immediately
  if (!user || !isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <div className="border-b border-white/[0.06] bg-[#0d0d0f]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-white/30">
              Advara
            </span>
            <span className="text-white/20">/</span>
            <span className="text-sm font-semibold text-white/70">Admin</span>
          </div>
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
            Founder Access
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <AdminNav />
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
