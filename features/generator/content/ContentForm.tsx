"use client";

import { isPageType, type QrTypeId } from "@/lib/qr/types";

import type { ContentEditor } from "./types";
import { ContactForm } from "./forms/ContactForm";
import { EmailForm } from "./forms/EmailForm";
import { LocationForm } from "./forms/LocationForm";
import { PaymentForm } from "./forms/PaymentForm";
import { PhoneForm } from "./forms/PhoneForm";
import { SmsForm } from "./forms/SmsForm";
import { TextForm } from "./forms/TextForm";
import { UrlForm } from "./forms/UrlForm";
import { WhatsAppForm } from "./forms/WhatsAppForm";
import { WifiForm } from "./forms/WifiForm";
import { HostedPageForm } from "./HostedPageForm";
import { RevealErrorsContext } from "./RevealErrors";

export function ContentForm({ generator }: { generator: ContentEditor }) {
  const { state, setField } = generator;
  const { activeType, content } = state;
  if (isPageType(activeType)) return <HostedPageForm generator={generator} type={activeType} />;
  const onChange = (field: string, value: string | boolean) => setField(activeType, field, value);
  return (
    <RevealErrorsContext value={generator.revealErrors ?? false}>
      <StaticForm type={activeType} content={content} onChange={onChange} />
    </RevealErrorsContext>
  );
}

function StaticForm({
  type,
  content,
  onChange,
}: {
  type: QrTypeId;
  content: ContentEditor["state"]["content"];
  onChange: (field: string, value: string | boolean) => void;
}) {
  // key resets per-form UI state (touched fields, password visibility) when switching types.
  switch (type) {
    case "url":
      return <UrlForm key="url" values={content.url} onChange={onChange} />;
    case "text":
      return <TextForm key="text" values={content.text} onChange={onChange} />;
    case "wifi":
      return <WifiForm key="wifi" values={content.wifi} onChange={onChange} />;
    case "contact":
      return <ContactForm key="contact" values={content.contact} onChange={onChange} />;
    case "email":
      return <EmailForm key="email" values={content.email} onChange={onChange} />;
    case "phone":
      return <PhoneForm key="phone" values={content.phone} onChange={onChange} />;
    case "sms":
      return <SmsForm key="sms" values={content.sms} onChange={onChange} />;
    case "whatsapp":
      return <WhatsAppForm key="whatsapp" values={content.whatsapp} onChange={onChange} />;
    case "location":
      return <LocationForm key="location" values={content.location} onChange={onChange} />;
    case "payment":
      return <PaymentForm key="payment" values={content.payment} onChange={onChange} />;
  }
}
