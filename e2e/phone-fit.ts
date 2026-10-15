import { expect, type Locator, type Page } from "@playwright/test";

/** Empty space allowed between the end of the content and the first bar fixed to the bottom. */
export const MAX_END_GAP = 32;

interface Fit {
  scrolls: boolean;
  viewport: number;
  tabbarTopBefore: number | null;
  tabbarTopAfter: number | null;
  tabbarBottom: number | null;
  chromeTop: number;
  contentBottom: number;
}

/** Scrolls to the very end, then measures the content against the bars fixed to the bottom. */
function measureEnd(page: Page, root: string): Promise<Fit> {
  return page.evaluate(async (rootSelector) => {
    const settle = () =>
      new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const shown = (el: Element | null): el is Element =>
      !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
    const doc = document.documentElement;
    const tabbar = document.querySelector("[data-tabbar]");
    const tabbarTopBefore = shown(tabbar) ? tabbar.getBoundingClientRect().top : null;
    window.scrollTo(0, doc.scrollHeight);
    await settle();
    const bars = [...document.querySelectorAll("[data-tabbar], [data-actionbar]")].filter(shown);
    const chromeTop = Math.min(
      window.innerHeight,
      ...bars.map((bar) => bar.getBoundingClientRect().top),
    );
    let contentBottom = 0;
    for (const el of document.querySelector(rootSelector)!.querySelectorAll("*")) {
      if (!shown(el)) continue;
      if (el.closest("[data-tabbar], [data-actionbar], [data-toasts], [role='dialog']")) continue;
      const style = getComputedStyle(el);
      if (style.position === "fixed" || style.position === "sticky") continue;
      // Count what a person sees: leaves, and boxes with a fill or a bottom edge. Wrappers' own
      // padding is spacing, not content.
      const painted =
        el.childElementCount === 0 ||
        style.backgroundColor !== "rgba(0, 0, 0, 0)" ||
        parseFloat(style.borderBottomWidth) > 0;
      if (!painted) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      contentBottom = Math.max(contentBottom, box.bottom);
    }
    return {
      scrolls: doc.scrollHeight > window.innerHeight + 1,
      viewport: window.innerHeight,
      tabbarTopBefore,
      tabbarTopAfter: shown(tabbar) ? tabbar.getBoundingClientRect().top : null,
      tabbarBottom: shown(tabbar) ? tabbar.getBoundingClientRect().bottom : null,
      chromeTop,
      contentBottom,
    };
  }, root);
}

/** The page ends where its content ends: nothing hidden under the bars, no empty space to scroll
 * into, and the tab bar on the bottom edge before and after scrolling. */
export async function expectFitsPhone(page: Page, root = "#main", maxGap = MAX_END_GAP) {
  const fit = await measureEnd(page, root);
  if (fit.tabbarTopBefore !== null) {
    expect(fit.tabbarBottom, "the tab bar sits on the bottom edge").toBeCloseTo(fit.viewport, 0);
    expect(fit.tabbarTopAfter, "the tab bar stays put").toBeCloseTo(fit.tabbarTopBefore, 0);
  }
  expect(fit.contentBottom, "content ends above the bars").toBeLessThanOrEqual(fit.chromeTop + 0.5);
  if (fit.scrolls) {
    expect(fit.chromeTop - fit.contentBottom, "no empty space to scroll into").toBeLessThanOrEqual(
      maxGap,
    );
  }
}

/** A page shorter than the screen doesn't scroll at all. */
export async function expectNoScroll(page: Page) {
  const extra = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  expect(extra, "the page doesn't scroll").toBeLessThanOrEqual(1);
}

export async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "no sideways scroll").toBeLessThanOrEqual(0);
}

/** After scrolling to the end, `last` is fully on screen with at most `maxGap` px below it. */
export async function expectEndsWith(page: Page, last: Locator, maxGap: number) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.evaluate(
    () =>
      new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
  );
  const box = (await last.boundingBox())!;
  const viewport = await page.evaluate(() => window.innerHeight);
  expect(box.y + box.height, "the last item is on screen").toBeLessThanOrEqual(viewport + 0.5);
  expect(viewport - (box.y + box.height), "no empty space after it").toBeLessThanOrEqual(maxGap);
}

export function overscrollY(page: Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.documentElement).overscrollBehaviorY);
}
