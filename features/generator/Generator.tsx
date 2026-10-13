"use client";

import { Card, CardHeader } from "@/components/ui/Card";

import { ContentForm } from "./content/ContentForm";
import { TypePicker } from "./content/TypePicker";
import { MobilePreviewBar } from "./preview/MobilePreviewBar";
import { PreviewPanel } from "./preview/PreviewPanel";
import { StyleCard } from "./style/StyleCard";
import { useGenerator } from "./useGenerator";

export function Generator() {
  const generator = useGenerator();
  const { state, dispatch, setField, report } = generator;

  return (
    <>
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_18.5rem] lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <Card aria-labelledby="content-heading">
            <CardHeader
              id="content-heading"
              step={1}
              title="What should it open?"
              description="Pick a type, then fill in the details."
            />
            <div className="flex flex-col gap-6 px-5 pt-4 pb-6 sm:px-6">
              <TypePicker
                value={state.activeType}
                onChange={(activeType) => dispatch({ type: "setActiveType", activeType })}
              />
              <ContentForm state={state} setField={setField} />
            </div>
          </Card>
          <StyleCard design={state.design} dispatch={dispatch} />
        </div>

        <aside
          aria-labelledby="preview-heading"
          className="hidden md:sticky md:top-20 md:block lg:top-24"
        >
          <Card>
            <CardHeader id="preview-heading" step={3} title="Preview & download" />
            <div className="px-5 pt-4 pb-6 sm:px-6">
              <PreviewPanel generator={generator} report={report} />
            </div>
          </Card>
        </aside>
      </div>
      <MobilePreviewBar generator={generator} report={report} />
    </>
  );
}
