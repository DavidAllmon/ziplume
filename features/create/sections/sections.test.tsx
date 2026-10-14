import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ContentEditor } from "@/features/generator/content/types";
import { initialState } from "@/features/generator/state/defaults";
import type { CodeTypeId } from "@/lib/qr/types";
import type { FolderRow } from "@/types/supabase";

import { DEFAULT_SETTINGS } from "../state";
import { ContentSection } from "./ContentSection";
import { DesignSection } from "./DesignSection";
import { NameFolderSection } from "./NameFolderSection";
import { SettingsSection } from "./SettingsSection";
import { TypeSection } from "./TypeSection";

// Style previews draw on a canvas, which jsdom does not have.
vi.mock("@/features/generator/preview/QrView", () => ({ QrView: () => null }));

const editorFor = (type: CodeTypeId): ContentEditor => ({
  state: { ...initialState(), activeType: type },
  setField: vi.fn(),
  setPage: vi.fn(),
  pageErrors: {},
  workspace: null,
});

describe("TypeSection", () => {
  it("offers eight common types and finds the rest by search", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TypeSection value="url" onChange={onChange} />);
    expect(screen.getAllByRole("radio")).toHaveLength(8);
    expect(screen.getByRole("radio", { name: /Open a website/ })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "More types" }));
    await user.type(screen.getByLabelText("Search types"), "whatsapp");
    await user.click(screen.getByRole("button", { name: /WhatsApp/ }));
    expect(onChange).toHaveBeenCalledWith("whatsapp");
    expect(screen.queryByLabelText("Search types")).toBeNull();
  });

  it("says when no type matches", async () => {
    const user = userEvent.setup();
    render(<TypeSection value="url" onChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "More types" }));
    await user.type(screen.getByLabelText("Search types"), "zzz");
    expect(screen.getByText("No types match “zzz”.")).toBeInTheDocument();
  });

  it("shows a less common type as its own tile, and Contact for both contact kinds", () => {
    const { rerender } = render(<TypeSection value="whatsapp" onChange={vi.fn()} />);
    expect(screen.getAllByRole("radio")).toHaveLength(9);
    expect(screen.getByRole("radio", { name: /Start a WhatsApp chat/ })).toBeChecked();
    rerender(<TypeSection value="vcard" onChange={vi.fn()} />);
    expect(screen.getAllByRole("radio")).toHaveLength(8);
    expect(screen.getByRole("radio", { name: /Share contact details/ })).toBeChecked();
  });
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

describe("NameFolderSection", () => {
  it("suggests a name and files the code in a folder", async () => {
    const user = userEvent.setup();
    const onFolder = vi.fn();
    const folders = [
      { id: "f1", name: "Flyers" },
      { id: "f2", name: "Menus" },
    ] as FolderRow[];
    render(
      <NameFolderSection
        name=""
        placeholder="example.com"
        onName={vi.fn()}
        folderId="f1"
        folders={folders}
        onFolder={onFolder}
      />,
    );
    expect(screen.getByLabelText("Code name")).toHaveAttribute("placeholder", "example.com");
    expect(screen.getByLabelText("Folder")).toHaveValue("f1");
    await user.selectOptions(screen.getByLabelText("Folder"), "");
    expect(onFolder).toHaveBeenCalledWith(null);
  });
});
