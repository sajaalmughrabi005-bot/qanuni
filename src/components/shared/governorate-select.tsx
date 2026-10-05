"use client";

import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GOVERNORATES, governorateKey } from "@/lib/governorates";

/** Returns a function that turns a stored city value into its label in the current language. */
export function useGovernorateLabel() {
  const t = useTranslations("common.governorates");
  return (value: string | undefined | null): string => {
    const key = governorateKey(value);
    return key ? t(key) : value || "";
  };
}

/** Governorate picker (no free typing). `value` may be a key or an older free-text city; it is normalised. */
export function GovernorateSelect({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string | undefined | null;
  onChange: (key: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const t = useTranslations("common.governorates");
  const current = governorateKey(value) ?? "";
  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder ?? t("placeholder")} />
      </SelectTrigger>
      <SelectContent>
        {GOVERNORATES.map((g) => (
          <SelectItem key={g} value={g}>
            {t(g)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
