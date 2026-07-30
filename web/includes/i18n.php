<?php
/**
 * Marsa — internationalisation FR / AR.
 *
 * Toutes les chaînes de la page vivent ici, avec leur variante française et
 * arabe. Le rendu initial est fait côté serveur dans la langue demandée ;
 * les attributs data-fr / data-ar permettent ensuite au JS de basculer la
 * langue (et la direction RTL) sans recharger la page.
 */

$STRINGS = [
    'badge'        => ['fr' => 'Bientôt en ligne · Nouakchott &amp; Nouadhibou', 'ar' => 'قريبًا · نواكشوط ونواذيبو'],
    'hero_eyebrow' => ['fr' => 'Place de marché · Mauritanie', 'ar' => 'سوق إلكتروني · موريتانيا'],
    'hero_h1'      => ['fr' => 'Le port où l’Afrique de l’Ouest <span class="accent">fait son marché</span>.', 'ar' => 'المرسى حيث يتسوّق <span class="accent">غرب إفريقيا</span>.'],
    'hero_lead'    => ['fr' => 'Ouvrez votre boutique en ligne ou achetez en toute confiance — paiement à la livraison, vendeurs vérifiés, et contact WhatsApp direct.', 'ar' => 'افتح متجرك الإلكتروني أو تسوّق بثقة — الدفع عند الاستلام، بائعون موثّقون، وتواصل مباشر عبر واتساب.'],
    'cta_shop'     => ['fr' => 'Ouvrir ma boutique', 'ar' => 'افتح متجري'],
    'cta_market'   => ['fr' => 'Découvrir la marketplace', 'ar' => 'اكتشف السوق'],
    'meta1'        => ['fr' => '🗣️ <b>Arabe &amp; Français</b> — interface bidirectionnelle', 'ar' => '🗣️ <b>العربية والفرنسية</b> — واجهة ثنائية الاتجاه'],
    'meta2'        => ['fr' => '💵 <b>Paiement à la livraison</b> en MRU', 'ar' => '💵 <b>الدفع عند الاستلام</b> بالأوقية'],
    'meta3'        => ['fr' => '📱 <b>Depuis votre téléphone</b>, sans email', 'ar' => '📱 <b>من هاتفك</b>، دون بريد إلكتروني'],

    'trust_eyebrow' => ['fr' => 'Acheter sans crainte', 'ar' => 'تسوّق دون قلق'],
    'trust_h2'      => ['fr' => 'La confiance, intégrée à chaque commande', 'ar' => 'الثقة في صميم كل طلب'],
    'trust_p'       => ['fr' => 'Le premier frein à l’achat en ligne, c’est la méfiance. Marsa la lève par la conception, pas par des promesses.', 'ar' => 'أكبر عائق أمام الشراء عبر الإنترنت هو انعدام الثقة. مرسى يعالجه بالتصميم، لا بالوعود.'],
    'p1_h' => ['fr' => 'Paiement à la livraison', 'ar' => 'الدفع عند الاستلام'],
    'p1_p' => ['fr' => 'Payez en espèces au moment où vous recevez votre commande. Rien d’avancé.', 'ar' => 'ادفع نقدًا عند استلام طلبك. لا شيء مسبقًا.'],
    'p2_h' => ['fr' => 'Fonds sécurisés', 'ar' => 'أموالٌ محمية'],
    'p2_p' => ['fr' => 'Le vendeur n’est payé qu’après confirmation de réception. Votre argent est protégé.', 'ar' => 'لا يُدفع للبائع إلا بعد تأكيد الاستلام. أموالك في أمان.'],
    'p3_h' => ['fr' => 'Vendeurs vérifiés', 'ar' => 'بائعون موثّقون'],
    'p3_p' => ['fr' => 'Identité (et registre de commerce) contrôlés avant toute mise en ligne d’une boutique.', 'ar' => 'يتم التحقق من الهوية (والسجل التجاري) قبل نشر أي متجر.'],
    'p4_h' => ['fr' => 'WhatsApp direct', 'ar' => 'واتساب مباشر'],
    'p4_p' => ['fr' => 'Une question ? Parlez au vendeur avant d’acheter, comme au marché.', 'ar' => 'لديك سؤال؟ تحدّث مع البائع قبل الشراء، تمامًا كما في السوق.'],

    'how_eyebrow' => ['fr' => 'Comment ça marche', 'ar' => 'كيف يعمل'],
    'how_h2'      => ['fr' => 'Deux façons d’utiliser Marsa', 'ar' => 'طريقتان لاستخدام مرسى'],
    'how_p'       => ['fr' => 'Chaque boutique a sa vitrine. Toutes sont réunies dans un seul marché où l’on cherche tous les produits à la fois.', 'ar' => 'لكل متجر واجهته الخاصة، وكلها مجتمعة في سوق واحد يمكنك البحث فيه عن كل المنتجات دفعة واحدة.'],
    'buy_lbl'  => ['fr' => 'Vous achetez', 'ar' => 'أنت تشتري'],
    'buy1_b' => ['fr' => 'Cherchez, même en arabe', 'ar' => 'ابحث، حتى بالعربية'],
    'buy1_s' => ['fr' => 'Recherche tolérante aux fautes de frappe.', 'ar' => 'بحث يتحمّل الأخطاء الإملائية.'],
    'buy2_b' => ['fr' => 'Commandez avec votre numéro', 'ar' => 'اطلب برقم هاتفك'],
    'buy2_s' => ['fr' => 'Trois étapes, sans email obligatoire.', 'ar' => 'ثلاث خطوات، دون بريد إلكتروني إلزامي.'],
    'buy3_b' => ['fr' => 'Recevez et payez à la livraison', 'ar' => 'استلم وادفع عند التسليم'],
    'buy3_s' => ['fr' => 'Suivi par SMS et WhatsApp.', 'ar' => 'تتبّع عبر الرسائل القصيرة وواتساب.'],
    'sell_lbl' => ['fr' => 'Vous vendez', 'ar' => 'أنت تبيع'],
    'sell1_b' => ['fr' => 'Inscrivez-vous depuis votre téléphone', 'ar' => 'سجّل من هاتفك'],
    'sell1_s' => ['fr' => 'Vérification d’identité en photo.', 'ar' => 'التحقق من الهوية بصورة.'],
    'sell2_b' => ['fr' => 'Ajoutez vos produits en MRU', 'ar' => 'أضف منتجاتك بالأوقية'],
    'sell2_s' => ['fr' => 'Photos, variantes, stock — c’est votre boutique.', 'ar' => 'صور، خيارات، مخزون — هذا متجرك.'],
    'sell3_b' => ['fr' => 'Recevez commandes et paiements', 'ar' => 'استلم الطلبات والمدفوعات'],
    'sell3_s' => ['fr' => 'Bon de livraison, tableau de bord, solde à percevoir.', 'ar' => 'وصل تسليم، لوحة تحكم، رصيد مستحق.'],

    'cat_eyebrow' => ['fr' => 'Un seul marché', 'ar' => 'سوق واحد'],
    'cat_h2'      => ['fr' => 'Tout ce qui s’achète à Nouakchott', 'ar' => 'كل ما يُشترى في نواكشوط'],
    'cat_elec'  => ['fr' => 'Électronique', 'ar' => 'إلكترونيات'],
    'cat_mode'  => ['fr' => 'Mode &amp; tissus', 'ar' => 'أزياء وأقمشة'],
    'cat_food'  => ['fr' => 'Alimentaire', 'ar' => 'مواد غذائية'],
    'cat_craft' => ['fr' => 'Artisanat', 'ar' => 'حرف يدوية'],
    'cat_home'  => ['fr' => 'Maison', 'ar' => 'المنزل'],
    'cat_beauty'=> ['fr' => 'Beauté', 'ar' => 'الجمال'],
    'cat_auto'  => ['fr' => 'Pièces auto', 'ar' => 'قطع غيار'],
    'cat_books' => ['fr' => 'Livres', 'ar' => 'كتب'],

    'seller_h2'  => ['fr' => 'Vendez à tout Nouakchott, depuis votre téléphone', 'ar' => 'بِع لكل نواكشوط، من هاتفك'],
    'seller_p'   => ['fr' => 'Créez votre boutique en quelques minutes : nom, logo, sous-domaine boutique.marsa. Vos produits apparaissent aussi dans le marché commun.', 'ar' => 'أنشئ متجرك في دقائق: اسم، شعار، نطاق فرعي boutique.marsa. تظهر منتجاتك أيضًا في السوق المشترك.'],
    'seller_cta' => ['fr' => 'Devenir vendeur', 'ar' => 'كن بائعًا'],

    'wl_h2'   => ['fr' => 'Soyez prévenu du lancement', 'ar' => 'كن أول من يعلم بالإطلاق'],
    'wl_p'    => ['fr' => 'Laissez votre numéro de téléphone. On vous écrit sur WhatsApp dès l’ouverture de Marsa.', 'ar' => 'اترك رقم هاتفك. سنراسلك عبر واتساب فور افتتاح مرسى.'],
    'wl_ph'   => ['fr' => 'Votre numéro (ex. 22 00 00 00)', 'ar' => 'رقمك (مثال: 22 00 00 00)'],
    'wl_btn'  => ['fr' => 'Me prévenir', 'ar' => 'أعلِمني'],
    'wl_ok'   => ['fr' => 'Merci ! Vous serez prévenu au lancement.', 'ar' => 'شكرًا! سيتم إعلامك عند الإطلاق.'],
    'wl_err'  => ['fr' => 'Numéro invalide. Vérifiez et réessayez.', 'ar' => 'رقم غير صالح. تحقق وأعد المحاولة.'],

    'zones_eyebrow' => ['fr' => 'Zones de lancement', 'ar' => 'مناطق الإطلاق'],
    'zones_h2'      => ['fr' => 'On démarre en Mauritanie. Le Sénégal suit.', 'ar' => 'نبدأ من موريتانيا، والسنغال يليها.'],
    'city_nkc_s' => ['fr' => 'Livraison par moughataa', 'ar' => 'توصيل حسب المقاطعة'],
    'city_ndb_s' => ['fr' => 'Phase 1', 'ar' => 'المرحلة ١'],
    'soon'       => ['fr' => 'Phase 2 · à venir', 'ar' => 'المرحلة ٢ · قريبًا'],

    'footer_tag' => ['fr' => '© 2026 Marsa — Place de marché d’Afrique de l’Ouest', 'ar' => '© 2026 مرسى — سوق غرب إفريقيا'],
    'disclaimer' => ['fr' => 'Page de pré-lancement — le service n’est pas encore ouvert. Aucune commande ne peut être passée pour le moment.', 'ar' => 'صفحة ما قبل الإطلاق — الخدمة لم تُفتح بعد. لا يمكن تقديم أي طلب حاليًا.'],
];

/** Renvoie les attributs data-fr / data-ar (échappés) pour la bascule JS. */
function attrs(string $key): string
{
    global $STRINGS;
    if (!isset($STRINGS[$key])) {
        return '';
    }
    $fr = htmlspecialchars($STRINGS[$key]['fr'], ENT_QUOTES, 'UTF-8');
    $ar = htmlspecialchars($STRINGS[$key]['ar'], ENT_QUOTES, 'UTF-8');
    return 'data-fr="' . $fr . '" data-ar="' . $ar . '"';
}

/** Renvoie la chaîne dans la langue demandée (HTML autorisé), FR par défaut. */
function t(string $key, string $lang): string
{
    global $STRINGS;
    return $STRINGS[$key][$lang] ?? ($STRINGS[$key]['fr'] ?? '');
}
