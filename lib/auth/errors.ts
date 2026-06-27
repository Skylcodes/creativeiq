export function getAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Something went wrong. Please try again.";
  }

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "";

  const code =
    "code" in error && typeof error.code === "string" ? error.code : "";

  const lower = message.toLowerCase();
  const lowerCode = code.toLowerCase();

  if (
    lowerCode.includes("over_email_send_rate_limit") ||
    lower.includes("over_email_send_rate_limit")
  ) {
    return "Too many confirmation emails were sent. Wait a few minutes, check your inbox, or sign in if you already created an account.";
  }

  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password. Please try again.";
  }

  if (lower.includes("user already registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (lower.includes("email not confirmed")) {
    return "Please confirm your email before signing in. Check your inbox.";
  }

  if (lower.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }

  if (lower.includes("unable to validate email")) {
    return "Please enter a valid email address.";
  }

  if (lower.includes("signup is disabled")) {
    return "Sign up is currently disabled. Please contact support.";
  }

  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    if (
      lower.includes("email") ||
      lower.includes("over_email_send_rate_limit")
    ) {
      return "Too many confirmation emails were sent. Wait a few minutes, check your inbox, or sign in if you already created an account.";
    }
    return "Too many attempts. Please wait a few minutes and try again.";
  }

  if (lower.includes("same password")) {
    return "New password must be different from your current password.";
  }

  if (lower.includes("session") && lower.includes("expired")) {
    return "Your reset link has expired. Please request a new one.";
  }

  if (message) {
    return message;
  }

  return "Something went wrong. Please try again.";
}
