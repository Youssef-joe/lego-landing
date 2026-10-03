import { Nunito, Fraunces, JetBrains_Mono } from 'next/font/google';

const fontNunito = Nunito({
  subsets: ['latin'],
  variable: '--font-brico-nunito',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const fontFraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-brico-fraunces',
  weight: ['400', '500', '600', '900'],
  style: ['normal', 'italic'],
});

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-brico-mono',
  weight: ['400', '600', '700'],
});

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${fontNunito.variable} ${fontFraunces.variable} ${fontMono.variable} min-h-screen bg-brico-paper font-sans text-brico-ink antialiased`}
    >
      {children}
    </div>
  );
}
