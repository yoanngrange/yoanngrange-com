# Pain voisins — yoanngrange.com/pain

Micro-app de commande de pain pour les voisins de l'immeuble. Le lien n'est pas public : aucune mention depuis la home, ni dans le sitemap, le robots.txt ou le llms.txt. Les pages ont `noindex`.

## Architecture

```
site/pain/          → à copier dans le repo GitHub Pages de yoanngrange.com (dossier /pain)
  index.html        liste des produits + ajout au panier (max 10 par produit)
  panier/index.html récap, prénom/nom, étage, porte, date + heure, bouton Payer
  merci/index.html  confirmation (vide le panier)
  pain.js / .css    code partagé (panier dans localStorage)
worker/             → Cloudflare Worker "pain-api" (gratuit)
  GET  /catalogue       produits actifs + stages + dates/créneaux livrables
  POST /checkout        revalide tout côté serveur, crée la session Stripe Checkout
  POST /stripe-webhook  paiement confirmé → ligne dans Airtable « Commandes »
  cron 18:02 Paris      email récap des livraisons du lendemain (ou « Rien à faire pour aujourd'hui. »)
```

Airtable : base **Pain voisins** (espace « pain »), tables Produits, Stages, Commandes.

Les règles métier sont calculées dans le Worker (`src/dates.js`), jamais dans le navigateur :
- commande avant 18:00 → livraison au plus tôt le lendemain ; à partir de 18:00 → le surlendemain ;
- créneaux 8:00 → 12:00 par pas de 15 min, jusqu'à 30 jours à l'avance ;
- dates comprises dans un stage (table Stages, dates incluses) exclues ;
- 10 unités maximum par produit.

## Mise en route

1. **Airtable** : crée un token personnel (airtable.com/create/tokens) avec les scopes `data.records:read` et `data.records:write`, limité à la base *Pain voisins*.
2. **Stripe** (compte Vraie Forêt) :
   - Réglages → Entreprise : nom public « Vraie Forêt », adresse, SIRET si besoin, pour que les factures soient au nom de l'association.
   - Réglages → Emails clients : active « Paiements réussis » pour que le voisin reçoive son reçu/facture.
   - Développeurs → Webhooks → Ajouter un endpoint : `https://pain-api.<ton-sous-domaine>.workers.dev/stripe-webhook`, événement `checkout.session.completed`. Copie le secret `whsec_…`.
3. **Worker** :
   ```bash
   cd worker
   # renseigne ORDER_EMAIL dans wrangler.toml (ton adresse de réception)
   npx wrangler login
   npx wrangler secret put AIRTABLE_TOKEN
   npx wrangler secret put STRIPE_SECRET_KEY
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   npx wrangler secret put RESEND_API_KEY
   npx wrangler deploy
   ```
4. **Site** : dans `site/pain/pain.js`, remplace `A_REMPLIR` dans l'URL `API` par l'URL affichée par `wrangler deploy`, puis copie `site/pain/` dans le repo de yoanngrange.com et pousse.
5. **Test** : commence avec les clés Stripe de test (`sk_test_…`, carte `4242 4242 4242 4242`), vérifie la ligne dans Airtable, puis passe en `sk_live_…` avec un nouveau webhook live.

Pour tester le récap sans attendre 18:02 : `npx wrangler dev --test-scheduled`, puis ouvre `http://localhost:8787/__scheduled?cron=2+16+*+*+*` (le code n'envoie qu'à 18h Paris ; commente temporairement le test d'heure dans `scheduled()` pour forcer l'envoi).

## Au quotidien

- **Ajouter un produit** : nouvelle ligne dans Produits (nom, description, allergènes, photo, prix) puis coche « Actif ». Décoche pour le retirer. « Ordre » règle l'ordre d'affichage.
- **Nouveau stage** : nouvelle ligne dans Stages (début et fin inclus).
- **Après livraison** : passe le statut de la commande à « Livrée ». Un remboursement se fait dans Stripe ; passe alors le statut à « Annulée » pour qu'elle sorte du récap.
- Une commande payée après 18:02 pour le lendemain (paiement commencé juste avant 18:00) déclenche un email « Commande tardive » immédiat.
