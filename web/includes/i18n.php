<?php
/**
 * Marsa — internationalisation FR / AR.
 * Rendu initial côté serveur ; data-fr / data-ar permettent la bascule
 * de langue (et de direction RTL) côté client sans rechargement.
 */

$STRINGS = [
    // -- Navigation
    'nav_features' => ['fr' => 'Fonctionnalités', 'ar' => 'المميزات'],
    'nav_themes'   => ['fr' => 'Thèmes', 'ar' => 'القوالب'],
    'nav_market'   => ['fr' => 'Marketplace', 'ar' => 'السوق'],
    'nav_pricing'  => ['fr' => 'Tarifs', 'ar' => 'الأسعار'],
    'nav_cta'      => ['fr' => 'Créer ma boutique', 'ar' => 'أنشئ متجري'],

    // -- Hero
    'badge'      => ['fr' => 'Créez · Personnalisez · Vendez', 'ar' => 'أنشئ · خصّص · بِع'],
    'hero_h1'    => ['fr' => 'Créez votre boutique en ligne. <span class="accent">Vendez partout.</span>', 'ar' => 'أنشئ متجرك الإلكتروني. <span class="accent">وبِع في كل مكان.</span>'],
    'hero_lead'  => ['fr' => 'Marsa vous donne tout pour lancer votre commerce : une boutique à votre image, vos produits en ligne en quelques minutes, et une marketplace qui vous amène des clients.', 'ar' => 'يمنحك مرسى كل ما تحتاجه لإطلاق تجارتك: متجر يعبّر عنك، ومنتجاتك على الإنترنت في دقائق، وسوق يجلب لك الزبائن.'],
    'cta_create' => ['fr' => 'Créer ma boutique — 3 jours gratuits', 'ar' => 'أنشئ متجري — 3 أيام مجانًا'],
    'cta_explore'=> ['fr' => 'Explorer la marketplace', 'ar' => 'استكشف السوق'],
    'sub1' => ['fr' => 'Sans compétence technique', 'ar' => 'دون خبرة تقنية'],
    'sub2' => ['fr' => 'Depuis votre téléphone', 'ar' => 'من هاتفك'],
    'sub3' => ['fr' => 'Français &amp; arabe', 'ar' => 'الفرنسية والعربية'],
    'mock_shop' => ['fr' => 'Boutique Salma', 'ar' => 'متجر سلمى'],
    'mock_tag'  => ['fr' => 'Mode &amp; accessoires', 'ar' => 'أزياء وإكسسوارات'],

    // -- Steps
    'steps_eyebrow' => ['fr' => 'Simple, du début à la fin', 'ar' => 'بسيط من البداية إلى النهاية'],
    'steps_h2'      => ['fr' => 'Votre boutique en 4 étapes', 'ar' => 'متجرك في 4 خطوات'],
    'steps_p'       => ['fr' => 'Pas besoin de développeur. Vous créez, vous personnalisez, vous vendez.', 'ar' => 'لا حاجة لمبرمج. تنشئ، تخصّص، وتبيع.'],
    's1_h' => ['fr' => 'Créez votre compte', 'ar' => 'أنشئ حسابك'],
    's1_p' => ['fr' => 'Avec un numéro de téléphone. Gratuit, en une minute.', 'ar' => 'برقم هاتف. مجانًا، في دقيقة.'],
    's2_h' => ['fr' => 'Choisissez votre thème', 'ar' => 'اختر قالبك'],
    's2_p' => ['fr' => 'Couleurs, logo, nom, mise en page — votre boutique vous ressemble.', 'ar' => 'ألوان، شعار، اسم، تصميم — متجر يشبهك.'],
    's3_h' => ['fr' => 'Ajoutez vos produits', 'ar' => 'أضف منتجاتك'],
    's3_p' => ['fr' => 'Photos, variantes, prix, stock. En français ou en arabe.', 'ar' => 'صور، خيارات، أسعار، مخزون. بالفرنسية أو العربية.'],
    's4_h' => ['fr' => 'Lancez votre boutique', 'ar' => 'أطلق متجرك'],
    's4_p' => ['fr' => 'Votre adresse nom.marsa, et vos produits dans la marketplace commune.', 'ar' => 'عنوانك nom.marsa، ومنتجاتك في السوق المشترك.'],

    // -- Features
    'feat_eyebrow' => ['fr' => 'Tout est inclus', 'ar' => 'كل شيء متوفّر'],
    'feat_h2'      => ['fr' => 'Une plateforme complète pour vendre', 'ar' => 'منصة متكاملة للبيع'],
    'feat_p'       => ['fr' => 'De la vitrine au paiement, Marsa gère tout le parcours.', 'ar' => 'من الواجهة إلى الدفع، مرسى يدير كل الرحلة.'],
    'f1_h' => ['fr' => 'Boutique personnalisable', 'ar' => 'متجر قابل للتخصيص'],
    'f1_p' => ['fr' => 'Des thèmes prêts à l’emploi, vos couleurs, votre logo, votre sous-domaine.', 'ar' => 'قوالب جاهزة، ألوانك، شعارك، نطاقك الفرعي.'],
    'f2_h' => ['fr' => 'Gestion des produits', 'ar' => 'إدارة المنتجات'],
    'f2_p' => ['fr' => 'Variantes, stock, photos optimisées, catégories — en quelques clics.', 'ar' => 'خيارات، مخزون، صور محسّنة، فئات — بنقرات قليلة.'],
    'f3_h' => ['fr' => 'Marketplace intégrée', 'ar' => 'سوق مدمج'],
    'f3_p' => ['fr' => 'Vos produits sont aussi visibles dans le marché commun. Plus de clients.', 'ar' => 'منتجاتك ظاهرة أيضًا في السوق المشترك. زبائن أكثر.'],
    'f4_h' => ['fr' => 'Recherche de produits', 'ar' => 'بحث عن المنتجات'],
    'f4_p' => ['fr' => 'Rapide, tolérante aux fautes, et en arabe comme en français.', 'ar' => 'سريع، يتحمّل الأخطاء، بالعربية والفرنسية.'],
    'f5_h' => ['fr' => 'Paiements adaptés', 'ar' => 'وسائل دفع ملائمة'],
    'f5_p' => ['fr' => 'Paiement à la livraison et portefeuilles mobiles, gérés pour vous.', 'ar' => 'الدفع عند الاستلام والمحافظ الإلكترونية، مُدارة لك.'],
    'f6_h' => ['fr' => 'Tableau de bord &amp; commandes', 'ar' => 'لوحة تحكم وطلبات'],
    'f6_p' => ['fr' => 'Ventes, commandes, produits populaires, solde à percevoir — en un coup d’œil.', 'ar' => 'المبيعات، الطلبات، الأكثر رواجًا، الرصيد المستحق — بنظرة واحدة.'],

    // -- Themes
    'themes_eyebrow' => ['fr' => 'Personnalisation facile', 'ar' => 'تخصيص سهل'],
    'themes_h2'      => ['fr' => 'Un thème pour chaque commerce', 'ar' => 'قالب لكل تجارة'],
    'themes_p'       => ['fr' => 'Choisissez un modèle et adaptez-le. Vous changez de thème quand vous voulez, sans perdre vos produits.', 'ar' => 'اختر نموذجًا وعدّله. غيّر القالب متى شئت دون فقدان منتجاتك.'],
    'th1_n' => ['fr' => 'Souk', 'ar' => 'سوق'],           'th1_t' => ['fr' => 'Chaleureux, artisanat', 'ar' => 'دافئ، حرف يدوية'],
    'th2_n' => ['fr' => 'Port', 'ar' => 'مرسى'],           'th2_t' => ['fr' => 'Élégant, électronique', 'ar' => 'أنيق، إلكترونيات'],
    'th3_n' => ['fr' => 'Atelier', 'ar' => 'ورشة'],        'th3_t' => ['fr' => 'Créatif, mode', 'ar' => 'إبداعي، أزياء'],
    'th4_n' => ['fr' => 'Oasis', 'ar' => 'واحة'],          'th4_t' => ['fr' => 'Frais, épicerie', 'ar' => 'منعش، بقالة'],
    'th_customize' => ['fr' => 'Personnaliser', 'ar' => 'تخصيص'],

    // -- Marketplace
    'mk_eyebrow' => ['fr' => 'La marketplace Marsa', 'ar' => 'سوق مرسى'],
    'mk_h2'      => ['fr' => 'Un seul endroit pour tout trouver', 'ar' => 'مكان واحد لإيجاد كل شيء'],
    'mk_p'       => ['fr' => 'Les acheteurs cherchent parmi toutes les boutiques à la fois. Vos produits gagnent en visibilité, sans effort.', 'ar' => 'يبحث المشترون في كل المتاجر دفعة واحدة. تكتسب منتجاتك ظهورًا دون جهد.'],
    'mk_search'  => ['fr' => 'Rechercher', 'ar' => 'ابحث'],
    'pr1_n' => ['fr' => 'Sandales cuir', 'ar' => 'صندل جلد'],       'pr1_s' => ['fr' => 'Atelier Aïcha', 'ar' => 'ورشة عائشة'],
    'pr2_n' => ['fr' => 'Écouteurs sans fil', 'ar' => 'سماعات لاسلكية'], 'pr2_s' => ['fr' => 'TechPoint', 'ar' => 'تِك بوينت'],
    'pr3_n' => ['fr' => 'Tissu wax (6 m)', 'ar' => 'قماش واكس (6 م)'], 'pr3_s' => ['fr' => 'Maison Fatimetou', 'ar' => 'دار فاطمتو'],
    'pr4_n' => ['fr' => 'Parfum boisé', 'ar' => 'عطر خشبي'],        'pr4_s' => ['fr' => 'Nour Cosmetics', 'ar' => 'نور للتجميل'],
    'pr5_n' => ['fr' => 'Théière décorée', 'ar' => 'إبريق شاي مزخرف'], 'pr5_s' => ['fr' => 'Artisan Ely', 'ar' => 'الحرفي إيلي'],
    'pr6_n' => ['fr' => 'Robe brodée', 'ar' => 'فستان مطرّز'],      'pr6_s' => ['fr' => 'Boutique Salma', 'ar' => 'متجر سلمى'],
    'cod_label' => ['fr' => 'Paiement à la livraison', 'ar' => 'الدفع عند الاستلام'],

    // -- Pricing
    'pr_eyebrow' => ['fr' => 'Des formules simples', 'ar' => 'باقات بسيطة'],
    'pr_h2'      => ['fr' => 'Commencez gratuitement, grandissez ensuite', 'ar' => 'ابدأ مجانًا، ثم توسّع'],
    'pr_p'       => ['fr' => 'Aucun engagement. Vous ne payez que quand vous vendez.', 'ar' => 'دون التزام. لا تدفع إلا عندما تبيع.'],
    'price_unit'  => ['fr' => 'MRU / mois', 'ar' => 'أوقية / شهريًا'],
    'trial_badge' => ['fr' => '3 jours d’essai gratuit', 'ar' => '3 أيام تجربة مجانية'],
    'pl1_n' => ['fr' => 'Découverte', 'ar' => 'انطلاق'],
    'pl1_price' => ['fr' => '600', 'ar' => '600'],
    'pl1_sub'   => ['fr' => 'pour bien démarrer', 'ar' => 'لبداية جيدة'],
    'pl1_f1' => ['fr' => 'Boutique + sous-domaine', 'ar' => 'متجر + نطاق فرعي'],
    'pl1_f2' => ['fr' => 'Produits illimités', 'ar' => 'منتجات غير محدودة'],
    'pl1_f3' => ['fr' => 'Présence dans la marketplace', 'ar' => 'حضور في السوق'],
    'pl2_n' => ['fr' => 'Pro', 'ar' => 'برو'],
    'pl2_price' => ['fr' => '1000', 'ar' => '1000'],
    'pl2_sub'   => ['fr' => 'pour vendre plus', 'ar' => 'لبيع أكثر'],
    'pl2_f1' => ['fr' => 'Tout de Découverte', 'ar' => 'كل ما في انطلاق'],
    'pl2_f2' => ['fr' => 'Thèmes premium &amp; domaine', 'ar' => 'قوالب مميّزة ونطاق'],
    'pl2_f3' => ['fr' => 'Mise en avant dans la recherche', 'ar' => 'إبراز في نتائج البحث'],
    'pl3_n' => ['fr' => 'Business', 'ar' => 'أعمال'],
    'pl3_price' => ['fr' => '1500', 'ar' => '1500'],
    'pl3_sub'   => ['fr' => 'pour les gros volumes', 'ar' => 'للأحجام الكبيرة'],
    'pl3_f1' => ['fr' => 'Tout de Pro', 'ar' => 'كل ما في برو'],
    'pl3_f2' => ['fr' => 'Plusieurs utilisateurs', 'ar' => 'عدة مستخدمين'],
    'pl3_f3' => ['fr' => 'Support prioritaire', 'ar' => 'دعم ذو أولوية'],
    'pl_cta' => ['fr' => 'Commencer l’essai gratuit', 'ar' => 'ابدأ التجربة المجانية'],
    'pl_featured' => ['fr' => 'Le plus choisi', 'ar' => 'الأكثر اختيارًا'],
    'pr_note' => ['fr' => 'Le paiement en ligne n’est pas encore disponible. À l’ouverture, votre accès est automatique pendant 3 jours ; ensuite, un conseiller Marsa vous autorise sur WhatsApp.', 'ar' => 'الدفع عبر الإنترنت غير متاح بعد. عند الافتتاح، يكون وصولك تلقائيًا لمدة 3 أيام؛ بعدها، يمنحك مستشار مرسى الإذن عبر واتساب.'],

    // -- Page Accès
    'ac_back'    => ['fr' => 'Retour au site', 'ar' => 'العودة إلى الموقع'],
    'ac_eyebrow' => ['fr' => 'Espace vendeur', 'ar' => 'فضاء البائع'],
    'ac_h1'      => ['fr' => 'Accédez à votre boutique', 'ar' => 'ادخل إلى متجرك'],
    'ac_p'       => ['fr' => 'Entrez le numéro de téléphone de votre compte Marsa pour continuer.', 'ar' => 'أدخل رقم هاتف حسابك في مرسى للمتابعة.'],
    'ac_ph'      => ['fr' => 'Votre numéro de téléphone', 'ar' => 'رقم هاتفك'],
    'ac_continue'=> ['fr' => 'Continuer', 'ar' => 'متابعة'],
    'ac_trial_t' => ['fr' => 'Essai gratuit de 3 jours', 'ar' => 'تجربة مجانية لمدة 3 أيام'],
    'ac_trial_p' => ['fr' => 'À l’ouverture de Marsa, votre accès est activé automatiquement pendant 3 jours, sans paiement.', 'ar' => 'عند افتتاح مرسى، يُفعَّل وصولك تلقائيًا لمدة 3 أيام دون دفع.'],
    'ac_after_t' => ['fr' => 'Après les 3 jours', 'ar' => 'بعد الأيام الثلاثة'],
    'ac_after_p' => ['fr' => 'Le paiement en ligne n’étant pas encore disponible, l’accès est prolongé après autorisation d’un conseiller Marsa sur WhatsApp.', 'ar' => 'بما أن الدفع عبر الإنترنت غير متاح بعد، يتم تمديد الوصول بعد إذن من مستشار مرسى عبر واتساب.'],
    'ac_wa_btn'  => ['fr' => 'Demander l’autorisation sur WhatsApp', 'ar' => 'اطلب الإذن عبر واتساب'],
    'ac_wa_msg'  => ['fr' => 'Bonjour Marsa, je souhaite prolonger l’accès à ma boutique après l’essai gratuit.', 'ar' => 'مرحبًا مرسى، أرغب في تمديد الوصول إلى متجري بعد التجربة المجانية.'],
    'ac_hint_ok' => ['fr' => 'Merci. À l’ouverture, cet accès sera relié à votre boutique. Pour prolonger après l’essai, utilisez le bouton WhatsApp.', 'ar' => 'شكرًا. عند الافتتاح، سيُربط هذا الوصول بمتجرك. للتمديد بعد التجربة، استخدم زر واتساب.'],
    'ac_hint_err'=> ['fr' => 'Numéro invalide. Vérifiez et réessayez.', 'ar' => 'رقم غير صالح. تحقق وأعد المحاولة.'],
    'ac_no_acc'  => ['fr' => 'Pas encore de compte ?', 'ar' => 'ليس لديك حساب بعد؟'],
    'ac_create'  => ['fr' => 'Créer ma boutique', 'ar' => 'أنشئ متجري'],
    'nav_access' => ['fr' => 'Accès', 'ar' => 'الدخول'],

    // -- Availability
    'av_eyebrow' => ['fr' => 'Où utiliser Marsa', 'ar' => 'أين تستخدم مرسى'],
    'av_h2'      => ['fr' => 'Disponible dans ces marchés', 'ar' => 'متوفّر في هذه الأسواق'],
    'av_soon'    => ['fr' => 'D’autres pays d’Afrique de l’Ouest suivront.', 'ar' => 'ستتبعها دول أخرى في غرب إفريقيا.'],

    // -- CTA final / waitlist
    'cf_h2'  => ['fr' => 'Prêt à ouvrir votre boutique ?', 'ar' => 'مستعد لفتح متجرك؟'],
    'cf_p'   => ['fr' => 'Laissez votre numéro : on vous écrit sur WhatsApp dès l’ouverture, et vous serez parmi les premières boutiques de Marsa.', 'ar' => 'اترك رقمك: نراسلك عبر واتساب فور الافتتاح، وستكون من أوائل المتاجر في مرسى.'],
    'wl_ph'  => ['fr' => 'Votre numéro de téléphone', 'ar' => 'رقم هاتفك'],
    'wl_btn' => ['fr' => 'Rejoindre la liste', 'ar' => 'انضم إلى القائمة'],
    'wl_ok'  => ['fr' => 'Merci ! On vous contacte au lancement.', 'ar' => 'شكرًا! سنتواصل معك عند الإطلاق.'],
    'wl_err' => ['fr' => 'Numéro invalide. Vérifiez et réessayez.', 'ar' => 'رقم غير صالح. تحقق وأعد المحاولة.'],

    // -- Page Inscription (création de boutique)
    'in_back'    => ['fr' => 'Retour', 'ar' => 'رجوع'],
    'in_eyebrow' => ['fr' => 'Créer votre boutique', 'ar' => 'أنشئ متجرك'],
    'in_h1'      => ['fr' => 'Ouvrez votre boutique en 1 minute', 'ar' => 'افتح متجرك في دقيقة واحدة'],
    'in_p'       => ['fr' => 'Commencez votre essai gratuit de 3 jours. Aucun paiement demandé pour l’instant.', 'ar' => 'ابدأ تجربتك المجانية لمدة 3 أيام. لا حاجة لأي دفع الآن.'],
    'in_shop_l'  => ['fr' => 'Nom de la boutique', 'ar' => 'اسم المتجر'],
    'in_shop_ph' => ['fr' => 'Ex. Boutique Salma', 'ar' => 'مثال: متجر سلمى'],
    'in_owner_l' => ['fr' => 'Votre nom', 'ar' => 'اسمك'],
    'in_owner_ph'=> ['fr' => 'Ex. Salma Mint Ahmed', 'ar' => 'مثال: سلمى بنت أحمد'],
    'in_phone_l' => ['fr' => 'Numéro de téléphone', 'ar' => 'رقم الهاتف'],
    'in_phone_ph'=> ['fr' => 'Ex. 22 00 00 00', 'ar' => 'مثال: 22 00 00 00'],
    'in_email_l' => ['fr' => 'E-mail (pour les notifications)', 'ar' => 'البريد الإلكتروني (للإشعارات)'],
    'in_email_ph'=> ['fr' => 'vous@exemple.com', 'ar' => 'you@example.com'],
    'in_pass_l'  => ['fr' => 'Mot de passe', 'ar' => 'كلمة المرور'],
    'in_pass_ph' => ['fr' => 'Au moins 6 caractères', 'ar' => '6 أحرف على الأقل'],

    // -- Page Connexion
    'lo_eyebrow' => ['fr' => 'Espace vendeur', 'ar' => 'فضاء البائع'],
    'lo_h1'      => ['fr' => 'Connexion à votre boutique', 'ar' => 'تسجيل الدخول إلى متجرك'],
    'lo_p'       => ['fr' => 'Entrez votre e-mail ou téléphone et votre mot de passe.', 'ar' => 'أدخل بريدك أو هاتفك وكلمة المرور.'],
    'lo_id_l'    => ['fr' => 'E-mail ou téléphone', 'ar' => 'البريد أو الهاتف'],
    'lo_pass_l'  => ['fr' => 'Mot de passe', 'ar' => 'كلمة المرور'],
    'lo_submit'  => ['fr' => 'Se connecter', 'ar' => 'تسجيل الدخول'],
    'lo_err'     => ['fr' => 'Identifiants incorrects.', 'ar' => 'بيانات الدخول غير صحيحة.'],
    'lo_no'      => ['fr' => 'Pas encore de boutique ?', 'ar' => 'ليس لديك متجر بعد؟'],
    'lo_create'  => ['fr' => 'Créer ma boutique', 'ar' => 'أنشئ متجري'],
    'nav_login'  => ['fr' => 'Connexion', 'ar' => 'دخول'],
    'in_cat_l'   => ['fr' => 'Catégorie principale', 'ar' => 'الفئة الرئيسية'],
    'in_city_l'  => ['fr' => 'Ville', 'ar' => 'المدينة'],
    'in_sub_url' => ['fr' => 'Adresse de votre boutique', 'ar' => 'عنوان متجرك'],
    'in_submit'  => ['fr' => 'Créer ma boutique — 3 jours gratuits', 'ar' => 'أنشئ متجري — 3 أيام مجانًا'],
    'in_have'    => ['fr' => 'Vous avez déjà une boutique ?', 'ar' => 'لديك متجر بالفعل؟'],
    'in_login'   => ['fr' => 'Accéder', 'ar' => 'الدخول'],
    'in_ok_t'    => ['fr' => 'Boutique créée 🎉', 'ar' => 'تم إنشاء المتجر 🎉'],
    'in_ok_p'    => ['fr' => 'Votre essai gratuit de 3 jours démarre à l’ouverture de Marsa. Nous vous contacterons sur WhatsApp.', 'ar' => 'تبدأ تجربتك المجانية لمدة 3 أيام عند افتتاح مرسى. سنتواصل معك عبر واتساب.'],
    'in_ok_go'   => ['fr' => 'Aller à mon accès', 'ar' => 'الذهاب إلى وصولي'],
    'in_err'     => ['fr' => 'Vérifiez les champs et réessayez.', 'ar' => 'تحقق من الحقول وأعد المحاولة.'],
    'in_dup'     => ['fr' => 'Ce numéro a déjà une boutique. Utilisez la page d’accès.', 'ar' => 'هذا الرقم لديه متجر بالفعل. استخدم صفحة الدخول.'],

    // -- Footer
    'footer_tag' => ['fr' => '© 2026 Marsa — Créez votre boutique, vendez en ligne', 'ar' => '© 2026 مرسى — أنشئ متجرك وبِع عبر الإنترنت'],
    'disclaimer' => ['fr' => 'Page de pré-lancement — la création de boutique n’est pas encore ouverte. Les produits affichés sont des exemples.', 'ar' => 'صفحة ما قبل الإطلاق — إنشاء المتاجر لم يُفتح بعد. المنتجات المعروضة أمثلة توضيحية.'],
];

/** Attributs data-fr / data-ar (échappés) pour la bascule JS. */
function attrs(string $key): string
{
    global $STRINGS;
    if (!isset($STRINGS[$key])) { return ''; }
    $fr = htmlspecialchars($STRINGS[$key]['fr'], ENT_QUOTES, 'UTF-8');
    $ar = htmlspecialchars($STRINGS[$key]['ar'], ENT_QUOTES, 'UTF-8');
    return 'data-fr="' . $fr . '" data-ar="' . $ar . '"';
}

/** Chaîne dans la langue demandée (HTML autorisé), FR par défaut. */
function t(string $key, string $lang): string
{
    global $STRINGS;
    return $STRINGS[$key][$lang] ?? ($STRINGS[$key]['fr'] ?? '');
}
