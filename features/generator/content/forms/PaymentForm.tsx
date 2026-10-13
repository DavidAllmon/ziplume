"use client";

import { Field } from "@/components/ui/Field";
import { Select, TextInput } from "@/components/ui/inputs";
import type { PaymentMethod } from "@/lib/qr/types";
import { validatePayment } from "@/lib/qr/validators";

import type { FormProps } from "../types";
import { useTouched } from "../useTouched";

const METHODS: Record<
  PaymentMethod,
  { label: string; account: string; placeholder: string; hint: string; amount: string }
> = {
  paypal: {
    label: "PayPal",
    account: "PayPal.me name",
    placeholder: "yourname",
    hint: "From paypal.me/yourname.",
    amount: "12.50",
  },
  venmo: {
    label: "Venmo",
    account: "Venmo username",
    placeholder: "@yourname",
    hint: "Without the @ is fine too.",
    amount: "12.50",
  },
  cashapp: {
    label: "Cash App",
    account: "$cashtag",
    placeholder: "$yourname",
    hint: "Your Cash App $cashtag.",
    amount: "12.50",
  },
  bitcoin: {
    label: "Bitcoin",
    account: "Bitcoin address",
    placeholder: "bc1q…",
    hint: "Double-check it: crypto payments can't be undone.",
    amount: "0.0005",
  },
  ethereum: {
    label: "Ethereum",
    account: "Ethereum address",
    placeholder: "0x…",
    hint: "Double-check it: crypto payments can't be undone.",
    amount: "0.01",
  },
};

const CURRENCIES = ["", "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "MXN", "BRL", "INR", "CHF"];

export function PaymentForm({ values, onChange }: FormProps<"payment">) {
  const { touch, errorFor } = useTouched();
  const errors = validatePayment(values);
  const method = METHODS[values.method];
  const crypto = values.method === "bitcoin" || values.method === "ethereum";
  return (
    <div className="flex flex-col gap-5">
      <Field label="Pay with">
        {(control) => (
          <Select
            {...control}
            value={values.method}
            onChange={(event) => onChange("method", event.target.value)}
          >
            {Object.entries(METHODS).map(([value, m]) => (
              <option key={value} value={value}>
                {m.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={method.account} hint={method.hint} error={errorFor("account", errors)}>
        {(control) => (
          <TextInput
            {...control}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={method.placeholder}
            value={values.account}
            onChange={(event) => onChange("account", event.target.value)}
            onBlur={() => touch("account")}
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={crypto ? `Amount in ${values.method === "bitcoin" ? "BTC" : "ETH"}` : "Amount"}
          optional
          hint="Leave empty to let the payer choose."
          error={errorFor("amount", errors)}
        >
          {(control) => (
            <TextInput
              {...control}
              inputMode="decimal"
              placeholder={method.amount}
              value={values.amount}
              onChange={(event) => onChange("amount", event.target.value)}
              onBlur={() => touch("amount")}
            />
          )}
        </Field>
        {values.method === "paypal" && (
          <Field label="Currency" optional>
            {(control) => (
              <Select
                {...control}
                value={values.currency}
                onChange={(event) => onChange("currency", event.target.value)}
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code || "Their default"}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        {(values.method === "venmo" || values.method === "bitcoin") && (
          <Field label="Note" optional>
            {(control) => (
              <TextInput
                {...control}
                maxLength={80}
                placeholder="Coffee"
                value={values.note}
                onChange={(event) => onChange("note", event.target.value)}
              />
            )}
          </Field>
        )}
      </div>
    </div>
  );
}
