import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import clsx from "clsx";
import { ArcadeBackground } from "@/components/Background/crt-arcade";
import { Providers } from "./providers";
import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "white",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={clsx("min-h-screen text-foreground bg-background font-sans antialiased",fontSans.variable)}
      >
        <Providers themeProps={{ attribute: "class", forcedTheme: "dark" }}>
          <div>
            <ArcadeBackground />
            <main className="mx-auto pt-6 px-6 flex-grow">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
