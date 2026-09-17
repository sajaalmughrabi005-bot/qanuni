"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapLawyer } from "@/lib/supabase/mappers";
import type { Lawyer } from "@/types";

export function useLawyer(id: string | undefined): Lawyer | undefined {
  const [lawyer, setLawyer] = useState<Lawyer | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    supabase
      .from("lawyers")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => setLawyer(data ? mapLawyer(data) : undefined));
  }, [id]);

  return lawyer;
}

export function useLawyerByProfileId(profileId: string | undefined): Lawyer | undefined {
  const [lawyer, setLawyer] = useState<Lawyer | undefined>(undefined);

  useEffect(() => {
    if (!profileId) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    supabase
      .from("lawyers")
      .select("*")
      .eq("profile_id", profileId)
      .single()
      .then(({ data }) => setLawyer(data ? mapLawyer(data) : undefined));
  }, [profileId]);

  return lawyer;
}

export function useLawyersWithOverrides(): Lawyer[] {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    supabase
      .from("lawyers")
      .select("*")
      .order("rating", { ascending: false })
      .then(({ data }) => setLawyers((data || []).map(mapLawyer)));
  }, []);

  return lawyers;
}
