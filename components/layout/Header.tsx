import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { BuyMeACoffee } from "@/components/support/BuyMeACoffee";
import { AccountMenu } from "@/features/auth/AccountMenu";

import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6 lg:h-16">
        <Link href="/" className="rounded-control focus-ring" aria-label="QuickQReate home">
          <Logo />
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <BuyMeACoffee />
          <ThemeToggle />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
