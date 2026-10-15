/** Leaves the app for another address. Its own module, so tests can watch it. */
export function goTo(url: string): void {
  window.location.assign(url);
}
