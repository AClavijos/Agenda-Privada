// Configuración de Supabase (son datos públicos: la seguridad la dan las reglas RLS de la base de datos).
// Project URL y la clave "anon" / "publishable" de Supabase → Project Settings → API.
window.DEURES_CONFIG = {
  supabaseUrl: '__SUPABASE_URL__',
  supabaseKey: '__SUPABASE_KEY__'
};
if (window.DEURES_CONFIG.supabaseUrl.startsWith('__')) window.DEURES_CONFIG = {};
