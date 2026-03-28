import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";

const providers: NextAuthOptions["providers"] = [
  GithubProvider({
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  }),
];

if (process.env.NODE_ENV === "development") {
  providers.push(
    CredentialsProvider({
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "dev@sinai.local" },
      },
      async authorize() {
        // Upsert a dev user so sessions work with Prisma adapter
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
  session: {
    strategy: process.env.NODE_ENV === "development" ? "jwt" : "database",
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    async session({ session, user, token }) {
      if (session.user) {
        // JWT mode (dev) uses token.sub, database mode uses user.id
        (session.user as typeof session.user & { id: string }).id =
          user?.id ?? token?.sub ?? "";
      }
      return session;
    },
  },
};
