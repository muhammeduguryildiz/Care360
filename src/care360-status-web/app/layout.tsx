import type { Metadata } from 'next';
import Sidebar from '@/components/Sidebar';
import CommandPalette from '@/components/CommandPalette';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rapid360 System Status',
  description: 'Real-time status of Rapid360 services and integrations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Apply saved theme before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('care360-theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}` }} />
      </head>
      <body className="bg-navy-900 text-slate-100 antialiased">
        <Providers>
          <Sidebar />
          <CommandPalette />

          <div className="md:ml-56 pt-14 md:pt-0 min-h-screen" id="main-content">
            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
              {children}
            </main>
            <footer className="max-w-5xl mx-auto px-4 sm:px-6 pb-6 text-xs text-slate-500 text-center">
              Powered by Azure &amp; D365 F&amp;O — data refreshes every 60 s
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
