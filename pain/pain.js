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
    p: { nom: 'fldvy3GzWs9v7ICWH', desc: 'fldRyXCi7HEoGAqPP', allergenes: 'fld4jQ0m0XcdirDV6', photo: 'fldFHEqULeM72Tezu', prix: 'fld4aYD112jiR1WW6', ordre: 'fldAPA2LEefe66c8w' },
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
    const records = await airtableList(AT.tables.produits, { filterByFormula: '{Actif}' });
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
        };
      })
      .filter(p => p.nom && p.prix > 0)
      .sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, 'fr'));
    return { produits };
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

  return { catalogue, stages, euro, fmt, esc };
})();
