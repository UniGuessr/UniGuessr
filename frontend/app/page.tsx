"use client";

import { Link } from "@heroui/link";
import { Button } from "@heroui/button";
import BackgroundMap from "@/components/background";

export default function Home() {
  return (
    <main>
      {/* Background map */}
      <BackgroundMap />

      {/* Optional light tint over the map (nice for readability) */}
      <div className="pointer-events-none fixed inset-0 z-[1] bg-white/10" />

      {/* Foreground UI */}
      <div className="relative z-[2]">
        <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
          <h1 className="text-4xl font-bold">ConuGuessr</h1>
        </section>

        <section className="flex items-center justify-between py-8 md:py-10 max-w-md mx-auto px-4">
          <Button>
            <Link href="/single-player">
              <span>Single Player</span>
            </Link>
          </Button>

          <Button>
            <Link href="/multi-player">
              <span>Multi Player</span>
            </Link>
          </Button>
        </section>
      </div>
    </main>
  );
}
