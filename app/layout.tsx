import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moriki SMS",
  description: "Virtual numbers made simple",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
      </head>

      <body>{children}</body>
    </html>
  );
}
