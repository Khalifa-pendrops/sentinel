import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Sentinel',
  description: 'Event explorer',
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
