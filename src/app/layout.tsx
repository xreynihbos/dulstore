
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dulstore Livechat",
  description: "Dulstore customer support workspace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
