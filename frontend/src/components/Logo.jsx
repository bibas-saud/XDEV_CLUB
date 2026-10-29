import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";

import wordmarkDarkUrl from "@/assets/large-black-logo.png";
import wordmarkLightUrl from "@/assets/large-white-image.png";
import markDarkUrl from "@/assets/small-black-logo.png";
import markLightUrl from "@/assets/small-white-logo.png";

function useIsDark() {
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() =>
      setIsDark(el.classList.contains("dark"))
    );
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

/**
 * Club logo assets (transparent PNGs).
 * Automatically switches between black (light mode) and white (dark mode).
 * - markOnly renders just the X mark (e.g. collapsed sidebar)
 */
export function Logo({ className, markOnly = false }) {
  const isDark = useIsDark();
  const wordmarkUrl = isDark ? wordmarkLightUrl : wordmarkDarkUrl;
  const markUrl = isDark ? markLightUrl : markDarkUrl;

  if (markOnly) {
    return (
      <span className={cn("flex items-center", className)}>
        <img src={markUrl} alt="X'DEV Club" className="h-6 w-auto" />
      </span>
    );
  }

  return (
    <span className={cn("flex items-center", className)}>
      <img src={wordmarkUrl} alt="X'DEV Club" className="h-9 w-auto" />
    </span>
  );
}
