import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // CSS import karna zaroori hai

// 🔥 NAYA: NextAuth ka Provider import kiya
import { NextAuthProvider } from "@/components/providers/SessionProvider"; 

const inter = Inter({ subsets: ["latin"] });

// Ye metadata aapke BaseKey CRM ka title aur description set karega
export const metadata: Metadata = {
  title: "BaseKey CRM - WhatsApp Automation",
  description: "Futuristic production-ready WhatsApp Business API Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  // Google ko BaseKey, uske Founder (Ayush) aur Parent Company (SuperKey) batane ke liye Schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "BaseKey",
    "url": "https://basekey.in",
    "logo": "https://basekey.in/logo.png", // ⚠️ Dhyaan de: Yahan apne asli logo ka URL daalna (.png ya .svg)
    "description": "WhatsApp Business API integration and template management platform.",
    "founder": {
      "@type": "Person",
      "name": "Ayush"
    },
    "parentOrganization": {
      "@type": "Organization",
      "name": "SuperKey"
    }
  };

  return (
    <html lang="en" className="dark">
      {/* className="dark" default dark mode ke liye hai */}
      <head>
        {/* Favicon - Search engine ke tab aur results me chota logo dikhane ke liye */}
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        
        {/* Schema code ko Next.js me is tarah inject karte hain */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      
      <body className={inter.className}>
        {/* 🔥 NAYA: Poori app ko NextAuthProvider se wrap kar diya hai */}
        <NextAuthProvider>
          {children}
        </NextAuthProvider>
      </body>
    </html>
  );
}
