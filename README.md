# Deures · Agenda de clase

App instalable (PWA) para Android y PC: deberes, exámenes, horario y calendario personal. Se sincroniza en tiempo real entre dispositivos y avisa con notificaciones aunque esté cerrada. Idiomas: català, castellano, English.

## Qué hay en esta carpeta

| Carpeta / archivo | Para qué sirve |
|---|---|
| `index.html`, `sw.js`, `manifest.webmanifest`, `icons/`, `vendor/` | La app (lo que publica GitHub Pages) |
| `config.js` | **Aquí van tu URL y tu clave de Supabase** |
| `supabase/setup.sql` | Crea las tablas y la seguridad |
| `supabase/functions/deures-push/` | Función que manda los avisos |
| `supabase/cron.sql` | Hace que los avisos se comprueben cada 5 minutos |
| `source/` | Código fuente (para hacer cambios: `python3 source/build.py`) |

---

## Puesta en marcha (unos 15 minutos)

### 1 · Supabase (base de datos + avisos)
1. Entra en **supabase.com** → *New project*. Nombre: `deures`. Región: **West EU (Paris)** o **Central EU (Frankfurt)**. Guarda la contraseña de la base de datos.
2. **SQL Editor** → *New query* → pega todo `supabase/setup.sql` → **Run**.
3. **Edge Functions** → *Deploy a new function* → *Via Editor*:
   - Nombre: `deures-push`
   - Crea dos archivos: `index.ts` y `reminders.ts` con el contenido de `supabase/functions/deures-push/`.
   - **Desactiva "Verify JWT" / "Enforce JWT verification"** (los avisos los lanza el cron, no un usuario).
   - *Deploy*.
4. **SQL Editor** → pega `supabase/cron.sql`, cambia `TU-PROYECTO` por el identificador de tu proyecto (lo que va antes de `.supabase.co`) → **Run**.
5. **Authentication → URL Configuration**: en *Site URL* y en *Redirect URLs* pon `https://TU-USUARIO.github.io/deures/`.
6. **Project Settings → API** (o *API Keys*): copia la **Project URL** y la clave **anon / publishable**.

### 2 · GitHub Pages (la dirección de la app)
1. GitHub → *New repository* → nombre `deures` → **Public** → *Create*.
2. *uploading an existing file* → arrastra **todo el contenido de esta carpeta** → *Commit changes*.
3. Abre `config.js` en GitHub (lápiz ✏️) y pon tu URL y tu clave del paso 1.6 → *Commit*.
4. **Settings → Pages** → *Source: Deploy from a branch* → `main` / `(root)` → *Save*.
5. En 1–2 minutos estará en `https://TU-USUARIO.github.io/deures/`.

### 3 · Instalar y activar avisos
- **PC (Chrome o Edge):** abre la dirección → *Crear cuenta* → confirma el correo → *Entrar* → icono de **instalar** en la barra de direcciones. Luego **Ajustes → Avisos → Activar en este dispositivo**. Repite en cada PC.
- **Android (Chrome):** abre la dirección → *Entrar* → menú ⋮ → **Instalar aplicación** → abre la app → **Ajustes → Activar en este dispositivo** → **Enviar prueba**.

### Avisos que manda
- **Entregas:** la víspera a las 20:00 (agrupadas) y el mismo día 3 h antes de la hora de entrega.
- **Exámenes:** 3 días antes y la víspera a las 20:00, con los temas que te quedan.
- **Eventos personales:** resumen a primera hora (08:00) con los planes del día.
- Las horas se cambian en **Ajustes → Avisos**.

### Traer lo de la versión de claude.ai
En la versión antigua: *Ajustes → Copiar mis datos*. En la nueva: *Ajustes → Copia de seguridad → pegar → Importar*.

### Actualizar la app
Sube los archivos nuevos al repositorio. La app instalada se actualiza sola la siguiente vez que la abras.
