// =====================================================
//  EDGE FUNCTION "registrar" — el "portero" de los formularios
//
//  1. Verifica con Cloudflare Turnstile que es una persona (no un robot)
//  2. Revisa los límites (máximo de registros por conexión y por minuto)
//  3. Revisa los datos y las fotos
//  4. Sube las fotos y guarda el registro con permisos de servidor
//
//  Necesita el secreto TURNSTILE_SECRET (Edge Functions → Secrets).
// =====================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_FOTO_BYTES = 1024 * 1024; // 1 MB por foto (ya llegan comprimidas desde el celular)
const TIPOS_FOTO: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg" };

function responder(cuerpo: Record<string, unknown>, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Guardamos una "huella" de la conexión, nunca la IP real
async function huella(ip: string, sal: string) {
  const datos = new TextEncoder().encode(ip + "|" + sal);
  const hash = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(hash)).slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responder({ error: "metodo" }, 405);

  const secreto = Deno.env.get("TURNSTILE_SECRET");
  if (!secreto) return responder({ error: "config", detalle: "Falta el secreto TURNSTILE_SECRET" }, 500);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return responder({ error: "datos" }, 400);
  }

  const tipo = String(form.get("tipo") ?? "");
  if (tipo !== "hogar" && tipo !== "voluntario") return responder({ error: "tipo" }, 400);

  const ip = req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "sin-ip";
  const conexion = await huella(ip, secreto);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // ---------- 1. ¿Es una persona? ----------
  const verificacion = await fetch(
    Deno.env.get("TURNSTILE_URL") ?? "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({ secret: secreto, response: String(form.get("captcha") ?? ""), remoteip: ip }),
    },
  ).then((r) => r.json()).catch(() => ({ success: false }));

  if (!verificacion.success) {
    await sb.rpc("anotar_intento", { p_ip: conexion, p_tipo: tipo, p_resultado: "captcha" });
    return responder({ error: "captcha" }, 403);
  }

  // ---------- 2. Límites ----------
  const { data: permitido, error: errorLimite } = await sb.rpc("registrar_intento", { p_ip: conexion, p_tipo: tipo });
  if (errorLimite) return responder({ error: "servidor", detalle: errorLimite.message }, 500);
  if (!permitido) return responder({ error: "limite" }, 429);

  // ---------- 3. Datos ----------
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(String(form.get("datos") ?? "{}"));
  } catch {
    return responder({ error: "datos" }, 400);
  }
  const texto = (k: string, max = 250) => {
    const s = String(d[k] ?? "").trim().slice(0, max);
    return s === "" ? null : s;
  };
  const fuente = texto("fuente", 60);

  if (tipo === "voluntario") {
    const { error } = await sb.from("voluntarios").insert({
      nombre: texto("nombre", 120),
      telefono: texto("telefono", 10),
      parroquia: texto("parroquia", 80),
      barrio: texto("barrio", 120),
      ayuda: texto("ayuda", 300),
      codigo: texto("codigo", 30),
      fuente,
      consentimiento: d.consentimiento === true,
    });
    if (error) return responder({ error: "datos", detalle: error.message }, 400);
    return responder({ ok: true });
  }

  // ---------- 4. Hogar: fotos + registro ----------
  const fotos = form.getAll("fotos").filter((f): f is File => f instanceof File).slice(0, 2);
  for (const f of fotos) {
    if (!TIPOS_FOTO[f.type] || f.size > MAX_FOTO_BYTES) return responder({ error: "foto" }, 400);
  }

  const mes = new Date().toISOString().slice(0, 7);
  const rutas: string[] = [];
  const borrarFotos = async () => {
    if (rutas.length) await sb.storage.from("fotos-hogares").remove(rutas);
  };

  for (const f of fotos) {
    const ruta = `hogares/${mes}/${crypto.randomUUID()}.${TIPOS_FOTO[f.type]}`;
    const { error } = await sb.storage.from("fotos-hogares").upload(ruta, f, { contentType: f.type });
    if (error) {
      await borrarFotos();
      return responder({ error: "foto", detalle: error.message }, 500);
    }
    rutas.push(ruta);
  }

  const personas = parseInt(String(d.personas ?? ""), 10);
  const edad = parseInt(String(d.edad ?? ""), 10);
  const { error } = await sb.from("hogares").insert({
    nombre: texto("nombre", 120),
    cedula: texto("cedula", 10),
    telefono: texto("telefono", 10),
    sexo: texto("sexo", 20),
    edad: Number.isFinite(edad) ? edad : null,
    correo: texto("correo", 120)?.toLowerCase() ?? null,
    parroquia: texto("parroquia", 80),
    barrio: texto("barrio", 120),
    direccion: texto("direccion", 250),
    personas: Number.isFinite(personas) ? personas : null,
    vivienda: texto("vivienda", 20),
    mejoras: texto("mejoras", 200),
    fotos: rutas,
    fuente,
    consentimiento: d.consentimiento === true,
  });

  if (error) {
    await borrarFotos(); // si el registro falla, no dejamos fotos huérfanas
    if (error.code === "23505") return responder({ error: "cedula" }, 409);
    return responder({ error: "datos", detalle: error.message }, 400);
  }
  return responder({ ok: true });
});
