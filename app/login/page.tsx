import { redirect } from "next/navigation";

type LoginRedirectProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginRedirect({ searchParams }: LoginRedirectProps) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value)) {
      for (const item of value) qs.append(key, item);
    }
  }
  const suffix = qs.toString();
  redirect(suffix ? `/sign-in?${suffix}` : "/sign-in");
}
