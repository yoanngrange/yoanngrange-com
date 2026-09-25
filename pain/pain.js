// Partagé par /pain, /pain/panier et /pain/merci
const PAIN = (() => {
  // URL du Worker Cloudflare (à remplacer après `wrangler deploy`)
  const API = 'https://pain-api.A_REMPLIR.workers.dev';
  const CART_KEY = 'pain-panier';
  const INFO_KEY = 'pain-voisin';

  const store = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* navigation privée */ } },
    del(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } },
  };

  // Panier : [{ id, qty }]
  const cart = {
    items: () => store.get(CART_KEY, []),
    save: items => store.set(CART_KEY, items.filter(i => i.qty > 0)),
    qtyOf: id => (cart.items().find(i => i.id === id) || {}).qty || 0,
    count: () => cart.items().reduce((s, i) => s + i.qty, 0),
    add(id, qty) {
      const items = cart.items();
      const found = items.find(i => i.id === id);
      if (found) found.qty += qty; else items.push({ id, qty });
      cart.save(items);
    },
    setQty(id, qty) { cart.save(cart.items().map(i => (i.id === id ? { ...i, qty } : i))); },
    remove(id) { cart.save(cart.items().filter(i => i.id !== id)); },
    clear: () => store.del(CART_KEY),
  };

  async function catalogue() {
    const res = await fetch(`${API}/catalogue`);
    if (!res.ok) throw new Error('catalogue');
    return res.json();
  }

  async function checkout(payload) {
    const res = await fetch(`${API}/checkout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Le paiement n\'a pas pu démarrer. Réessayez.');
    return data;
  }

  const euro = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
  const fmt = (ymd, opts = { weekday: 'long', day: 'numeric', month: 'long' }) =>
    new Intl.DateTimeFormat('fr-FR', { ...opts, timeZone: 'UTC' }).format(new Date(`${ymd}T12:00:00Z`));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function stageText(s) {
    return s.debut === s.fin ? `le ${fmt(s.debut)}` : `du ${fmt(s.debut)} au ${fmt(s.fin)}`;
  }

  // Bandeau d'informations commun (cut-off + stages)
  function infoHTML(cat) {
    const first = fmt(cat.premiereDate);
    const cutoff = cat.avantCutoff
      ? `Commandez avant <strong>18:00</strong> pour être livré <strong>demain</strong> (${first}).`
      : `Il est plus de 18:00 : la livraison est possible au plus tôt <strong>après-demain</strong> (${first}).`;
    let html = `<p>${cutoff} Pour toute livraison le lendemain, la commande doit être passée avant 18:00 la veille ; à partir de 18:01, elle est livrée le surlendemain à l'heure souhaitée, entre 8:00 et 12:00.</p>`;
    if (cat.stages.length) {
      const list = cat.stages.map(stageText).join(', ');
      html += `<p class="stage">${cat.enStage ? '<strong>Je suis actuellement en stage de boulangerie.</strong> ' : ''}Pendant mes périodes de stage, je ne peux ni produire ni livrer : ${esc(list)}. Vous pouvez tout de même commander pour une livraison en dehors de ces dates.</p>`;
    }
    return html;
  }

  function updateCartBadge() {
    document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = cart.count(); });
  }

  return { cart, store, catalogue, checkout, euro, fmt, esc, infoHTML, updateCartBadge, INFO_KEY };
})();
