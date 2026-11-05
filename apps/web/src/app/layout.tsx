import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { ServerWakeupBanner } from '@/components/common/ServerWakeupBanner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Crucible — Technical Interview Platform',
  description:
    'The interview room for technical hiring. Video, code, whiteboard, and scoring in one place.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans bg-base text-primary antialiased min-h-screen">
        <AuthProvider>
          {children}
          <ServerWakeupBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
