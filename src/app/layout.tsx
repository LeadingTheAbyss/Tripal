import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ClientOnly } from "@/components/layout/ClientOnly";
import { ThemeProvider } from "@/components/theme-provider";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Tripal - Premium Travel Itinerary Planner",
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
      className={`${outfit.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <ClientOnly>{children}</ClientOnly>
        </ThemeProvider>
      </body>
    </html>
  );
}
