import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ContentEditor } from "@/features/generator/content/types";
import { initialState } from "@/features/generator/state/defaults";
import { PAGE_DEFAULTS } from "@/lib/pages/types";
import type { CodeTypeId } from "@/lib/qr/types";
import type { FolderRow } from "@/types/supabase";

import { DEFAULT_SETTINGS } from "../state";
import { ContentSection } from "./ContentSection";
import { DesignSection } from "./DesignSection";
import { FolderSection } from "./FolderSection";
import { LookSection } from "./LookSection";
import { SettingsSection, type SavedSettings } from "./SettingsSection";

// Style previews draw on a canvas, which jsdom does not have.
vi.mock("@/features/generator/preview/QrView", () => ({ QrView: () => null }));

const editorFor = (type: CodeTypeId): ContentEditor => ({
  state: { ...initialState(), activeType: type },
  setField: vi.fn(),
  setPage: vi.fn(),
  pageErrors: {},
  workspace: null,
});

describe("ContentSection", () => {
  it("asks how a contact should work", async () => {
    const user = userEvent.setup();
    const onTypeChange = vi.fn();
    render(<ContentSection editor={editorFor("contact")} onTypeChange={onTypeChange} />);
    expect(screen.getByRole("radio", { name: /Save straight to phone/ })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: /Show a contact page/ }));
    expect(onTypeChange).toHaveBeenCalledWith("vcard");
  });

  it("shows the type's form", () => {
    render(<ContentSection editor={editorFor("url")} onTypeChange={vi.fn()} />);
    expect(screen.getByLabelText("Website address")).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "How should it work?" })).toBeNull();
  });
});

describe("DesignSection", () => {
  it("calls the logo the image in the code, and matches a hosted page's color", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const design = initialState().design;
    const { rerender } = render(
      <DesignSection design={design} dispatch={dispatch} onResetToStyle={vi.fn()} />,
    );
    expect(screen.getByRole("heading", { name: "QR code design" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Image in the code/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Match my page" })).toBeNull();
    rerender(
      <DesignSection
        design={design}
        dispatch={dispatch}
        onResetToStyle={vi.fn()}
        matchColor="#BE123C"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Match my page" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "setDesign",
      patch: {
        fgColor: "#BE123C",
        frameColor: "#BE123C",
        gradientType: "none",
        cornerColor: null,
        cornerDotColor: null,
      },
    });
  });

  it("starts from a style, keeps scan reliability under More design options, and resets", async () => {
    const user = userEvent.setup();
    const onResetToStyle = vi.fn();
    render(
      <DesignSection
        design={initialState().design}
        dispatch={vi.fn()}
        onResetToStyle={onResetToStyle}
      />,
    );
    expect(screen.getByRole("button", { name: /Start from a style/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await user.click(screen.getByRole("button", { name: /More design options/ }));
    expect(screen.getByText(/Scan reliability rises on its own/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset to style" }));
    expect(onResetToStyle).toHaveBeenCalled();
  });

  it("lets several groups be open at once", async () => {
    const user = userEvent.setup();
    render(
      <DesignSection design={initialState().design} dispatch={vi.fn()} onResetToStyle={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /^Colors/ }));
    await user.click(screen.getByRole("button", { name: /^Shape/ }));
    expect(screen.getByRole("button", { name: /^Colors/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: /^Shape/ })).toHaveAttribute("aria-expanded", "true");
  });
});

describe("SettingsSection", () => {
  it("turns the settings off for codes that work without internet, and says why", () => {
    render(<SettingsSection type="wifi" settings={DEFAULT_SETTINGS} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/Code password/)).toBeDisabled();
    expect(
      screen.getByText("Wi-Fi codes work without internet, so they can’t change after printing."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: /Trackable/ })).toBeNull();
  });

  it("lets a Link switch tracking off, which turns its settings off", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <SettingsSection type="url" settings={DEFAULT_SETTINGS} onChange={onChange} />,
    );
    expect(screen.getByLabelText(/Code password/)).toBeEnabled();
    expect(screen.getByLabelText("Source")).toBeEnabled();
    await user.click(screen.getByRole("switch", { name: /Trackable/ }));
    expect(onChange).toHaveBeenCalledWith({ trackable: false });
    rerender(
      <SettingsSection
        type="url"
        settings={{ ...DEFAULT_SETTINGS, trackable: false }}
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText(/Code password/)).toBeDisabled();
    expect(screen.getByText("Static codes can’t change after printing.")).toBeInTheDocument();
  });

  it("keeps hosted pages trackable, without campaign fields", () => {
    render(<SettingsSection type="links" settings={DEFAULT_SETTINGS} onChange={vi.fn()} />);
    expect(screen.getByText(/Hosted pages are always trackable/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Code password/)).toBeEnabled();
    expect(screen.queryByLabelText("Source")).toBeNull();
  });

  it("points out a short password, an end before the start and a bad ending", () => {
    render(
      <SettingsSection
        type="url"
        settings={{
          ...DEFAULT_SETTINGS,
          password: "abc",
          startsAt: "2030-02-01T09:00",
          endsAt: "2030-01-01T09:00",
          slug: "no spaces",
        }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Passwords are 4 to 128 characters")).toBeInTheDocument();
    expect(screen.getByText("The end date must be after the start date")).toBeInTheDocument();
    expect(
      screen.getByText("Link endings use 3–40 letters, numbers or dashes"),
    ).toBeInTheDocument();
  });
});

describe("LookSection", () => {
  it("changes the page's color", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const page = PAGE_DEFAULTS.links();
    render(<LookSection page={page} onChange={onChange} />);
    expect(screen.getByRole("heading", { name: "Page look" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use #BE123C" }));
    expect(onChange).toHaveBeenCalledWith({ ...page, color: "#BE123C" });
  });
});

describe("FolderSection", () => {
  it("files the code in a folder", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const folders = [
      { id: "f1", name: "Flyers" },
      { id: "f2", name: "Menus" },
    ] as FolderRow[];
    render(<FolderSection folderId="f1" folders={folders} onChange={onChange} />);
    expect(screen.getByLabelText("Folder")).toHaveValue("f1");
    await user.selectOptions(screen.getByLabelText("Folder"), "");
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe("the sections when editing a saved code", () => {
  it("hides the contact-kind switch", () => {
    render(<ContentSection editor={editorFor("contact")} onTypeChange={vi.fn()} typeLocked />);
    expect(screen.queryByRole("radiogroup", { name: "How should it work?" })).toBeNull();
  });

  const saved = (overrides: Partial<SavedSettings> = {}): SavedSettings => ({
    slug: "SPRING",
    hasPassword: false,
    removePassword: false,
    onRemovePassword: vi.fn(),
    ...overrides,
  });

  it("explains that Trackable can't change", () => {
    render(
      <SettingsSection
        type="url"
        settings={{ ...DEFAULT_SETTINGS, slug: "SPRING" }}
        onChange={vi.fn()}
        saved={saved()}
      />,
    );
    expect(screen.queryByRole("switch", { name: "Trackable" })).toBeNull();
    expect(
      screen.getByText(/Printed codes depend on this, so it can’t change/),
    ).toBeInTheDocument();
  });

  it("keeps, replaces or removes an existing password", async () => {
    const user = userEvent.setup();
    const onRemovePassword = vi.fn();
    const onChange = vi.fn();
    const { rerender } = render(
      <SettingsSection
        type="url"
        settings={{ ...DEFAULT_SETTINGS, slug: "SPRING" }}
        onChange={onChange}
        saved={saved({ hasPassword: true, onRemovePassword })}
      />,
    );
    expect(
      screen.getByText(/This code has a password. Leave this blank to keep it/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove password" }));
    expect(onRemovePassword).toHaveBeenCalledWith(true);
    expect(onChange).toHaveBeenCalledWith({ password: "" });

    rerender(
      <SettingsSection
        type="url"
        settings={{ ...DEFAULT_SETTINGS, slug: "SPRING" }}
        onChange={onChange}
        saved={saved({ hasPassword: true, removePassword: true, onRemovePassword })}
      />,
    );
    expect(screen.getByText("The password will be removed when you save.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Code password/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Keep the password" }));
    expect(onRemovePassword).toHaveBeenLastCalledWith(false);
  });

  it("warns when the link ending changes, and needs one", () => {
    const { rerender } = render(
      <SettingsSection
        type="url"
        settings={{ ...DEFAULT_SETTINGS, slug: "LUNCH" }}
        onChange={vi.fn()}
        saved={saved()}
      />,
    );
    expect(
      screen.getByText(
        "Codes you’ve already printed or shared use the current link and will stop working.",
      ),
    ).toBeInTheDocument();
    rerender(
      <SettingsSection
        type="url"
        settings={{ ...DEFAULT_SETTINGS, slug: "" }}
        onChange={vi.fn()}
        saved={saved()}
      />,
    );
    expect(screen.getByText("Every trackable code needs a link ending")).toBeInTheDocument();
  });
});
