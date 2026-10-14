/** /?edit=<id> was the old way to edit a saved code; it now opens the code in the editor. */
export function editRedirect(url: URL): URL | null {
  if (url.pathname !== "/") return null;
  const id = url.searchParams.get("edit");
  if (!id) return null;
  return new URL(`/codes/${encodeURIComponent(id)}/edit`, url.origin);
}
