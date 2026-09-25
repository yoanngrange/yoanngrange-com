// Partagé par /pain
const PAIN = (() => {
  // URL du Worker Cloudflare (à remplacer après `wrangler deploy`)
  const API = 'https://pain-api.A_REMPLIR.workers.dev';

  async function catalogue() {
    const res = await fetch(`${API}/catalogue`);
    if (!res.ok) throw new Error('catalogue');
    return res.json();
  }

  async function contact(payload) {
    const res = await fetch(`${API}/contact`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "L'envoi a échoué. Réessayez.");
    return data;
  }

  const euro = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  return { catalogue, contact, euro, esc };
})();
