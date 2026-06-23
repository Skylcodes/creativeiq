import Link from "next/link";
import { redirect } from "next/navigation";
import { DeconstructorList } from "@/components/deconstructor/deconstructor-list";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import { getDeconstructionsForUser } from "@/lib/deconstructions/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DeconstructorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const items = await getDeconstructionsForUser(user.id);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Intelligence"
        title="Ad Deconstructor"
        description="Paste a competitor landing page and upload their ad — we verify evidence, then deconstruct and translate the strategy to your brand."
        action={
          <Link href="/deconstructor/new" className="btn-premium">
            Deconstruct ad
          </Link>
        }
      />
      <DeconstructorList items={items} />
    </PageShell>
  );
}
