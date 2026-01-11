import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import TopNav from "@/components/TopNav";
import { Toaster } from "@/components/ui/sonner";
import { PermissionsProvider } from "@/contexts/PermissionsContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata = {
  title: "Wellness Aggregator",
  description:
    "A modular personal health & wellness dashboard with correlation insights.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <PermissionsProvider>
        <TopNav />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

        <Toaster richColors closeButton />
        </PermissionsProvider>

      </body>
    </html>
  );
}