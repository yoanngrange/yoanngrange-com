// Partagé par /pain
const PAIN = (() => {
  // Airtable — accès public en lecture seule (token scope data.records:read,
  // limité à la base Pain voisins). Même pattern que caracteres-ameriques.
  const AT = {
    key: 'patMY6Q3r9RySvrJl.d0c3d66f3fb9cf767d3239454f633cd9b8110eac9f53391cffd6919f335a612d',
    base: 'appzrC3TnjonofSp2',
    tables: { produits: 'tblSKTagNk2Ovmmdj', stages: 'tblVrD5So041wr6tp' },
  };
  const F = {
    p: {
      nom: 'fldvy3GzWs9v7ICWH', desc: 'fldRyXCi7HEoGAqPP', allergenes: 'fld4jQ0m0XcdirDV6', photo: 'fldFHEqULeM72Tezu',
      prix: 'fld4aYD112jiR1WW6', ordre: 'fldAPA2LEefe66c8w', actif: 'fld9F61a4tGUuWSgD',
      recetteOrganigramme: 'flddv4s8YoTfLafyN', recetteIngredients: 'fldXUYoM97Bp3aARu', recetteEtapes: 'fldL4fH1TlFXq8DQo',
      recetteTempBase: 'fld9aFqXqgjjebeNS',
    },
    s: { debut: 'fldo5fxAw4dHSLWvE', fin: 'fldKwYyUpi28nqS3j' },
  };

  async function airtableList(tableId, params = {}) {
    const qs = new URLSearchParams({ returnFieldsByFieldId: 'true', ...params });
    let records = [], offset;
    do {
      if (offset) qs.set('offset', offset); else qs.delete('offset');
      const res = await fetch(`https://api.airtable.com/v0/${AT.base}/${tableId}?${qs}`, {
        headers: { Authorization: `Bearer ${AT.key}` },
      });
      if (!res.ok) throw new Error('airtable');
      const data = await res.json();
      records = records.concat(data.records);
      offset = data.offset;
    } while (offset);
    return records;
  }

  async function catalogue() {
    const records = await airtableList(AT.tables.produits);
    const produits = records
      .map(r => {
        const f = r.fields;
        const photos = (f[F.p.photo] || []).map(p => p.thumbnails?.large?.url || p.url);
        return {
          id: r.id,
          nom: f[F.p.nom] || '',
          description: f[F.p.desc] || '',
          allergenes: f[F.p.allergenes] || [],
          photos,
          prix: Number(f[F.p.prix] || 0),
          ordre: Number(f[F.p.ordre] ?? 999),
          actif: !!f[F.p.actif],
        };
      })
      .filter(p => p.nom && p.prix > 0 && p.actif)
      .sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, 'fr'));
    return { produits };
  }

  // Tous les produits (actifs ou non — la page recettes est un outil interne),
  // avec leurs fiches techniques. Pas de prix : usage interne uniquement.
  async function recettes() {
    const records = await airtableList(AT.tables.produits);
    return records
      .map(r => {
        const f = r.fields;
        const photos = (f[F.p.photo] || []).map(p => p.thumbnails?.large?.url || p.url);
        return {
          id: r.id,
          nom: f[F.p.nom] || '',
          allergenes: f[F.p.allergenes] || [],
          photos,
          actif: !!f[F.p.actif],
          organigramme: (f[F.p.recetteOrganigramme] || []).map(a => a.thumbnails?.large?.url || a.url),
          tempBase: f[F.p.recetteTempBase] ?? null,
          ingredientsMd: f[F.p.recetteIngredients] || '',
          etapesMd: f[F.p.recetteEtapes] || '',
          ordre: Number(f[F.p.ordre] ?? 999),
        };
      })
      .filter(p => p.nom)
      .sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, 'fr'));
  }

  // Small Markdown -> HTML renderer for the recipe fields (Airtable "Rich
  // text" fields, read back as Markdown). Supports just what recipes need:
  // headings (any depth, all rendered <h4>, one level below the page's own
  // <h3> sections), bullet lists, numbered lists, bold/italic, and plain
  // lines as paragraphs. Escapes text first so raw HTML in a field can't
  // leak into the page, then turns markdown syntax into real tags.
  function markdown(text) {
    if (!text) return '';
    const inline = s => esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?:^|(?<=\s))\*(\S(?:.*?\S)?)\*(?=\s|$)/g, '<em>$1</em>');
    let html = '', list = null;
    const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      let m;
      if (!line) { closeList(); }
      else if ((m = line.match(/^#{1,6}\s+(.*)$/))) { closeList(); html += `<h4>${inline(m[1])}</h4>`; }
      else if ((m = line.match(/^[-•]\s+(.*)$/))) {
        if (list !== 'ul') { closeList(); html += '<ul>'; list = 'ul'; }
        html += `<li>${inline(m[1])}</li>`;
      } else if ((m = line.match(/^\d+[.)]\s+(.*)$/))) {
        if (list !== 'ol') { closeList(); html += '<ol>'; list = 'ol'; }
        html += `<li>${inline(m[1])}</li>`;
      } else { closeList(); html += `<p>${inline(line)}</p>`; }
    }
    closeList();
    return html;
  }

  // Périodes de stage non encore terminées (fin >= aujourd'hui), triées.
  async function stages() {
    const records = await airtableList(AT.tables.stages);
    const today = new Date().toISOString().slice(0, 10);
    return records
      .map(r => ({ debut: r.fields[F.s.debut], fin: r.fields[F.s.fin] }))
      .filter(s => s.debut && s.fin && s.fin >= today)
      .sort((a, b) => a.debut.localeCompare(b.debut));
  }

  const euro = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
  const fmt = ymd => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${ymd}T12:00:00Z`));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  return { catalogue, recettes, stages, euro, fmt, esc, markdown };
})();
