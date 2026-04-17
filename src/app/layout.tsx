import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import ClientAuthWrapper from "@/components/ClientAuthWrapper";
import CloudSyncEngine from "@/components/CloudSyncEngine";

import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "IELTS Flow",
  description: "极简雅思口语备考 Web App — Speaking Preparation Platform",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "IELTS Flow" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const saved = localStorage.getItem('theme');
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (saved === 'dark' || (!saved && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ClientAuthWrapper>
          <CloudSyncEngine />
          <ThemeToggle />
          <main
            style={{
              maxWidth: 680,
              margin: "0 auto",
              padding: "0 20px",
              paddingTop: 32,
              paddingBottom: 100,
              minHeight: "100dvh",
            }}
          >
            {children}
          </main>
          <BottomNav />
        </ClientAuthWrapper>
      </body>
    </html>
  );
}
