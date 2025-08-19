import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import ConditionalNavbar from "./components/ConditionalNavbar";
import { Toaster } from "sonner";
import ConditionalLayout from "./components/ConditionalLayout";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MarkFlow - Advanced Markdown Editor",
  description:
    "Professional markdown editor with LaTeX support, real-time collaboration, and AI-powered writing assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
    >
      <html lang="en">
        <head>
          {/* --- START: ADDED KATEX STYLESHEET --- */}
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
            integrity="sha384-n8MVd4RsNIU0KOVEMMhpZBvr3oOlbDP5gPSzrDtp9rgpBVRKYPj861VIIg54SfP4"
            crossOrigin="anonymous"
          />
          {/* --- END: ADDED KATEX STYLESHEET --- */}

          {/* Computer Modern Font for LaTeX-like appearance */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Computer+Modern+Serif:ital,wght@0,400;0,700;1,400;1,700&display=swap"
            rel="stylesheet"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Latin+Modern+Roman:ital,wght@0,400;0,700;1,400;1,700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className={`${geist.variable} ${geistMono.variable} antialiased`}>
          <ConditionalNavbar />
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
          <Toaster position="top-center" richColors />
        </body>
      </html>
    </ClerkProvider>
  );
}
