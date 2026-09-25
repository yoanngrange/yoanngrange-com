// Règles de dates — source de vérité unique (utilisée par le Worker, jamais par le navigateur).
// Tout est calculé à l'heure de Paris.

export const TZ = 'Europe/Paris';
export const CUTOFF_HOUR = 18;      // commande avant 18:00 → livraison le lendemain au plus tôt
export const HORIZON_DAYS = 30;     // on peut commander jusqu'à 30 jours à l'avance
export const SLOTS = buildSlots('08:00', '12:00', 15);

function buildSlots(from, to, stepMin) {
  const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const out = [];
  for (let t = toMin(from); t <= toMin(to); t += stepMin) {
    out.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
  }
  return out;
}

// { ymd: 'YYYY-MM-DD', hour, minute } à Paris pour un instant donné
export function parisNow(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(date).map(p => [p.type, p.value])
  );
  const hour = Number(parts.hour) % 24; // certains moteurs renvoient "24" à minuit
  return { ymd: `${parts.year}-${parts.month}-${parts.day}`, hour, minute: Number(parts.minute) };
}

export function addDays(ymd, n) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function inStage(ymd, stages) {
  return stages.some(s => s.debut && s.fin && ymd >= s.debut && ymd <= s.fin);
}

// Première date commandable en ignorant les stages (lendemain ou surlendemain)
export function earliestDate(now = parisNow()) {
  return addDays(now.ymd, now.hour < CUTOFF_HOUR ? 1 : 2);
}

// Liste des dates livrables, stages exclus
export function availableDates(stages, now = parisNow()) {
  const first = earliestDate(now);
  const out = [];
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const d = addDays(first, i);
    if (!inStage(d, stages)) out.push(d);
  }
  return out;
}

// Stage en cours ou à venir (pour l'affichage)
export function relevantStages(stages, now = parisNow()) {
  return stages
    .filter(s => s.fin && s.fin >= now.ymd)
    .sort((a, b) => a.debut.localeCompare(b.debut));
}
