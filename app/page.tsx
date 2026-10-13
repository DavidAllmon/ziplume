import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Generator } from "@/features/generator/Generator";

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-primary px-4 py-2 font-semibold text-primary-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Header />
      <main
        id="main"
        className="mx-auto w-full max-w-6xl px-4 pt-6 pb-32 sm:px-6 md:pb-16 lg:pt-10"
      >
        <div className="mb-6 max-w-2xl lg:mb-8">
          <h1 className="font-display text-[1.75rem] leading-tight font-bold tracking-tight text-balance text-fg sm:text-4xl">
            Create a QR code in seconds
          </h1>
          <p className="mt-2 text-fg-muted sm:text-lg">
            Free, private and no sign-up. Everything runs in your browser.
          </p>
        </div>
        <Generator />
      </main>
      <Footer />
    </>
  );
}
