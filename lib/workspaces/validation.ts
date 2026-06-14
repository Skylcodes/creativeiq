export function normalizeBrandUrl(input: string): string {
  let url = input.trim();

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  return url.replace(/\/+$/, "");
}

export function isValidBrandUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;

  try {
    const normalized = normalizeBrandUrl(trimmed);
    const parsed = new URL(normalized);
    const hostname = parsed.hostname;

    if (!hostname.includes(".")) return false;
    if (hostname === "localhost") return true;

    const parts = hostname.split(".");
    return parts.length >= 2 && parts.every((part) => part.length > 0);
  } catch {
    return false;
  }
}

export function validateWorkspaceInput(name: string, brandUrl: string) {
  const errors: { name?: string; brandUrl?: string } = {};

  if (!name.trim()) {
    errors.name = "Brand name is required.";
  }

  if (!brandUrl.trim()) {
    errors.brandUrl = "Website URL is required.";
  } else if (!isValidBrandUrl(brandUrl)) {
    errors.brandUrl = "Enter a valid URL (e.g. glowskin.co or https://glowskin.co).";
  }

  return errors;
}
