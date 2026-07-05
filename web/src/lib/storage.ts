import { getSupabaseAdmin } from "@/lib/supabase";

const UPLOADS = "uploads";
const OUTPUTS = "outputs";

export async function uploadOutputPng(
  userId: string,
  png: Buffer,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const path = `${userId}/${Date.now()}.png`;

  const { error } = await supabase.storage
    .from(OUTPUTS)
    .upload(path, png, {
      contentType: "image/png",
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(OUTPUTS).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadInputImage(
  userId: string,
  bytes: Buffer,
  contentType: string,
  ext: string,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(UPLOADS).upload(path, bytes, {
    contentType,
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(UPLOADS).getPublicUrl(path);
  return data.publicUrl;
}
