import { createClient } from "@supabase/supabase-js";

export type PlaySessionInsert = {
  professor_name: string;
  appearance: {
    ageGroup?: string;
    gender?: string;
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

export type ProfessorGenerationInsert = {
  source: string;
  input_professor: Record<string, unknown>;
  resolved_professor: Record<string, unknown>;
  professor_summary: string;
  illustration_prompt: string;
  storage_bucket: string | null;
  storage_object_path: string | null;
  stored_full_image_url: string | null;
  background_removal_applied: boolean;
  background_removal_warning: string | null;
  storage_upload_warning: string | null;
};

export type CreditMessageRecord = {
  id: string;
  created_at: string;
  player_name: string;
  message_text: string;
  ending_key: string | null;
  ending_title: string | null;
  professor_image_url: string | null;
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
