// Partagé par /pain
const PAIN = (() => {
  // Airtable — accès public en lecture seule (token scope data.records:read,
  // limité à la base Pain voisins). Même pattern que caracteres-ameriques.
  const AT = {
    key: 'patMY6Q3r9RySvrJl.d0c3d66f3fb9cf767d3239454f633cd9b8110eac9f53391cffd6919f335a612d',
    base: 'appzrC3TnjonofSp2',
    table: 'tblSKTagNk2Ovmmdj', // Produits
  };
  const F = { nom: 'fldvy3GzWs9v7ICWH', desc: 'fldRyXCi7HEoGAqPP', allergenes: 'fld4jQ0m0XcdirDV6', photo: 'fldFHEqULeM72Tezu', prix: 'fld4aYD112jiR1WW6', ordre: 'fldAPA2LEefe66c8w' };

  async function catalogue() {
    const params = new URLSearchParams({ filterByFormula: '{Actif}', returnFieldsByFieldId: 'true' });
    let records = [], offset;
    do {
      if (offset) params.set('offset', offset); else params.delete('offset');
      const res = await fetch(`https://api.airtable.com/v0/${AT.base}/${AT.table}?${params}`, {
        headers: { Authorization: `Bearer ${AT.key}` },
      });
      if (!res.ok) throw new Error('catalogue');
      const data = await res.json();
      records = records.concat(data.records);
      offset = data.offset;
    } while (offset);

    const produits = records
      .map(r => {
        const f = r.fields;
        const photos = (f[F.photo] || []).map(p => p.thumbnails?.large?.url || p.url);
        return {
          id: r.id,
          nom: f[F.nom] || '',
          description: f[F.desc] || '',
          allergenes: f[F.allergenes] || [],
          photos,
          prix: Number(f[F.prix] || 0),
          ordre: Number(f[F.ordre] ?? 999),
        };
      })
      .filter(p => p.nom && p.prix > 0)
      .sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, 'fr'));
    return { produits };
  }

  const euro = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  return { catalogue, euro, esc };
})();
