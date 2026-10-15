import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { listViewKey, useListView } from "./useListView";

beforeEach(() => window.localStorage.clear());

describe("the list or grid choice", () => {
  it("is remembered per person under the Ziplume key", () => {
    expect(listViewKey("u1")).toBe("ziplume:codes-view:u1");
    const { result } = renderHook(() => useListView("u1"));
    act(() => result.current[1]("grid"));
    expect(window.localStorage.getItem("ziplume:codes-view:u1")).toBe("grid");
    expect(result.current[0]).toBe("grid");
  });
});
