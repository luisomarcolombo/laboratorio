// Ranking en línea del Laboratorio de vida de anaquel.
// Cloudflare Pages Function con base de datos D1 (binding "DB").
// Variables opcionales del proyecto:
//   CLASS_CODE  código que los equipos deben escribir para publicar
//   ADMIN_CODE  código del docente para borrar el ranking de un grupo

let listo = false;
async function asegurarTabla(db) {
  if (listo) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS resultados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grupo TEXT NOT NULL,
    equipo TEXT NOT NULL,
    escenario TEXT NOT NULL,
    puntaje INTEGER NOT NULL,
    material TEXT,
    calibre REAL,
    modelo TEXT,
    creado INTEGER NOT NULL
  )`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_resultados_grupo ON resultados (grupo, escenario, puntaje DESC)`).run();
  listo = true;
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
const limpio = (v, n) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, n);
const nombreGrupo = (v) => limpio(v || "general", 40).replace(/[^A-Za-z0-9_\-. ]/g, "") || "general";
const sinBD = () => json({ error: "Falta conectar la base de datos D1 con el nombre DB." }, 503);

export async function onRequestGet({ request, env }) {
  if (!env.DB) return sinBD();
  await asegurarTabla(env.DB);
  const grupo = nombreGrupo(new URL(request.url).searchParams.get("grupo"));
  const { results } = await env.DB.prepare(
    `SELECT equipo, escenario, puntaje, material, calibre, modelo, creado FROM (
       SELECT *, ROW_NUMBER() OVER (PARTITION BY equipo, escenario ORDER BY puntaje DESC, creado ASC) AS n
       FROM resultados WHERE grupo = ?1
     ) WHERE n = 1 ORDER BY puntaje DESC, creado ASC LIMIT 300`
  ).bind(grupo).all();
  return json({ grupo, requiereCodigo: Boolean(env.CLASS_CODE), entradas: results || [] });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return sinBD();
  const largo = Number(request.headers.get("content-length") || 0);
  if (largo > 4096) return json({ error: "Solicitud demasiado grande." }, 413);
  let b;
  try { b = await request.json(); } catch { return json({ error: "El cuerpo debe ser JSON." }, 400); }
  if (!b || typeof b !== "object") return json({ error: "El cuerpo debe ser JSON." }, 400);
  if (env.CLASS_CODE && limpio(b.codigo, 40) !== env.CLASS_CODE) return json({ error: "Código de clase incorrecto." }, 403);
  const grupo = nombreGrupo(b.grupo);
  const equipo = limpio(b.equipo, 40);
  const escenario = limpio(b.escenario, 20);
  const puntaje = Math.round(Number(b.puntaje));
  const calibre = Number(b.calibre);
  if (!equipo) return json({ error: "Falta el nombre del equipo." }, 400);
  if (!/^[A-Za-z0-9_-]{1,20}$/.test(escenario)) return json({ error: "Escenario no válido." }, 400);
  if (!Number.isFinite(puntaje) || puntaje < 0 || puntaje > 100) return json({ error: "Puntaje fuera de rango." }, 400);
  await asegurarTabla(env.DB);
  const cuenta = await env.DB.prepare(`SELECT COUNT(*) AS c FROM resultados WHERE grupo = ?1`).bind(grupo).first();
  if (cuenta && cuenta.c >= 5000) return json({ error: "El grupo alcanzó el máximo de resultados." }, 429);
  await env.DB.prepare(
    `INSERT INTO resultados (grupo, equipo, escenario, puntaje, material, calibre, modelo, creado)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
  ).bind(grupo, equipo, escenario, puntaje, limpio(b.material, 60),
         Number.isFinite(calibre) ? Math.max(0, Math.min(10, calibre)) : null,
         limpio(b.modelo, 40), Date.now()).run();
  return json({ ok: true }, 201);
}

export async function onRequestDelete({ request, env }) {
  if (!env.DB) return sinBD();
  if (!env.ADMIN_CODE || request.headers.get("x-admin-code") !== env.ADMIN_CODE)
    return json({ error: "Código de administrador incorrecto o no configurado." }, 403);
  await asegurarTabla(env.DB);
  const grupo = nombreGrupo(new URL(request.url).searchParams.get("grupo"));
  const r = await env.DB.prepare(`DELETE FROM resultados WHERE grupo = ?1`).bind(grupo).run();
  return json({ ok: true, borrados: r.meta ? r.meta.changes : null });
}
