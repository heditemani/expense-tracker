import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pennywise — Personal finance",
  description: "A clear view of your money, all in one place.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
