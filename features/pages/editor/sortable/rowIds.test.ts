import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useRowIds } from "./rowIds";

describe("useRowIds", () => {
  it("keeps each row's key, and makes keys to match a list resized from outside", () => {
    const { result, rerender } = renderHook(({ count }) => useRowIds(count), {
      initialProps: { count: 2 },
    });
    const [first] = result.current;
    expect(new Set(first).size).toBe(2);
    rerender({ count: 2 });
    expect(result.current[0]).toEqual(first);
    rerender({ count: 3 });
    expect(result.current[0]).toHaveLength(3);
    expect(result.current[0].slice(0, 2)).toEqual(first);
    rerender({ count: 1 });
    expect(result.current[0]).toEqual([first[0]]);
  });
});
