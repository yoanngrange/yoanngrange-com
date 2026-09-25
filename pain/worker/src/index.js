// Pain voisins — API (Cloudflare Worker)
//   GET  /catalogue → produits actifs (lecture seule Airtable)
//   POST /contact    → envoie un SMS (Free Mobile) avec la demande du voisin

const T = { produits: 'tblSKTagNk2Ovmmdj' };
const F = {
  p: { nom: 'fldvy3GzWs9v7ICWH', desc: 'fldRyXCi7HEoGAqPP', allergenes: 'fld4jQ0m0XcdirDV6', photo: 'fldFHEqULeM72Tezu', prix: 'fld4aYD112jiR1WW6', actif: 'fld9F61a4tGUuWSgD', ordre: 'fldAPA2LEefe66c8w' },
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      if (request.method === 'GET' && url.pathname === '/catalogue') return json(await catalogue(env), cors, 60);
      if (request.method === 'POST' && url.pathname === '/contact') return json(await contact(request, env), cors);
      return new Response('Not found', { status: 404, headers: cors });
    } catch (err) {
      const status = err.status || 500;
      if (status === 500) console.error(err);
      return json({ error: status === 500 ? 'Erreur interne, réessayez plus tard.' : err.message }, cors, 0, status);
    }
  },
};

// ---------- Catalogue (lecture seule) ----------

async function catalogue(env) {
  const rows = await airtableList(env, T.produits, { filterByFormula: '{Actif}' });
  const produits = rows
    .map(r => {
      const f = r.fields;
      const photo = (f[F.p.photo] || [])[0];
      return {
        id: r.id,
        nom: f[F.p.nom] || '',
        description: f[F.p.desc] || '',
        allergenes: f[F.p.allergenes] || [],
        photo: photo ? (photo.thumbnails?.large?.url || photo.url) : null,
        prix: Number(f[F.p.prix] || 0),
        ordre: Number(f[F.p.ordre] ?? 999),
      };
    })
    .filter(p => p.nom && p.prix > 0)
    .sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, 'fr'));
  return { produits };
}

// ---------- Contact (SMS via Free Mobile) ----------

async function contact(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) throw httpError(400, 'Requête invalide.');

  const nom = clean(body.nom, 80);
  const message = clean(body.message, 300);
  if (!nom) throw httpError(400, 'Indiquez votre nom.');
  if (!message) throw httpError(400, 'Indiquez votre demande.');

  await sendSms(env, `Pain — ${nom} : ${message}`.slice(0, 480));
  return { ok: true };
}

// Free Mobile — notification SMS personnelle (gratuite, compte Free Mobile
// uniquement) : https://mobile.free.fr/moncompte/ → Options → "Notifications
// par SMS", active puis récupère l'identifiant et la clé.
async function sendSms(env, message) {
  const params = new URLSearchParams({ user: env.FREE_MOBILE_USER, pass: env.FREE_MOBILE_APIKEY, msg: message });
  const res = await fetch(`https://smsapi.free-mobile.fr/sendmsg?${params}`);
  if (!res.ok) { console.error('Free Mobile SMS', res.status, await res.text().catch(() => '')); throw new Error('SMS send failed'); }
}

// ---------- Utilitaires ----------

async function airtableList(env, tableId, params = {}) {
  const out = [];
  let offset;
  do {
    const qs = new URLSearchParams({ ...params, returnFieldsByFieldId: 'true', ...(offset ? { offset } : {}) });
    const res = await fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE}/${tableId}?${qs}`, {
      headers: { Authorization: `Bearer ${env.AIRTABLE_TOKEN}` },
    });
    const data = await res.json();
    if (!res.ok) { console.error('Airtable', data); throw new Error('Airtable read failed'); }
    out.push(...data.records);
    offset = data.offset;
  } while (offset);
  return out;
}

function clean(v, max) { return typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : ''; }
function httpError(status, message) { const e = new Error(message); e.status = status; return e; }

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0] || '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function json(data, headers, maxAge = 0, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': maxAge ? `public, max-age=${maxAge}` : 'no-store' },
  });
}
