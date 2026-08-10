const supabaseUrl = String(process.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = String(process.env.VITE_SUPABASE_ANON_KEY || '').trim();

const failures = [];
if (!supabaseUrl) failures.push('VITE_SUPABASE_URL is missing');
if (!supabaseAnonKey) failures.push('VITE_SUPABASE_ANON_KEY is missing');

if (supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co')) {
      failures.push('VITE_SUPABASE_URL is not a production-style Supabase HTTPS origin');
    }
  } catch {
    failures.push('VITE_SUPABASE_URL is not a valid URL');
  }
}

if (supabaseAnonKey && supabaseAnonKey.length < 20) {
  failures.push('VITE_SUPABASE_ANON_KEY is not a plausible public client key');
}

if (failures.length) {
  console.error('[native-env] Refusing to package an unauthenticated iOS shell:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error('[native-env] Load the verified aom-studio production environment, then rerun npm run ios:sync.');
  process.exit(1);
}

console.log('[native-env] Production Supabase client configuration is present.');
