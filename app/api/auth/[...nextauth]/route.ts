import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import FacebookProvider from "next-auth/providers/facebook";
import TwitterProvider from "next-auth/providers/twitter";
import CredentialsProvider from "next-auth/providers/credentials"; // 🔥 NAYA: Password aur OTP ke liye
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs"; // 🔥 NAYA: Password verify karne ke liye

// Database connect karne ke liye single instance
const prisma = new PrismaClient();

// 🔥 NAYA CHANGE: Pura configuration ab ek exportable 'authOptions' object mein hai
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  
  providers: [
    // 1. Google Setup
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
    
    // 2. GitHub Setup
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
    
    // 3. Facebook Setup
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID as string,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
    
    // 4. X (Twitter) Setup
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID as string,
      clientSecret: process.env.TWITTER_CLIENT_SECRET as string,
      version: "2.0",
      allowDangerousEmailAccountLinking: true,
    }),

    // 🔥 NAYA: 5. Credentials Setup (OTP aur Password dono handle karega)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
        loginType: { label: "Login Type", type: "text" }, // "password" ya "otp" aayega frontend se
      },
      async authorize(credentials) {
        if (!credentials?.email) throw new Error("Email is required");

        const email = credentials.email.toLowerCase();
        const { password, otp, loginType } = credentials;

        let user = await prisma.user.findUnique({ where: { email } });

        // 🟢 LOGIC A: Agar OTP se login ho raha hai
        if (loginType === "otp") {
          if (!otp) throw new Error("OTP is required");

          const validOtp = await prisma.otpCode.findUnique({
            where: { email_code: { email, code: otp } },
          });

          if (!validOtp) throw new Error("Invalid OTP");

          if (validOtp.expiresAt < new Date()) {
            await prisma.otpCode.delete({ where: { id: validOtp.id } });
            throw new Error("OTP has expired.");
          }

          // OTP verify ho gaya, usko delete kar do
          await prisma.otpCode.delete({ where: { id: validOtp.id } });

          // Agar OTP sahi hai par user naya hai (Pehli baar login kar raha hai)
          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                name: "Business Owner",
                emailVerified: new Date(),
                passwordHash: null,
                role: "ADMIN", // 🔥 Tumhara custom logic yahan bhi laga diya
                allowedPages: [
                  "/dashboard", "/chat", "/contacts", "/campaigns", "/chatbot-builder", "/template", "/settings"
                ],
                primaryPage: "/dashboard",
                status: "ONLINE",
                currentActivity: "Logged in via OTP",
              },
            });
          } else {
             // Purana user hai toh status update kar do
             user = await prisma.user.update({
              where: { email },
              data: { emailVerified: new Date(), status: "ONLINE", currentActivity: "Active via OTP" },
            });
          }
          return user as any;
        }

        // 🔵 LOGIC B: Agar Password se login ho raha hai
        if (loginType === "password") {
          if (!password) throw new Error("Password is required");
          if (!user) throw new Error("No account found with this email");
          if (!user.passwordHash || user.passwordHash === "SOCIAL_LOGIN") {
            throw new Error("Please login with Social Media or OTP.");
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) throw new Error("Incorrect password");

          // Login hone par status update
          user = await prisma.user.update({
              where: { email },
              data: { status: "ONLINE", currentActivity: "Active via Password" },
          });

          return user as any;
        }

        throw new Error("Invalid login type");
      }
    })
  ],
  
  callbacks: {
    // 🔥 Tumhara purana custom signIn logic (Sirf Social Login ke liye chalega)
    async signIn({ user, account, profile }) {
      if (!user.email) return true;

      // Agar user Credentials (OTP/Password) se aaya hai, toh bypass kar do kyunki DB logic authorize() mein ho gaya hai
      if (account?.provider === "credentials") return true;

      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (!existingUser) {
        await prisma.user.create({
          data: {
            name: user.name || "Business Owner",
            email: user.email,
            image: user.image,
            passwordHash: "SOCIAL_LOGIN",
            role: "ADMIN",
            allowedPages: [
              "/dashboard", "/chat", "/contacts", "/campaigns", "/chatbot-builder", "/template", "/settings"
            ],
            primaryPage: "/dashboard",
            status: "ONLINE",
            currentActivity: "Logged in via " + account?.provider,
          },
        });
      } else {
        await prisma.user.update({
          where: { email: user.email },
          data: {
            status: "ONLINE",
            currentActivity: "Active via " + account?.provider,
          },
        });
      }
      return true;
    },
    
    async jwt({ token, user }) {
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.primaryPage = dbUser.primaryPage;
        }
      }
      return token;
    },
    
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.primaryPage = token.primaryPage as string;
      }
      return session;
    },
  },
  
  pages: {
    signIn: '/login', 
    error: '/login',  
  },
  
  session: {
    strategy: "jwt", 
  },
  
  secret: process.env.NEXTAUTH_SECRET,
};

// 🔥 NAYA CHANGE: authOptions ko use karke handler banaya
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
