import "./globals.css";

export const metadata = {
  title: "TruckTetris - AI Logistics Assistant",
  description: "Optimize your truck loading with AI assistance",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
