import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "تسجيل الطلاب | مؤسسة ملتقى العلم والدين",
  description: "استمارة تسجيل الطلاب في مؤسسة ملتقى العلم والدين.",
  applicationName: "تسجيل الطلاب",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
