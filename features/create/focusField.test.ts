import { afterEach, describe, expect, it } from "vitest";

import { focusField } from "./focusField";

afterEach(() => document.body.replaceChildren());

function editor() {
  document.body.innerHTML = `
    <div id="root">
      <div data-editor-panel="content">
        <input aria-label="First" />
        <input aria-label="Title" data-field="title" />
      </div>
      <div data-editor-panel="settings">
        <input aria-label="Off" disabled />
        <select aria-label="Folder"></select>
      </div>
    </div>`;
  return document.getElementById("root");
}

describe("focusField", () => {
  it("focuses the field the problem names", () => {
    focusField(editor(), "content", "title");
    expect(document.activeElement).toHaveAttribute("aria-label", "Title");
  });

  it("focuses the tab's first usable field when there's no match", () => {
    focusField(editor(), "content", "hours.2");
    expect(document.activeElement).toHaveAttribute("aria-label", "First");
    focusField(editor(), "settings", null);
    expect(document.activeElement).toHaveAttribute("aria-label", "Folder");
  });

  it("does nothing, without throwing, when the tab isn't there", () => {
    expect(() => focusField(editor(), "look", "color")).not.toThrow();
    expect(() => focusField(null, "content", "title")).not.toThrow();
  });
});
