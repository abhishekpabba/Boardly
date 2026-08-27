import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import '../src/styles.css';

export const metadata: Metadata = {
  title: 'Boardly — No-login retro boards',
  description: 'Boardly is a fast, no-login retrospective board for teams.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
