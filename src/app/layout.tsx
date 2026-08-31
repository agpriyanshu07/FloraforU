import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/settings";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(s.siteUrl),
    title: { default: s.seoTitle, template: `%s · ${s.businessName}` },
    description: s.seoDescription,
    openGraph: {
      type: "website",
      siteName: s.businessName,
      title: s.seoTitle,
      description: s.seoDescription,
      locale: "en_IN",
    },
    twitter: { card: "summary_large_image", title: s.seoTitle, description: s.seoDescription },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
