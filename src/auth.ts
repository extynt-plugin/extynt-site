import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { getDb } from "@/lib/db/client";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { sendMail, signInMail } from "@/lib/email/send";
import { getEnv } from "@/lib/env";
import { canSignIn } from "@/lib/services/signin";
import { getStore } from "@/lib/store";

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const env = getEnv();
  return {
    adapter: DrizzleAdapter(getDb(), {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
    secret: env.authSecret,
    session: { strategy: "database" },
    pages: { signIn: "/login", verifyRequest: "/login/check", error: "/login" },
    providers: [
      Resend({
        apiKey: env.resendKey,
        from: env.emailFrom,
        sendVerificationRequest: ({ identifier, url }) =>
          sendMail(signInMail(identifier, url), { apiKey: env.resendKey, from: env.emailFrom }),
      }),
    ],
    callbacks: {
      // Defence in depth: the login action already gates sending; this gates honouring a link.
      signIn: ({ user }) =>
        user.email ? canSignIn(getStore(), user.email, env, new Date()) : false,
      session: ({ session, user }) => {
        session.user.id = user.id;
        return session;
      },
    },
  };
});
