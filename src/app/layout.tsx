import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BMS - Branch Management System",
    template: "%s | BMS - Branch Management System",
  },
  description: "BMS - Branch Management System & Business Operations Portal",
  icons: {
    icon: "/isquarebpo.png",
    shortcut: "/isquarebpo.png",
    apple: "/isquarebpo.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className={`min-h-full flex flex-col font-sans ${geistSans.className}`}>
        <StoreProvider>
          <TooltipProvider>
            {children}
            <Toaster position="top-right" closeButton richColors />
          </TooltipProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
