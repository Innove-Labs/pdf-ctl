import type { Metadata } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s - pdfctl',
    default: 'pdfctl: Privacy focused PDF tools',
  },
  description:
    'Compress, split, merge, convert and edit PDFs in seconds. No account, no watermarks, no data sharing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-text-primary antialiased">
        {children}
      </body>
      <GoogleAnalytics gaId="G-1G6TYP1J52" />
    </html>
  );
}
