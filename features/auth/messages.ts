import type { AuthError } from "@supabase/supabase-js";

/** Turns Supabase Auth errors into plain sentences that say what to do next. */
export function authErrorMessage(error: AuthError | Error | null | undefined): string {
  if (!error) return "";
  const message = error.message ?? "";
  const code = "code" in error ? String(error.code ?? "") : "";

  if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) {
    return "That email and password don't match. Check them or reset your password.";
  }
  if (code === "email_not_confirmed" || /email not confirmed/i.test(message)) {
    return "Confirm your email first. We sent you a link when you signed up.";
  }
  if (code === "user_already_exists" || /already registered/i.test(message)) {
    return "There's already an account with that email. Sign in instead.";
  }
  if (code === "weak_password" || /password should/i.test(message)) {
    return "Choose a longer password: at least 8 characters, ideally a short phrase.";
  }
  if (
    code === "over_email_send_rate_limit" ||
    /rate limit|only request this after/i.test(message)
  ) {
    return "Too many emails in a short time. Wait a minute, then try again.";
  }
  if (code === "mfa_verification_failed" || /invalid totp|invalid code/i.test(message)) {
    return "That code didn't work. Codes change every 30 seconds, so enter the newest one.";
  }
  if (/fetch|network/i.test(message)) {
    return "Couldn't reach the sign-in service. Check your connection and try again.";
  }
  return message || "Something went wrong. Please try again.";
}
