# Pain voisins — yoanngrange.com/pain

Page de présentation du pain pour les voisins de l'immeuble : liste des produits (lecture seule depuis Airtable) + numéro de téléphone + formulaire "envoyer une demande" qui déclenche un SMS. Pas de commande en ligne, pas de paiement — chaque demande est traitée manuellement (téléphone ou rappel).

Le lien n'est pas public : aucune mention depuis la home, ni dans le sitemap, le robots.txt ou le llms.txt. La page a `noindex`.

## Architecture

```
index.html, pain.css, pain.js   → à la racine du repo GitHub Pages de yoanngrange.com (dossier /pain)
worker/                          → Cloudflare Worker "pain-api" (gratuit)
  GET  /catalogue   produits actifs (lecture seule Airtable, token data.records:read uniquement)
  POST /contact     envoie un SMS via l'API de notification Free Mobile avec le nom + la demande du voisin
```

Airtable : base **Pain voisins** (espace « pain »), table Produits uniquement — aucune écriture depuis le Worker.

## Mise en route

1. **Airtable** : crée un token personnel (airtable.com/create/tokens) avec le seul scope `data.records:read`, limité à la base *Pain voisins*. Pas de `data.records:write` nécessaire : le Worker ne fait plus que lire les produits.
2. **Free Mobile** (compte Free Mobile personnel) : mobile.free.fr/moncompte → Options → active « Notifications par SMS », récupère l'identifiant et la clé affichés.
3. **Worker** :
   ```bash
   cd worker
   npx wrangler login
   npx wrangler secret put AIRTABLE_TOKEN
   npx wrangler secret put FREE_MOBILE_USER
   npx wrangler secret put FREE_MOBILE_APIKEY
   npx wrangler deploy
   ```
4. **Site** : dans `pain.js`, remplace `A_REMPLIR` dans l'URL `API` par l'URL affichée par `wrangler deploy`. Dans `index.html`, remplace le `A_REMPLIR` du lien `tel:` et du texte affiché par le vrai numéro de téléphone.

## Au quotidien

- **Ajouter un produit** : nouvelle ligne dans Produits (nom, description, allergènes, photo, prix) puis coche « Actif ». Décoche pour le retirer. « Ordre » règle l'ordre d'affichage.
- **Une demande arrive** : SMS reçu directement sur le téléphone (« Pain — {nom} : {message} ») — pas d'enregistrement ailleurs, tout se passe par SMS/téléphone avec le voisin.
