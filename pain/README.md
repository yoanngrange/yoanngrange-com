# Pain voisins — yoanngrange.com/pain

Page de présentation du pain pour les voisins de l'immeuble : liste des produits (lecture directe depuis Airtable) + numéro de téléphone pour appeler ou envoyer un SMS. Aucune commande en ligne, aucun serveur — page 100% statique, même pattern que caracteres-ameriques (token Airtable public en lecture seule, embarqué dans `pain.js`).

Le lien n'est pas public : aucune mention depuis la home, ni dans le sitemap, le robots.txt ou le llms.txt. La page a `noindex`.

## Architecture

```
index.html, pain.css, pain.js   → à la racine du repo GitHub Pages de yoanngrange.com (dossier /pain)
```

Airtable : base **Pain voisins** (espace « pain »), table Produits — lue directement depuis le navigateur via un token restreint au scope `data.records:read`, limité à cette base. Le token est visible dans le code source (comme sur caracteres-ameriques) : c'est acceptable puisqu'il ne peut que lire des données déjà publiques sur la page, jamais écrire.

Contact : liens natifs `tel:` et `sms:` vers le téléphone personnel — pas d'API, pas de secret à gérer.

## Au quotidien

- **Ajouter un produit** : nouvelle ligne dans Produits (nom, description, allergènes, photo, prix) puis coche « Actif ». Décoche pour le retirer. « Ordre » règle l'ordre d'affichage.
- **Une demande arrive** : directement par appel ou SMS sur le téléphone — rien à surveiller ailleurs.
