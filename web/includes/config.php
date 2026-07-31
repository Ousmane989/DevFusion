<?php
/**
 * Marsa — configuration multi-pays.
 *
 * Principe d'architecture : le PAYS est une dimension de configuration
 * (devise, langues, prestataires de paiement, zones, phase), JAMAIS une
 * valeur codée en dur ailleurs dans l'application. Ajouter un pays = ajouter
 * une entrée ici, sans toucher au reste du code.
 */

return [
    // Pays actif au lancement.
    'default_country' => 'MR',

    // Support / autorisation d'accès (pas de paiement en ligne pour l'instant :
    // l'accès après l'essai gratuit est autorisé manuellement via WhatsApp).
    // ⚠️ Numéro à remplacer par le vrai numéro WhatsApp de Marsa.
    'support_whatsapp' => '22200000000',
    'trial_days'       => 3,

    // Accès au back-office d'autorisation (page admin).
    // ⚠️ Mot de passe à changer avant toute mise en ligne.
    'admin_password'   => 'marsa-admin',

    // Offres (abonnement mensuel). Prix en MRU (marché de lancement).
    // 'max_produits' = -1 signifie illimité. IA incluse à partir de 600 MRU.
    'plans' => [
        'basique'  => ['name' => 'Basique',  'price' => 600,  'max_produits' => 20],
        'standard' => ['name' => 'Standard', 'price' => 1000, 'max_produits' => 100],
        'premium'  => ['name' => 'Premium',  'price' => 1500, 'max_produits' => -1],
    ],
    'ai_min_price' => 600,
    'trial_days'   => 3,

    // Thèmes de boutique disponibles (personnalisation vendeur).
    'themes' => [
        'souk'  => ['name' => 'Souk',  'accent' => '#C8912A', 'hero' => '#0E2A27'],
        'ocean' => ['name' => 'Océan', 'accent' => '#2E7263', 'hero' => '#0C2A28'],
        'rubis' => ['name' => 'Rubis', 'accent' => '#B5502F', 'hero' => '#2A120C'],
        'nuit'  => ['name' => 'Nuit',  'accent' => '#E0A94A', 'hero' => '#111317'],
    ],

    'countries' => [

        // --- Phase 1 : Mauritanie -------------------------------------------
        'MR' => [
            'name'             => ['fr' => 'Mauritanie', 'ar' => 'موريتانيا'],
            'currency'         => 'MRU',
            'currency_symbol'  => 'UM',
            'default_lang'     => 'fr',
            'langs'            => ['fr', 'ar'],          // arabe = RTL
            'dir'              => ['fr' => 'ltr', 'ar' => 'rtl'],
            // Interface abstraite PaymentProvider : COD en citoyen de 1re classe.
            'payment_providers' => ['cod', 'bankily', 'masrvi', 'sedad', 'click'],
            'cities'           => ['Nouakchott', 'Nouadhibou'],
            'phase'            => 1,
            'active'           => true,
        ],

        // --- Phase 2 : Sénégal (déclaré, non activé) ------------------------
        'SN' => [
            'name'             => ['fr' => 'Sénégal', 'ar' => 'السنغال'],
            'currency'         => 'XOF',
            'currency_symbol'  => 'FCFA',
            'default_lang'     => 'fr',
            'langs'            => ['fr', 'ar', 'wo'],    // wolof en phase 2
            'dir'              => ['fr' => 'ltr', 'ar' => 'rtl', 'wo' => 'ltr'],
            'payment_providers' => ['cod', 'wave', 'orange_money', 'free_money', 'wizall'],
            'cities'           => ['Dakar', 'Thiès', 'Saint-Louis', 'Touba'],
            'phase'            => 2,
            'active'           => false,
        ],
    ],
];
