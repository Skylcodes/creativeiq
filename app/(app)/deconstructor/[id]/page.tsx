import { notFound, redirect } from "next/navigation";
import { DeconstructorExperience } from "@/components/deconstructor/deconstructor-experience";
import {
  getDeconstructionById,
  getSignedCreativeUrl,
} from "@/lib/deconstructions/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function DeconstructorDetailPage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { id } = await params;
  const deconstruction = await getDeconstructionById(id, user.id);

  if (!deconstruction) {
    notFound();
  }

  let creativePreviewUrl: string | null = null;
  if (
    deconstruction.input.creativeStoragePath &&
    deconstruction.input.creativeType === "image"
  ) {
    creativePreviewUrl = await getSignedCreativeUrl(
      deconstruction.input.creativeStoragePath
    );
  }

  return (
    <DeconstructorExperience
      deconstruction={deconstruction}
      creativePreviewUrl={creativePreviewUrl}
    />
  );
}
