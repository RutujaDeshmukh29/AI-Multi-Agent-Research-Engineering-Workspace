import "./globals.css";

export const metadata = {
  title: "AI Workspace",
  description: "AI Multi-Agent Workspace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}