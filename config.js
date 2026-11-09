// Configuración de Supabase (son datos públicos: la seguridad la dan las reglas RLS de la base de datos).
// Project URL y la clave "anon" / "publishable" de Supabase → Project Settings → API.
window.DEURES_CONFIG = {
  supabaseUrl: 'https://boknhpwueqzjgzmafgic.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJva25ocHd1ZXF6amd6bWFmZ2ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyNDYzMTAsImV4cCI6MjEwOTgyMjMxMH0.UWv20pX0cOO2tIlRLmkoQcOb5L_LhCRK02P0RYNsjco'
};
if (window.DEURES_CONFIG.supabaseUrl.startsWith('__')) window.DEURES_CONFIG = {};
