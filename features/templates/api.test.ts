import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_DESIGN } from "@/features/generator/state/defaults";
import type { DesignTemplateRow } from "@/types/supabase";

import { duplicateTemplate, renameTemplate, setDefaultTemplate, updateTemplate } from "./api";

const calls: { op: string; args: unknown[] }[] = [];
let answer: { data: unknown; error: unknown } = { data: null, error: null };
const chain = {
  update: (...args: unknown[]) => (calls.push({ op: "update", args }), chain),
  insert: (...args: unknown[]) => (calls.push({ op: "insert", args }), chain),
  eq: (...args: unknown[]) => (calls.push({ op: "eq", args }), chain),
  select: () => chain,
  single: async () => answer,
};
const rpc = vi.fn(async (_name: string, _args: unknown) => answer);
vi.mock("@/lib/supabase/client", () => ({
  getBrowserSupabase: () => ({ from: () => chain, rpc }),
}));

const template = {
  id: "t1",
  user_id: "u1",
  name: "x".repeat(60),
  design: { fgColor: "#BE123C" },
  is_default: true,
  created_at: "",
  updated_at: "",
} as DesignTemplateRow;

describe("template data", () => {
  beforeEach(() => {
    calls.length = 0;
    answer = { data: template, error: null };
  });

  it("renames a template, trimmed and cut to 60 characters", async () => {
    expect((await renameTemplate("t1", `  ${"y".repeat(70)}  `)).ok).toBe(true);
    expect(calls).toContainEqual({ op: "update", args: [{ name: "y".repeat(60) }] });
    expect(calls).toContainEqual({ op: "eq", args: ["id", "t1"] });
    answer = { data: null, error: { message: "no" } };
    expect(await renameTemplate("t1", "Brand")).toEqual({
      ok: false,
      error: "The template couldn't be renamed.",
    });
  });

  it("duplicates a template as a copy that isn't the default, its name within 60", async () => {
    expect((await duplicateTemplate(template)).ok).toBe(true);
    const insert = calls.find((c) => c.op === "insert")!.args[0] as {
      name: string;
      design: unknown;
    };
    expect(insert.name).toBe(`Copy of ${"x".repeat(52)}`);
    expect(insert.name.length).toBe(60);
    expect(insert.design).toEqual(template.design);
    expect(insert).not.toHaveProperty("is_default");
  });

  it("sets or clears the default through the database function", async () => {
    answer = { data: null, error: null };
    expect(await setDefaultTemplate("t1")).toEqual({ ok: true, value: null });
    expect(rpc).toHaveBeenLastCalledWith("set_default_template", { p_template: "t1" });
    await setDefaultTemplate(null);
    expect(rpc).toHaveBeenLastCalledWith("set_default_template", { p_template: null });
    answer = { data: null, error: { message: "That template isn't yours" } };
    expect(await setDefaultTemplate("t9")).toEqual({
      ok: false,
      error: "The default couldn't be changed. Reload and try again.",
    });
  });

  it("saves an edited template's name and design", async () => {
    expect(
      (await updateTemplate("t1", "  Brand  ", { ...DEFAULT_DESIGN, fgColor: "#0B6E8C" })).ok,
    ).toBe(true);
    const update = calls.find((c) => c.op === "update")!.args[0] as {
      name: string;
      design: { fgColor: string };
    };
    expect(update.name).toBe("Brand");
    expect(update.design.fgColor).toBe("#0B6E8C");
    expect(calls).toContainEqual({ op: "eq", args: ["id", "t1"] });
    answer = { data: null, error: { message: "gone" } };
    expect(await updateTemplate("t9", "Brand", DEFAULT_DESIGN)).toEqual({
      ok: false,
      error: "The template couldn't be saved. It may have been deleted.",
    });
  });
});
