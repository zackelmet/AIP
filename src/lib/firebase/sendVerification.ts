import { sendEmailVerification, User } from "firebase/auth";

/**
 * Sends a branded verification email via our API, falling back to Firebase's
 * default sender so signup never breaks if the email service is unavailable.
 */
export async function sendVerificationEmail(user: User): Promise<void> {
  try {
    const token = await user.getIdToken();
    const res = await fetch("/api/auth/send-verification", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) return;
  } catch {
    // fall back to Firebase
  }
  await sendEmailVerification(user);
}
