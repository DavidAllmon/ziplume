"use client";

import type { QrTypeId } from "@/lib/qr/types";

import type { GeneratorState } from "../state/types";
import { ContactForm } from "./forms/ContactForm";
import { EmailForm } from "./forms/EmailForm";
import { PhoneForm } from "./forms/PhoneForm";
import { SmsForm } from "./forms/SmsForm";
import { TextForm } from "./forms/TextForm";
import { UrlForm } from "./forms/UrlForm";
import { WifiForm } from "./forms/WifiForm";

interface ContentFormProps {
  state: GeneratorState;
  setField: (type: QrTypeId, field: string, value: string | boolean) => void;
}

export function ContentForm({ state, setField }: ContentFormProps) {
  const { activeType, content } = state;
  const onChange = (field: string, value: string | boolean) => setField(activeType, field, value);
  // key resets per-form UI state (touched fields, password visibility) when switching types.
  switch (activeType) {
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
  }
}
