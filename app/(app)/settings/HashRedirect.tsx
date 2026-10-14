"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Old /account#api-keys bookmarks land on /settings#api-keys; send them to the right tab. */
export function HashRedirect() {
  const router = useRouter();
  useEffect(() => {
    if (window.location.hash === "#api-keys") router.replace("/settings/api-keys");
  }, [router]);
  return null;
}
