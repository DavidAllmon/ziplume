"use client";

import { useCallback, useMemo, useState } from "react";

import {
  type AppPage,
  type AudioPage,
  type BusinessPage,
  type CouponPage,
  type EventPage,
  type FeedbackPage,
  type ImagesPage,
  type LinksPage,
  type MenuPage,
  type PdfPage,
  type VcardPage,
  type VideoPage,
  type PageContentMap,
} from "@/lib/pages/types";
import type { PageErrors } from "@/lib/pages/validate";
import type { PageTypeId } from "@/lib/qr/types";

import { AppEditor } from "./editors/AppEditor";
import { AudioEditor } from "./editors/AudioEditor";
import { BusinessEditor } from "./editors/BusinessEditor";
import { CouponEditor } from "./editors/CouponEditor";
import { EventEditor } from "./editors/EventEditor";
import { FeedbackEditor } from "./editors/FeedbackEditor";
import { ImagesEditor } from "./editors/ImagesEditor";
import { LinksEditor } from "./editors/LinksEditor";
import { MenuEditor } from "./editors/MenuEditor";
import { PdfEditor } from "./editors/PdfEditor";
import { VcardEditor } from "./editors/VcardEditor";
import { VideoEditor } from "./editors/VideoEditor";
import type { ErrorsApi } from "./fields";

interface PageEditorProps<K extends PageTypeId> {
  type: K;
  page: PageContentMap[K];
  errors: PageErrors;
  onChange: (page: PageContentMap[K]) => void;
}

/** Form for a hosted page; errors show once a field has been visited. */
export function PageEditor<K extends PageTypeId>({
  type,
  page,
  errors,
  onChange,
}: PageEditorProps<K>) {
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const touch = useCallback(
    (path: string) =>
      setTouched((current) => (current.has(path) ? current : new Set(current).add(path))),
    [],
  );
  const errorsApi = useMemo<ErrorsApi>(
    () => ({ error: (path) => (touched.has(path) ? errors[path] : undefined), touch }),
    [errors, touched, touch],
  );
  const anyTouched = touched.size > 0;
  const set = (patch: object) => {
    if (!anyTouched) touch("*");
    onChange({ ...page, ...patch } as PageContentMap[K]);
  };
  const props = { set, errors: errorsApi };
  // Required-file problems show once the user has started editing.
  const fileErrors: ErrorsApi = { error: (path) => errors[path], touch };

  const body = (() => {
    switch (type) {
      case "links":
        return <LinksEditor page={page as LinksPage} {...props} />;
      case "vcard":
        return <VcardEditor page={page as VcardPage} {...props} />;
      case "business":
        return <BusinessEditor page={page as BusinessPage} {...props} />;
      case "menu":
        return <MenuEditor page={page as MenuPage} {...props} />;
      case "coupon":
        return <CouponEditor page={page as CouponPage} {...props} />;
      case "event":
        return <EventEditor page={page as EventPage} {...props} />;
      case "feedback":
        return <FeedbackEditor page={page as FeedbackPage} {...props} />;
      case "pdf":
        return (
          <PdfEditor page={page as PdfPage} set={set} errors={fileErrors} touched={anyTouched} />
        );
      case "images":
        return (
          <ImagesEditor
            page={page as ImagesPage}
            set={set}
            errors={fileErrors}
            touched={anyTouched}
          />
        );
      case "video":
        return (
          <VideoEditor
            page={page as VideoPage}
            set={set}
            errors={{
              ...errorsApi,
              error: (p) => (p === "file" ? errors.file : errorsApi.error(p)),
            }}
            touched={anyTouched}
          />
        );
      case "audio":
        return (
          <AudioEditor
            page={page as AudioPage}
            set={set}
            errors={{
              ...errorsApi,
              error: (p) => (p === "file" ? errors.file : errorsApi.error(p)),
            }}
            touched={anyTouched}
          />
        );
      case "app":
        return <AppEditor page={page as AppPage} {...props} />;
      default:
        return null;
    }
  })();

  return <div className="flex flex-col gap-5">{body}</div>;
}
