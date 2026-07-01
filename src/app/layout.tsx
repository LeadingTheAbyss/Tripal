import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientOnly } from "@/components/layout/ClientOnly";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "PlanBro",
  description: "Plan your trip with real-time flight, train, and hotel data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <ClientOnly>{children}</ClientOnly>
        </ThemeProvider>
      </body>
    </html>
  );
}
