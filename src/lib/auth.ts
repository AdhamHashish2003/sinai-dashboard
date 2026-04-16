import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";

// Dev Login is a password-less shortcut — only enable it outside production,
// or explicitly via ENABLE_DEV_LOGIN=true (useful for staging / preview deploys).
const devLoginEnabled =
  process.env.NODE_ENV !== "production" || process.env.ENABLE_DEV_LOGIN === "true";

const providers: NextAuthOptions["providers"] = [
  GithubProvider({
    clientId: process.env.GITHUB_CLIENT_ID ?? "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
  }),
];

if (devLoginEnabled) {
  providers.push(
    CredentialsProvider({
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "dev@sinai.local" },
      },
      async authorize() {
        const user = await db.user.upsert({
          where: { email: "dev@sinai.local" },
          update: {},
          create: {
            email: "dev@sinai.local",
            name: "Dev User",
            image: "https://picsum.photos/seed/devuser/96/96",
          },
        });
        return user;
      },
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as NextAuthOptions["adapter"],
  providers,
  // JWT strategy everywhere — avoids PrismaAdapter createSession failures
  // on OAuth callback. The adapter still stores Account/User records.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // On initial sign-in, persist user id and provider into the token
      if (user) {
        token.id = user.id;
      }
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as typeof session.user & { id: string }).id =
          (token.id as string) ?? token.sub ?? "";
      }
      return session;
    },
  },
};
