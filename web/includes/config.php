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
