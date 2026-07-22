import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "P2Xchange Admin Terminal",
  description: "Enterprise Financial P2P Exchange Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#020205] text-slate-300">
        {children}
      </body>
    </html>
  );
}
