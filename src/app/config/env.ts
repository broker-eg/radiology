// The single validated source of env config — never read import.meta.env elsewhere.
function read() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const problems: string[] = [];
  try {
    if (!url || !/^https?:$/.test(new URL(url).protocol)) problems.push('VITE_SUPABASE_URL');
  } catch {
    problems.push('VITE_SUPABASE_URL');
  }
  if (!key) problems.push('VITE_SUPABASE_ANON_KEY');
  if (problems.length) {
    console.error('Invalid environment configuration:', problems.join(', '));
    throw new Error('Invalid environment configuration. See .env.example.');
  }
  return { VITE_SUPABASE_URL: url as string, VITE_SUPABASE_ANON_KEY: key as string };
}

export const env = read();
