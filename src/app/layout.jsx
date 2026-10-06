import { Inter, Lora } from 'next/font/google';
import './globals.css';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import QuickActions from '../components/layout/QuickActions';
import { AuthProvider } from '../components/providers/AuthProvider';
import { ToastProvider } from '../components/providers/ToastProvider';
import { CartProvider } from '../components/providers/CartProvider';
import { RealtimeProvider } from '../components/providers/RealtimeProvider';
import { config } from '../lib/config';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
  weight: ['500', '600'],
});

export const metadata = {
  title: {
    default: `${config.hospital.name} | Appointments, pharmacy & patient records`,
    template: `%s · ${config.hospital.shortName}`,
  },
  description:
    'Book specialist appointments, browse the pharmacy catalogue, review laboratory and imaging results, and manage your hospital records securely.',
  applicationName: config.hospital.shortName,
  keywords: ['hospital', 'appointments', 'pharmacy', 'laboratory results', 'medical records', 'Lagos hospital'],
  openGraph: {
    type: 'website',
    siteName: config.hospital.name,
    title: `${config.hospital.name}`,
    description: 'Specialist consultations, diagnostics, pharmacy and emergency care — 24 hours a day.',
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${lora.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main-content"
          className="sr-only rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100]"
        >
          Skip to main content
        </a>

        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <RealtimeProvider>
                <Navbar />
                <main id="main-content" className="flex-1">
                  {children}
                </main>
                <Footer />
                <QuickActions />
              </RealtimeProvider>
            </CartProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
