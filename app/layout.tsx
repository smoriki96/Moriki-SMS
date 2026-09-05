import "./globals.css";

export const metadata = {
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
      <body>{children}</body>
    </html>
  );
}