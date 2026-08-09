import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 🔥 NextAuth ka Provider
import { NextAuthProvider } from "@/components/providers/SessionProvider"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BaseKey CRM - WhatsApp Automation",
  description: "Futuristic production-ready WhatsApp Business API Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  // Google Schema Markup
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "BaseKey",
    "url": "https://basekey.in",
    "logo": "https://basekey.in/logo.png",
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
      <head>
        {/* Favicon Icon */}
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        
        {/* Schema Code Injection */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      
      <body className={inter.className}>
        <NextAuthProvider>
          {children}
        </NextAuthProvider>
      </body>
    </html>
  );
}
