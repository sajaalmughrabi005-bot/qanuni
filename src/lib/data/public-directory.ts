import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapLawyer } from "@/lib/supabase/mappers";
import { QueryFailure } from "./query-failure";

const publicRow = z.object({
  id:z.string().min(1), profile_id:z.string().min(1), full_name:z.string().trim().min(1),
  specialties:z.array(z.string()).nullable().optional(), languages:z.array(z.string()).nullable().optional(),
  verification_status:z.literal("approved"),
  bio:z.string().nullable().optional(), city:z.string().nullable().optional(), avatar_url:z.string().nullable().optional(),
  consultation_types:z.array(z.string()).nullable().optional(), preferred_categories:z.array(z.string()).nullable().optional(),
  accepting_new_cases:z.boolean().nullable().optional(), availability_status:z.string().nullable().optional(),
}).passthrough();

export function directoryFailure(error: unknown): QueryFailure {
  const item=error&&typeof error==="object"?error as Record<string,unknown>:{};
  const code=item.code;
  if(code==="PGRST205"||code==="42P01"||code==="42703")return new QueryFailure("directory_schema");
  if(code==="42501"||code==="PGRST301"||code==="PGRST302")return new QueryFailure("directory_permission");
  if(/fetch failed|failed to fetch|network|ENOTFOUND|timed? ?out/i.test(String(item.message||"")))return new QueryFailure("network_error");
  return error instanceof QueryFailure?error:new QueryFailure("directory_unavailable");
}

export async function readPublicDirectory(client: SupabaseClient | null, id?: string) {
  if(!client)throw new QueryFailure("not_configured");
  try {
    let query=client.from("lawyers_public").select("*");
    if(id)query=query.eq("id",id);
    const {data,error}=await query.order("rating",{ascending:false});
    if(error)throw directoryFailure(error);
    const parsed=z.array(publicRow).safeParse(data);
    if(!parsed.success)throw new QueryFailure("directory_invalid_data");
    return parsed.data.map(mapLawyer);
  } catch(cause) {
    const error=directoryFailure(cause);
    console.warn("HAQ public directory unavailable",{operation:"lawyers_public",category:error.code});
    throw error;
  }
}
