import { createClient } from "@supabase/supabase-js";

export type PlaySessionInsert = {
  professor_name: string;
  appearance: {
    hair: string;
    eyes: string;
    nose: string;
    face: string;
    vibe: string;
  };
  custom_prompt: string;
  professor_summary: string;
  illustration_prompt: string;
  chapter_scores: Record<string, number>;
  total_score: number;
  ending_key: string;
  ending_title: string;
  story_log: string[];
};

export function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
