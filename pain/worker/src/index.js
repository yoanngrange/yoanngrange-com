// Pain voisins — API (Cloudflare Worker)
//   GET  /catalogue        → produits actifs, stages, dates et créneaux livrables
//   POST /checkout         → valide le panier et crée une session Stripe Checkout
//   POST /stripe-webhook   → commande payée → enregistrement Airtable
//   cron 18:02 (Paris)     → email récapitulatif des livraisons du lendemain

import { parisNow, addDays, availableDates, relevantStages, earliestDate, inStage, SLOTS } from './dates.js';

const MAX_QTY = 10;
const T = { produits: 'tblSKTagNk2Ovmmdj', stages: 'tblVrD5So041wr6tp', commandes: 'tbl3GL0iLkhdPWXbC' };
const F = {
  p: { nom: 'fldvy3GzWs9v7ICWH', desc: 'fldRyXCi7HEoGAqPP', allergenes: 'fld4jQ0m0XcdirDV6', photo: 'fldFHEqULeM72Tezu', prix: 'fld4aYD112jiR1WW6', actif: 'fld9F61a4tGUuWSgD', ordre: 'fldAPA2LEefe66c8w' },
  s: { nom: 'flduzZPo1QF7QMDXU', debut: 'fldo5fxAw4dHSLWvE', fin: 'fldKwYyUpi28nqS3j' },
  c: { client: 'fldAHi5cmmaZwOfkd', etage: 'fldZIo32h54rX2aD0', porte: 'flda9kTnFxWpNb6Dw', date: 'fldcqkIkxxi3qz0Ba', heure: 'fldUv9cxu0jUp7xcp', articles: 'fld0ze69oeMk8LIec', total: 'fldalRsdFsP7I0hv4', email: 'fld4ai37Mu4julWJJ', statut: 'fldOwVLavthrQJoAu', session: 'fldjHOFnn2EMt3yMx' },
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      if (request.method === 'GET' && url.pathname === '/catalogue') return json(await catalogue(env), cors, 60);
      if (request.method === 'POST' && url.pathname === '/checkout') return json(await checkout(request, env), cors);
      if (request.method === 'POST' && url.pathname === '/stripe-webhook') return await stripeWebhook(request, env);
      return new Response('Not found', { status: 404, headers: cors });
    } catch (err) {
      const status = err.status || 500;
      if (status === 500) console.error(err);
      return json({ error: status === 500 ? 'Erreur interne, réessayez plus tard.' : err.message }, cors, 0, status);
    }
  },

  async scheduled(event, env, ctx) {
    // Deux déclencheurs UTC (16:02 et 17:02) pour couvrir heure d'été / d'hiver : on n'agit qu'à 18h Paris.
    if (parisNow().hour !== 18) return;
    ctx.waitUntil(dailyRecap(env));
  },
};

// ---------- Catalogue ----------

async function loadProducts(env) {
  const rows = await airtableList(env, T.produits, { filterByFormula: '{Actif}' });
  return rows
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
}

async function loadStages(env) {
  const rows = await airtableList(env, T.stages);
  return rows
    .map(r => ({ nom: r.fields[F.s.nom] || 'Stage', debut: r.fields[F.s.debut], fin: r.fields[F.s.fin] }))
    .filter(s => s.debut && s.fin);
}

async function catalogue(env) {
  const now = parisNow();
  const [produits, stages] = await Promise.all([loadProducts(env), loadStages(env)]);
  return {
    produits,
    stages: relevantStages(stages, now),
    enStage: inStage(now.ymd, stages),
    avantCutoff: now.hour < 18,
    premiereDate: earliestDate(now),
    dates: availableDates(stages, now),
    creneaux: SLOTS,
    maxQuantite: MAX_QTY,
  };
}

// ---------- Checkout ----------

async function checkout(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) throw httpError(400, 'Requête invalide.');

  const client = clean(body.client, 80);
  const etage = clean(body.etage, 20);
  const porte = body.porte;
  const { date, heure } = body;
  if (!client) throw httpError(400, 'Indiquez votre prénom et votre nom.');
  if (!etage) throw httpError(400, 'Indiquez votre étage.');
  if (!['Gauche', 'Droite'].includes(porte)) throw httpError(400, 'Indiquez votre porte (gauche ou droite).');
  if (!SLOTS.includes(heure)) throw httpError(400, 'Choisissez une heure de livraison entre 8:00 et 12:00.');

  const [produits, stages] = await Promise.all([loadProducts(env), loadStages(env)]);
  if (!availableDates(stages).includes(date)) {
    throw httpError(409, "Cette date de livraison n'est plus disponible. Choisissez-en une autre.");
  }

  const byId = new Map(produits.map(p => [p.id, p]));
  const qtyById = new Map();
  for (const it of Array.isArray(body.items) ? body.items : []) {
    const p = byId.get(it.id);
    const q = Number(it.qty);
    if (!p) throw httpError(409, "Un produit de votre panier n'est plus disponible. Retournez à la liste.");
    if (!Number.isInteger(q) || q < 1) throw httpError(400, 'Quantité invalide.');
    qtyById.set(p.id, (qtyById.get(p.id) || 0) + q);
  }
  if (!qtyById.size) throw httpError(400, 'Votre panier est vide.');
  for (const [id, q] of qtyById) {
    if (q > MAX_QTY) throw httpError(400, `${MAX_QTY} ${byId.get(id).nom} maximum par commande : ma capacité de production est limitée.`);
  }

  const lines = [...qtyById].map(([id, q]) => ({ p: byId.get(id), q }));
  const params = new URLSearchParams({
    mode: 'payment',
    locale: 'fr',
    success_url: `${env.SITE_URL}/pain/merci/`,
    cancel_url: `${env.SITE_URL}/pain/panier/`,
    'invoice_creation[enabled]': 'true',
    'payment_intent_data[description]': `Pain — livraison le ${frDate(date)} à ${heure}`,
    'metadata[client]': client,
    'metadata[etage]': etage,
    'metadata[porte]': porte,
    'metadata[date]': date,
    'metadata[heure]': heure,
    'metadata[articles]': lines.map(l => `${l.q} × ${l.p.nom}`).join('\n').slice(0, 500),
  });
  lines.forEach((l, i) => {
    params.set(`line_items[${i}][quantity]`, String(l.q));
    params.set(`line_items[${i}][price_data][currency]`, 'eur');
    params.set(`line_items[${i}][price_data][unit_amount]`, String(Math.round(l.p.prix * 100)));
    params.set(`line_items[${i}][price_data][product_data][name]`, l.p.nom);
  });

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const session = await res.json();
  if (!res.ok) { console.error('Stripe', session); throw new Error('Stripe checkout failed'); }
  return { url: session.url };
}

// ---------- Webhook Stripe ----------

async function stripeWebhook(request, env) {
  const payload = await request.text();
  const ok = await verifyStripeSignature(payload, request.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return new Response('Bad signature', { status: 400 });

  const event = JSON.parse(payload);
  if (event.type !== 'checkout.session.completed') return new Response('ignored');
  const s = event.data.object;
  if (s.payment_status !== 'paid') return new Response('not paid');

  // Idempotence : Stripe peut renvoyer le même événement
  const existing = await airtableList(env, T.commandes, { filterByFormula: `{Session Stripe}='${s.id}'`, maxRecords: '1' });
  if (existing.length) return new Response('already recorded');

  const m = s.metadata || {};
  await airtableCreate(env, T.commandes, {
    [F.c.client]: m.client,
    [F.c.etage]: m.etage,
    [F.c.porte]: m.porte,
    [F.c.date]: m.date,
    [F.c.heure]: m.heure,
    [F.c.articles]: m.articles,
    [F.c.total]: (s.amount_total || 0) / 100,
    [F.c.email]: s.customer_details?.email || undefined,
    [F.c.statut]: 'Payée',
    [F.c.session]: s.id,
  });

  // Paiement terminé après l'envoi du récap de 18:02 pour une livraison demain → alerte immédiate
  const now = parisNow();
  const afterRecap = now.hour > 18 || (now.hour === 18 && now.minute >= 2);
  if (afterRecap && m.date === addDays(now.ymd, 1)) {
    await sendEmail(env, `Commande tardive pour demain (${frDate(m.date)})`,
      `Une commande a été payée après l'envoi du récapitulatif de 18:02.\n\n${formatOrder({ ...m, total: (s.amount_total || 0) / 100 })}`);
  }
  return new Response('ok');
}

async function verifyStripeSignature(payload, header, secret) {
  if (!header || !secret) return false;
  const t = header.split(',').find(kv => kv.startsWith('t='))?.slice(2);
  const v1s = header.split(',').filter(kv => kv.startsWith('v1=')).map(kv => kv.slice(3));
  if (!t || !v1s.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`));
  const expected = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
  return v1s.some(v => timingSafeEqual(v, expected));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// ---------- Récap quotidien ----------

export async function dailyRecap(env) {
  const tomorrow = addDays(parisNow().ymd, 1);
  const rows = await airtableList(env, T.commandes, {
    filterByFormula: `AND({Statut}='Payée', DATETIME_FORMAT({Date de livraison}, 'YYYY-MM-DD')='${tomorrow}')`,
  });
  const orders = rows.map(r => ({
    client: r.fields[F.c.client], etage: r.fields[F.c.etage], porte: r.fields[F.c.porte]?.name || r.fields[F.c.porte],
    heure: r.fields[F.c.heure], articles: r.fields[F.c.articles] || '', total: r.fields[F.c.total],
  })).sort((a, b) => (a.heure || '').localeCompare(b.heure || ''));

  const subject = `Pain — livraisons du ${frDate(tomorrow)}`;
  if (!orders.length) return sendEmail(env, subject, 'Rien à faire pour aujourd\'hui.');

  const totals = new Map();
  for (const o of orders) {
    for (const line of o.articles.split('\n')) {
      const m = line.match(/^(\d+) × (.+)$/);
      if (m) totals.set(m[2], (totals.get(m[2]) || 0) + Number(m[1]));
    }
  }
  const text = [
    `À PRÉPARER POUR DEMAIN (${frDate(tomorrow)})`,
    ...[...totals].sort((a, b) => a[0].localeCompare(b[0], 'fr')).map(([nom, q]) => `  ${q} × ${nom}`),
    '',
    `LIVRAISONS (${orders.length})`,
    ...orders.map(o => formatOrder(o)),
  ].join('\n');
  return sendEmail(env, subject, text);
}

function formatOrder(o) {
  const porte = (o.porte || '').toLowerCase();
  return `${o.heure} — ${o.client}, étage ${o.etage}, porte ${porte}${o.total != null ? ` (${Number(o.total).toFixed(2).replace('.', ',')} €)` : ''}\n` +
    (o.articles || '').split('\n').map(l => `    ${l}`).join('\n') + '\n';
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

async function airtableCreate(env, tableId, fields) {
  const res = await fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE}/${tableId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ fields }], typecast: true }),
  });
  if (!res.ok) { console.error('Airtable', await res.text()); throw new Error('Airtable write failed'); }
}

async function sendEmail(env, subject, text) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.FROM_EMAIL, to: env.ORDER_EMAIL.split(',').map(s => s.trim()), subject, text }),
  });
  if (!res.ok) console.error('Resend', await res.text());
}

function frDate(ymd) {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(`${ymd}T12:00:00Z`));
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
