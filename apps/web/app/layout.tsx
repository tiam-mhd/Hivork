import type { Metadata } from 'next';
import { Sora, Vazirmatn } from 'next/font/google';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { LocaleHtmlAttributes } from '@/components/providers/locale-html-attributes';

import './globals.css';

const vazirmatn = Vazirmatn({
  subsets: ['arabic'],
  variable: '--font-vazirmatn',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Hivork',
  description: 'پلتفرم SaaS ماژولار برای خرده‌فروشی ایران',
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('hivork-theme-mode')||localStorage.getItem('hivork-color-mode');var dark=t==='dark'||(t==='system'||!t)&&window.matchMedia('(prefers-color-scheme: dark)').matches;if(dark){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = locale === 'fa' ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale === 'fa' ? 'fa' : 'en'}
      dir={dir}
      suppressHydrationWarning
      className={`${vazirmatn.variable} ${sora.variable}`}
    >
      <head>
        <Script id="hivork-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased transition-colors duration-200">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <LocaleHtmlAttributes />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
