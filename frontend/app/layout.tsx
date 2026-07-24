import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'US Credit Law & Dispute Platform | FCRA Statutory Audit',
  description: 'AI-Powered FCRA, FDCPA & Metro 2 Statutory Credit Dispute Engine. Audit compliance violations and auto-generate legal dispute letters.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#050811] text-slate-100 antialiased selection:bg-cyan-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
