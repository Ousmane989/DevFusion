# DevFusion — Boutique sneakers premium

Plateforme e-commerce **statique** (HTML / CSS / JavaScript vanilla, **sans framework ni
grosse librairie d'animation**) construite autour d'un **système d'animations premium**
respectant intégralement le cahier des charges (apparitions, micro-interactions,
transitions de page, états de chargement, accessibilité).

> ⚙️ Aucune dépendance à installer. Ouvrez simplement `index.html` dans un navigateur,
> ou servez le dossier (`python3 -m http.server`) pour la navigation entre pages.

---

## 🗂️ Structure

```
DevFusion/
├── index.html            Accueil (hero, catégories, produits, avantages, newsletter)
├── boutique.html         Catalogue + filtres + skeleton loaders
├── collections.html      Collections / catégories
├── produit.html          Fiche produit (galerie, variantes, accordéon, similaires)
├── panier.html           Panier complet
├── checkout.html         Tunnel de commande en 4 étapes (stepper animé)
├── connexion.html        Connexion / Inscription (onglets, labels flottants)
├── compte.html           Espace client (dashboard, commandes)
├── dashboard.html        Dashboard propriétaire (KPIs, graphiques, tableau)
├── admin-produits.html   Gestion produits (table, modales, dropzone, suppression)
├── admin-commandes.html  Gestion commandes (statuts, détails dépliables)
├── admin-clients.html    Gestion clients (recherche, filtres, profils)
├── css/
│   ├── variables.css     Design tokens + tokens d'animation (durées, courbes)
│   ├── base.css          Reset, typographie, layout
│   ├── animations.css    ⭐ Cœur : keyframes, reveal, micro-interactions, reduced-motion
│   ├── components.css     Boutons, cartes, header, footer, modales, toasts, drawer…
│   ├── pages.css         Styles storefront (hero, produit, checkout, auth)
│   └── admin.css         Styles espace client + dashboard
└── js/
    ├── animations.js     IntersectionObserver (reveal), compteurs, transitions de page
    ├── ui.js             Header scroll, menu mobile, dropdowns, modales, toasts, thème
    └── cart.js           Interactions panier (ajout/suppression animés) — visuel uniquement
```

---

## ✨ Le système d'animation

Toutes les animations n'utilisent que **`transform` et `opacity`** (accélérées GPU) et
partagent les mêmes **tokens de timing/easing** (`css/variables.css`) pour une **cohérence
visuelle globale** sur toutes les pages.

| Besoin | Mise en œuvre |
|---|---|
| Apparition au chargement | classes `.anim-up / .anim-fade / .anim-zoom …` + délais `.d-1…d-8` |
| Apparition au défilement | classe `.reveal` (+ `.rv-left/.rv-right/.rv-zoom`) via **IntersectionObserver** |
| Décalage de liste (stagger) | conteneur `.stagger` → indexation automatique des enfants |
| Cartes produits | élévation, zoom image, ombre progressive, badges, ajout rapide |
| Boutons | hover, active, focus, **loading**, **ripple** (effet de pression) |
| Compteurs animés | `<span class="count" data-to="1284">` (dashboards) |
| Graphiques | barres CSS qui grandissent à l'entrée + donut `conic-gradient` |
| Modales / dropdowns / drawer | fade + scale + slide fluides (API `DFModal`, `DFDrawer`) |
| Notifications | `DFToast.success/error/warning/info(...)` |
| Skeletons & spinners | `.skeleton`, `.spinner`, `.btn.is-loading` |
| Transition entre pages | fade-out avant navigation interne |
| Header | compact au scroll, logo animé, soulignement des liens, menu mobile |
| Checkout | stepper à 4 étapes avec lignes de progression animées |

### API JavaScript disponible
```js
DFToast.success("Titre", "Message");     // notifications
DFModal.open("id"); DFModal.close("id"); // modales
DFDrawer.open("cart-drawer");            // panier latéral
DFReveal();                              // re-scanner après injection dynamique
```

---

## ♿ Accessibilité & performance

- **`prefers-reduced-motion`** entièrement respecté : les mouvements non essentiels sont
  neutralisés, le contenu reste 100 % visible et utilisable.
- Reveal & compteurs pilotés par **IntersectionObserver** (pas de listeners de scroll coûteux).
- `will-change` posé puis **retiré** après l'animation pour libérer la mémoire GPU.
- Animations **rapides et naturelles** (160–620 ms), aucune boucle de mouvement permanente
  hors éléments décoratifs discrets.
- Entièrement **responsive** (mobile → desktop) ; animations allégées sur petits écrans.

---

## 🎨 Thème

Basculez entre thème clair et sombre via l'icône ☀️ du header (préférence mémorisée).

---

Les images utilisent des placeholders `picsum.photos` (à remplacer par vos visuels).
