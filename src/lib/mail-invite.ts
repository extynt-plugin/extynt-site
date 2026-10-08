import { signIn } from "@/auth";

/** The invite is the standard magic-link email, sent once the tester row exists. */
export async function sendInvite(email: string): Promise<void> {
  await signIn("resend", { email, redirect: false, redirectTo: "/account" });
}
