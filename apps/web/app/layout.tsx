import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vero — Gestão da clínica",
  description: "Gestão de verdade pra sua clínica.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
