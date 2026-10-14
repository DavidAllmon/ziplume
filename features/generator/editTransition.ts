export type EditTransition = "none" | "load" | "reset";

/**
 * What the generator does when `?edit=` in the address bar changes.
 * - It disappears while a code is open (for example, the logo was clicked): start fresh.
 * - It names a code other than the open one: load that code.
 * - It names the open code (it was just saved), or both are empty: nothing.
 */
export function editTransition(editParam: string | null, savedId: string | null): EditTransition {
  if (editParam === null) return savedId === null ? "none" : "reset";
  return editParam === savedId ? "none" : "load";
}
