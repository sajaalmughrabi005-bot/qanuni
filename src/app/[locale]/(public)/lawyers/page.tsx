"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { LawyerCard } from "@/components/shared/lawyer-card";
import { useLawyersWithOverrides } from "@/lib/auth/use-lawyer";
import type { LawyerSpecialty } from "@/types";

const specialties: LawyerSpecialty[] = [
  "rental",
  "employment",
  "commercial",
  "family",
  "criminal",
  "real_estate",
  "corporate",
  "civil",
];

export default function LawyerMarketplacePage() {
  const t = useTranslations("marketplace");
  const tSpec = useTranslations("marketplace.specialties");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<string>("all");
  const [specialty, setSpecialty] = useState<string>("all");
  const lawyers = useLawyersWithOverrides();

  const cities = useMemo(() => Array.from(new Set(lawyers.map((l) => l.city))), [lawyers]);

  const filtered = lawyers.filter((l) => {
    if (query && !l.fullName.toLowerCase().includes(query.toLowerCase())) return false;
    if (city !== "all" && l.city !== city) return false;
    if (specialty !== "all" && !l.specialties.includes(specialty as LawyerSpecialty)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-foreground-muted">{t("subtitle")}</p>
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder")}
            className="ps-10"
          />
        </div>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("search.allCities")}</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={specialty} onValueChange={setSpecialty}>
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("search.allSpecialties")}</SelectItem>
            {specialties.map((s) => (
              <SelectItem key={s} value={s}>
                {tSpec(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(query || city !== "all" || specialty !== "all") && (
          <Button
            variant="ghost"
            onClick={() => {
              setQuery("");
              setCity("all");
              setSpecialty("all");
            }}
          >
            {t("search.clearFilters")}
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title={t("empty")} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lawyer) => (
            <LawyerCard key={lawyer.id} lawyer={lawyer} />
          ))}
        </div>
      )}
    </div>
  );
}
