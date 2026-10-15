/**
 * Moves the "left this field" marks of a list's rows along with the rows, so a row's error stays
 * on it when it moves. `order[newIndex]` is the row's old index, or -1 for a new row; a row whose
 * old index isn't in `order` was removed. Paths look like "links.2.url" or
 * "sections.1.items.0.name".
 */
export function remapTouched(
  touched: ReadonlySet<string>,
  prefix: string,
  order: number[],
): ReadonlySet<string> {
  const head = `${prefix}.`;
  const newIndex = new Map(order.map((old, i) => [old, i]));
  let changed = false;
  const next = new Set<string>();
  for (const path of touched) {
    const rest = path.startsWith(head) ? path.slice(head.length) : null;
    const dot = rest?.indexOf(".") ?? -1;
    const old = rest === null ? NaN : Number(dot === -1 ? rest : rest.slice(0, dot));
    if (!Number.isInteger(old)) {
      next.add(path);
      continue;
    }
    changed = true;
    const moved = newIndex.get(old);
    if (moved !== undefined) next.add(`${head}${moved}${dot === -1 ? "" : rest!.slice(dot)}`);
  }
  return changed ? next : touched;
}
