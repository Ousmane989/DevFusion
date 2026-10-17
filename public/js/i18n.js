/* Karat — i18n (FR par défaut, EN, AR avec RTL). Interface traduite via
   dictionnaire (clé = texte français source). Ré-application automatique sur le
   contenu ajouté dynamiquement. Sélecteur injecté dans le menu ([data-lang-switch])
   sinon flottant. */
(function () {
  'use strict';

  var EN = {
    // Commun / navigation
    'Accueil': 'Home', 'Fonctionnalités': 'Features', 'Modèles': 'Templates', 'FAQ': 'FAQ', 'Contact': 'Contact',
    'Se connecter': 'Sign in', 'Créer ma boutique': 'Create my store', 'Déconnexion': 'Log out', 'Se déconnecter': 'Log out',
    "Retour à l'accueil": 'Back to home', "Retour à l'inscription": 'Back to sign up', 'Retour au site': 'Back to site',
    'Navigation principale': 'Main navigation', 'Ouvrir le menu': 'Open menu', 'Fermer le menu': 'Close menu', 'Fermer': 'Close',
    'Produit': 'Product', 'Assistance': 'Support', 'Légal': 'Legal', 'Langue': 'Language',
    // Accueil — hero
    'Lancement prioritaire en Mauritanie 🇲🇷 & au Sénégal 🇸🇳': 'Priority launch in Mauritania 🇲🇷 & Senegal 🇸🇳',
    'Votre boutique en ligne,': 'Your online store,', 'pure comme': 'pure as', "l'or.": 'gold.', "l'or": 'gold', "pure comme l'or.": 'pure as gold.',
    "Karat permet aux commerçants d'ouvrir une boutique en ligne élégante, d'ajouter leurs produits et d'encaisser des paiements locaux — sans écrire une seule ligne de code.": 'Karat lets merchants open an elegant online store, add their products and collect local payments — without writing a single line of code.',
    'Créer ma boutique gratuitement': 'Create my store for free', 'Voir les modèles': 'See templates',
    'Gratuit · Sans engagement · Sans carte bancaire': 'Free · No commitment · No card',
    '🔔 Nouvelle commande': '🔔 New order', '💰 Vente encaissée': '💰 Sale collected', "Aujourd'hui": 'Today',
    '📈 Visiteurs': '📈 Visitors', 'Cette semaine': 'This week',
    // Comment ça marche
    'Comment ça marche': 'How it works', 'Votre boutique en 4 étapes': 'Your store in 4 steps',
    "De l'inscription à la première vente, tout est pensé pour aller vite et bien.": 'From sign-up to first sale, everything is built to be fast and smooth.',
    "S'inscrire": 'Sign up', 'Créez votre compte en 2 minutes et vérifiez votre e-mail par un code sécurisé.': 'Create your account in 2 minutes and verify your email with a secure code.',
    'Choisir un modèle': 'Choose a template', 'Sélectionnez un design premium et personnalisez couleurs, logo et bannières.': 'Pick a premium design and customize colors, logo and banners.',
    'Ajouter ses produits': 'Add your products', 'Importez vos articles, fixez vos prix en MRU ou FCFA et gérez vos stocks.': 'Import your items, set prices in MRU or FCFA and manage your stock.',
    'Vendre': 'Sell', 'Encaissez via les paiements mobiles locaux et suivez vos ventes en temps réel.': 'Get paid via local mobile payments and track sales in real time.',
    // Fonctionnalités
    'Tout pour vendre, rien de superflu': 'Everything to sell, nothing extra',
    "Des outils professionnels, pensés pour les commerçants d'Afrique de l'Ouest.": 'Professional tools built for West African merchants.',
    'Boutique personnalisable': 'Customizable store', 'Un design premium à vos couleurs : logo, thème, bannières et pages sur mesure.': 'A premium design in your colors: logo, theme, banners and custom pages.',
    'Gestion des produits': 'Product management', 'Ajoutez, organisez et mettez à jour vos articles, variantes et stocks en un clic.': 'Add, organize and update your items, options and stock in one click.',
    'Tableau de bord & statistiques': 'Dashboard & statistics', 'Visualisez ventes, commandes et visiteurs dans un tableau de bord clair et complet.': 'View sales, orders and visitors in a clear, complete dashboard.',
    "Chiffre d'affaires en temps réel": 'Real-time revenue', "Suivez vos revenus MRU et FCFA en direct, avec l'évolution jour après jour.": 'Track your MRU and FCFA revenue live, day by day.',
    'Nom de domaine': 'Domain name', 'Un lien professionnel': 'A professional link', 'ou votre propre domaine.': 'or your own domain.',
    'Paiements locaux': 'Local payments', "Bankily, Wave et Orange Money : encaissez comme vos clients ont l'habitude de payer.": 'Bankily, Wave and Orange Money: get paid the way your customers already pay.',
    'Boutiques créées': 'Stores created', 'Ventes réalisées': 'Sales made', 'Pays couverts': 'Countries covered',
    'Paiements mobiles locaux acceptés': 'Local mobile payments accepted', 'Paiement à la livraison': 'Cash on delivery',
    // Modèles
    'Modèles de boutiques': 'Store templates', 'Des designs prêts à vendre': 'Ready-to-sell designs',
    'Choisissez un modèle adapté à votre secteur et lancez-vous immédiatement.': 'Choose a template for your industry and get started right away.',
    'Mode': 'Fashion', 'Électronique': 'Electronics', 'Alimentation': 'Food', 'Cosmétique': 'Cosmetics', 'Artisanat': 'Crafts', 'Accessoires': 'Accessories',
    'Aperçu': 'Preview', 'Utiliser ce modèle': 'Use this template', "Voir d'autres modèles": 'See other templates',
    // Témoignages
    'Ils vendent avec Karat': 'They sell with Karat', 'La confiance des commerçants': 'Merchants trust us',
    'Des boutiques réelles, des ambitions concrètes.': 'Real stores, real ambitions.',
    "« En trois jours, ma boutique de tissus était en ligne et j'ai reçu ma première commande via Bankily. Karat a changé mon quotidien. »": '“In three days my fabric store was online and I received my first order via Bankily. Karat changed my daily life.”',
    'Tissus & couture · Nouakchott': 'Fabrics & sewing · Nouakchott',
    "« Le tableau de bord est clair : je vois mon chiffre d'affaires en direct. Le design premium inspire confiance à mes clients. »": '“The dashboard is clear: I see my revenue live. The premium design builds trust with my customers.”',
    'Électronique · Dakar': 'Electronics · Dakar',
    "« J'avais peur de la technique, mais tout est simple et en français. Aujourd'hui je vends mes cosmétiques dans deux pays. »": '“I was afraid of the tech side, but everything is simple. Today I sell my cosmetics in two countries.”',
    'Cosmétique naturelle · Rosso': 'Natural cosmetics · Rosso',
    // FAQ
    'Questions fréquentes': 'Frequently asked questions', 'Vous vous demandez peut-être…': 'You might be wondering…',
    'Combien coûte Karat ?': 'How much does Karat cost?', "Combien de temps puis-je l'utiliser ?": 'How long can I use it?',
    'Aussi longtemps que vous le souhaitez pendant cette phase. Votre boutique et vos données restent disponibles, sans limite de durée ni interruption.': 'As long as you like during this phase. Your store and data stay available, with no time limit or interruption.',
    'Quels moyens de paiement sont acceptés ?': 'Which payment methods are accepted?',
    'Ai-je besoin de compétences techniques ?': 'Do I need technical skills?',
    'Puis-je changer de formule plus tard ?': 'Can I change plan later?',
    "Oui, à tout moment. Vous pouvez passer d'une formule à une autre depuis votre espace, et le nouveau tarif s'applique dès votre prochain paiement mensuel.": 'Yes, anytime. You can switch plans from your dashboard, and the new rate applies from your next monthly payment.',
    'Mes données et celles de mes clients sont-elles en sécurité ?': 'Are my data and my customers’ data safe?',
    // CTA / footer
    'Prêt à vendre ?': 'Ready to sell?', 'Ouvrez votre boutique': 'Open your store', "dès aujourd'hui": 'today',
    'Rejoignez les commerçants qui font grandir leur activité avec Karat. Gratuit, sans engagement ni carte bancaire.': 'Join the merchants growing their business with Karat. Free, no commitment, no card.',
    'La plateforme premium pour créer votre boutique en ligne en Mauritanie et au Sénégal.': 'The premium platform to build your online store in Mauritania and Senegal.',
    "Conditions d'utilisation": 'Terms of use', 'Politique de confidentialité': 'Privacy policy', 'Mentions légales': 'Legal notice', 'Cookies': 'Cookies',
    'Karat. Tous droits réservés.': 'Karat. All rights reserved.', "Fait avec soin pour l'Afrique de l'Ouest 🌍": 'Made with care for West Africa 🌍',
    'Moyens de paiement acceptés': 'Accepted payment methods',
    // Boutique (client)
    'Nos produits': 'Our products', 'Découvrir la boutique': 'Explore the store', 'Rechercher un produit…': 'Search for a product…',
    'Commander': 'Order', 'Commander maintenant': 'Order now', 'Rupture de stock': 'Out of stock',
    'Quantité': 'Quantity', 'Vos coordonnées': 'Your details', 'Nom complet': 'Full name', 'Téléphone': 'Phone',
    'Ville / adresse de livraison (facultatif)': 'City / delivery address (optional)',
    'Note pour le livreur (facultatif)': 'Note for the courier (optional)',
    'Vous réglez en espèces à la réception.': 'You pay in cash on delivery.',
    'Partager ce produit': 'Share this product', 'Lien copié ✓': 'Link copied ✓',
    'Livraison rapide': 'Fast delivery', 'Payez à la livraison': 'Pay on delivery', 'Retours sous 7 j': '7-day returns',
    'Description': 'Description', 'Livraison': 'Delivery', 'Retours': 'Returns',
    'Sous-total': 'Subtotal', 'Total à payer': 'Total to pay', 'Total': 'Total', 'Variante': 'Option',
    'Commande confirmée !': 'Order confirmed!', 'Continuer mes achats': 'Continue shopping', 'Envoi…': 'Sending…',
    'Livraison à domicile': 'Home delivery', 'Achat en toute confiance': 'Shop with confidence',
    'Fiable. Discret. Toujours avec vous.': 'Reliable. Discreet. Always with you.',
    "La boutique n'a pas encore de produits.": 'The store has no products yet.', 'Revenez très bientôt !': 'Check back soon!',
    // Tableau de bord
    "Vue d'ensemble": 'Overview', 'Commandes': 'Orders', 'Produits': 'Products', 'Analyses': 'Analytics',
    'Marketing': 'Marketing', 'Pixels': 'Pixels', 'Ma boutique': 'My store', 'Paiement': 'Payments',
    'Paramètres': 'Settings', 'Comptabilité': 'Accounting', 'Boutique en ligne': 'Online store',
    'Gestion': 'Management', 'Compte': 'Account', 'Nouvelle commande': 'New order', 'Voir ma boutique': 'View my store', 'Menu': 'Menu',
    "Chiffre d'affaires": 'Revenue', 'Visiteurs': 'Visitors', 'Panier moyen': 'Average cart', 'Conversion': 'Conversion',
    "Ventes aujourd'hui": "Today's sales", "Commandes aujourd'hui": "Today's orders", 'Ventes': 'Sales',
    'Total commandes': 'Total orders', 'À traiter': 'To process', 'Livrées': 'Delivered', 'Toutes les commandes': 'All orders',
    'Nouvelle': 'New', 'Confirmée': 'Confirmed', 'Expédiée': 'Shipped', 'Livrée': 'Delivered', 'Annulée': 'Cancelled', 'En attente': 'Pending',
    'Ajouter un produit': 'Add a product', 'Nouveau produit': 'New product', 'Modifier': 'Edit', 'Enregistrer': 'Save',
    'Annuler': 'Cancel', 'Supprimer': 'Delete', 'Nom du produit': 'Product name', 'Catégorie': 'Category',
    'Stock': 'Stock', 'Photos du produit': 'Product photos', 'Ajouter une photo': 'Add a photo', 'Principale': 'Main',
    'Produit visible dans la boutique': 'Product visible in the store', 'Enregistrer le produit': 'Save the product',
    // Abonnement
    'Activer mon abonnement': 'Activate my subscription', 'Activer via WhatsApp': 'Activate via WhatsApp',
    'Payer avec Wave': 'Pay with Wave', 'Choisissez votre moyen de paiement': 'Choose your payment method',
    'Abonnement mensuel · sans engagement': 'Monthly subscription · no commitment',
    // Auth
    'Adresse e-mail': 'Email address', 'Mot de passe': 'Password', 'Mot de passe oublié ?': 'Forgot password?',
    'Déjà un compte ?': 'Already have an account?', 'Pas encore de boutique ?': 'No store yet?', 'Créer un compte': 'Create an account',
    'Nom de la boutique': 'Store name', 'Pays': 'Country', 'Créer mon compte': 'Create my account',
    'Vérifiez votre e-mail': 'Verify your email', 'Code de vérification': 'Verification code',
    'Valider et activer mon compte': 'Confirm and activate my account', 'Renvoyer le code': 'Resend code',
    'Envoyer le code': 'Send the code', 'Mettre à jour le mot de passe': 'Update the password',
  };

  var AR = {
    'Accueil': 'الرئيسية', 'Fonctionnalités': 'المميزات', 'Modèles': 'القوالب', 'FAQ': 'الأسئلة الشائعة', 'Contact': 'اتصل بنا',
    'Se connecter': 'تسجيل الدخول', 'Créer ma boutique': 'أنشئ متجري', 'Déconnexion': 'تسجيل الخروج', 'Se déconnecter': 'تسجيل الخروج',
    "Retour à l'accueil": 'العودة إلى الرئيسية', "Retour à l'inscription": 'العودة إلى التسجيل', 'Retour au site': 'العودة إلى الموقع',
    'Navigation principale': 'التنقل الرئيسي', 'Ouvrir le menu': 'فتح القائمة', 'Fermer le menu': 'إغلاق القائمة', 'Fermer': 'إغلاق',
    'Produit': 'المنتج', 'Assistance': 'الدعم', 'Légal': 'قانوني', 'Langue': 'اللغة',
    'Lancement prioritaire en Mauritanie 🇲🇷 & au Sénégal 🇸🇳': 'إطلاق أولوية في موريتانيا 🇲🇷 والسنغال 🇸🇳',
    'Votre boutique en ligne,': 'متجرك الإلكتروني،', 'pure comme': 'نقيّ كالـ', "l'or.": 'ذهب.', "l'or": 'ذهب', "pure comme l'or.": 'نقيّ كالذهب.',
    "Karat permet aux commerçants d'ouvrir une boutique en ligne élégante, d'ajouter leurs produits et d'encaisser des paiements locaux — sans écrire une seule ligne de code.": 'يمكّن Karat التجار من فتح متجر إلكتروني أنيق، وإضافة منتجاتهم، وتحصيل المدفوعات المحلية — دون كتابة سطر برمجي واحد.',
    'Créer ma boutique gratuitement': 'أنشئ متجري مجانًا', 'Voir les modèles': 'عرض القوالب',
    'Gratuit · Sans engagement · Sans carte bancaire': 'مجاني · دون التزام · دون بطاقة بنكية',
    '🔔 Nouvelle commande': '🔔 طلب جديد', '💰 Vente encaissée': '💰 تم تحصيل بيع', "Aujourd'hui": 'اليوم',
    '📈 Visiteurs': '📈 الزوار', 'Cette semaine': 'هذا الأسبوع',
    'Comment ça marche': 'كيف يعمل', 'Votre boutique en 4 étapes': 'متجرك في 4 خطوات',
    "De l'inscription à la première vente, tout est pensé pour aller vite et bien.": 'من التسجيل إلى أول عملية بيع، كل شيء مُصمّم ليكون سريعًا وسلسًا.',
    "S'inscrire": 'التسجيل', 'Créez votre compte en 2 minutes et vérifiez votre e-mail par un code sécurisé.': 'أنشئ حسابك في دقيقتين وتحقق من بريدك برمز آمن.',
    'Choisir un modèle': 'اختر قالبًا', 'Sélectionnez un design premium et personnalisez couleurs, logo et bannières.': 'اختر تصميمًا راقيًا وخصّص الألوان والشعار واللافتات.',
    'Ajouter ses produits': 'أضف منتجاتك', 'Importez vos articles, fixez vos prix en MRU ou FCFA et gérez vos stocks.': 'أضف منتجاتك، حدّد الأسعار بالأوقية أو الفرنك، وأدِر مخزونك.',
    'Vendre': 'البيع', 'Encaissez via les paiements mobiles locaux et suivez vos ventes en temps réel.': 'حصّل عبر المدفوعات المحلية وتابع مبيعاتك مباشرة.',
    'Tout pour vendre, rien de superflu': 'كل ما يلزم للبيع، دون زيادة',
    "Des outils professionnels, pensés pour les commerçants d'Afrique de l'Ouest.": 'أدوات احترافية مصممة لتجار غرب إفريقيا.',
    'Boutique personnalisable': 'متجر قابل للتخصيص', 'Un design premium à vos couleurs : logo, thème, bannières et pages sur mesure.': 'تصميم راقٍ بألوانك: شعار، سمة، لافتات وصفحات مخصصة.',
    'Gestion des produits': 'إدارة المنتجات', 'Ajoutez, organisez et mettez à jour vos articles, variantes et stocks en un clic.': 'أضف ونظّم وحدّث منتجاتك وخياراتك ومخزونك بنقرة واحدة.',
    'Tableau de bord & statistiques': 'لوحة التحكم والإحصائيات', 'Visualisez ventes, commandes et visiteurs dans un tableau de bord clair et complet.': 'اعرض المبيعات والطلبات والزوار في لوحة واضحة وكاملة.',
    "Chiffre d'affaires en temps réel": 'رقم الأعمال مباشرة', "Suivez vos revenus MRU et FCFA en direct, avec l'évolution jour après jour.": 'تابع إيراداتك بالأوقية والفرنك مباشرة، يومًا بعد يوم.',
    'Nom de domaine': 'اسم النطاق', 'Un lien professionnel': 'رابط احترافي', 'ou votre propre domaine.': 'أو نطاقك الخاص.',
    'Paiements locaux': 'المدفوعات المحلية', "Bankily, Wave et Orange Money : encaissez comme vos clients ont l'habitude de payer.": 'Bankily وWave وOrange Money: حصّل كما اعتاد عملاؤك الدفع.',
    'Boutiques créées': 'متاجر أُنشئت', 'Ventes réalisées': 'مبيعات تمت', 'Pays couverts': 'دول مغطاة',
    'Paiements mobiles locaux acceptés': 'مدفوعات محلية مقبولة', 'Paiement à la livraison': 'الدفع عند الاستلام',
    'Modèles de boutiques': 'قوالب المتاجر', 'Des designs prêts à vendre': 'تصاميم جاهزة للبيع',
    'Choisissez un modèle adapté à votre secteur et lancez-vous immédiatement.': 'اختر قالبًا يناسب مجالك وابدأ فورًا.',
    'Mode': 'أزياء', 'Électronique': 'إلكترونيات', 'Alimentation': 'مواد غذائية', 'Cosmétique': 'مستحضرات تجميل', 'Artisanat': 'حرف يدوية', 'Accessoires': 'إكسسوارات',
    'Aperçu': 'معاينة', 'Utiliser ce modèle': 'استخدم هذا القالب', "Voir d'autres modèles": 'عرض قوالب أخرى',
    'Ils vendent avec Karat': 'يبيعون مع Karat', 'La confiance des commerçants': 'ثقة التجار',
    'Des boutiques réelles, des ambitions concrètes.': 'متاجر حقيقية وطموحات ملموسة.',
    "« En trois jours, ma boutique de tissus était en ligne et j'ai reçu ma première commande via Bankily. Karat a changé mon quotidien. »": '«في ثلاثة أيام أصبح متجر الأقمشة الخاص بي على الإنترنت وتلقيت أول طلب عبر Bankily. غيّر Karat حياتي اليومية.»',
    'Tissus & couture · Nouakchott': 'أقمشة وخياطة · نواكشوط',
    "« Le tableau de bord est clair : je vois mon chiffre d'affaires en direct. Le design premium inspire confiance à mes clients. »": '«لوحة التحكم واضحة: أرى رقم أعمالي مباشرة. التصميم الراقي يمنح عملائي الثقة.»',
    'Électronique · Dakar': 'إلكترونيات · داكار',
    "« J'avais peur de la technique, mais tout est simple et en français. Aujourd'hui je vends mes cosmétiques dans deux pays. »": '«كنت أخشى الجانب التقني، لكن كل شيء بسيط. اليوم أبيع مستحضراتي في بلدين.»',
    'Cosmétique naturelle · Rosso': 'مستحضرات طبيعية · روصو',
    'Questions fréquentes': 'الأسئلة الشائعة', 'Vous vous demandez peut-être…': 'قد تتساءل…',
    'Combien coûte Karat ?': 'كم تكلفة Karat؟', "Combien de temps puis-je l'utiliser ?": 'كم من الوقت يمكنني استخدامه؟',
    'Aussi longtemps que vous le souhaitez pendant cette phase. Votre boutique et vos données restent disponibles, sans limite de durée ni interruption.': 'طالما رغبت خلال هذه المرحلة. يبقى متجرك وبياناتك متاحة دون حد زمني أو انقطاع.',
    'Quels moyens de paiement sont acceptés ?': 'ما وسائل الدفع المقبولة؟',
    'Ai-je besoin de compétences techniques ?': 'هل أحتاج إلى مهارات تقنية؟',
    'Puis-je changer de formule plus tard ?': 'هل يمكنني تغيير الباقة لاحقًا؟',
    "Oui, à tout moment. Vous pouvez passer d'une formule à une autre depuis votre espace, et le nouveau tarif s'applique dès votre prochain paiement mensuel.": 'نعم، في أي وقت. يمكنك تغيير الباقة من لوحتك، ويُطبّق السعر الجديد من الدفعة الشهرية التالية.',
    'Mes données et celles de mes clients sont-elles en sécurité ?': 'هل بياناتي وبيانات عملائي آمنة؟',
    'Prêt à vendre ?': 'جاهز للبيع؟', 'Ouvrez votre boutique': 'افتح متجرك', "dès aujourd'hui": 'اليوم',
    'Rejoignez les commerçants qui font grandir leur activité avec Karat. Gratuit, sans engagement ni carte bancaire.': 'انضم إلى التجار الذين ينمّون أعمالهم مع Karat. مجاني، دون التزام أو بطاقة.',
    'La plateforme premium pour créer votre boutique en ligne en Mauritanie et au Sénégal.': 'المنصة الراقية لإنشاء متجرك الإلكتروني في موريتانيا والسنغال.',
    "Conditions d'utilisation": 'شروط الاستخدام', 'Politique de confidentialité': 'سياسة الخصوصية', 'Mentions légales': 'إشعار قانوني', 'Cookies': 'ملفات تعريف الارتباط',
    'Karat. Tous droits réservés.': 'Karat. جميع الحقوق محفوظة.', "Fait avec soin pour l'Afrique de l'Ouest 🌍": 'صُنع بعناية لغرب إفريقيا 🌍',
    'Moyens de paiement acceptés': 'وسائل الدفع المقبولة',
    'Nos produits': 'منتجاتنا', 'Découvrir la boutique': 'اكتشف المتجر', 'Rechercher un produit…': 'ابحث عن منتج…',
    'Commander': 'اطلب', 'Commander maintenant': 'اطلب الآن', 'Rupture de stock': 'نفدت الكمية',
    'Quantité': 'الكمية', 'Vos coordonnées': 'معلوماتك', 'Nom complet': 'الاسم الكامل', 'Téléphone': 'الهاتف',
    'Ville / adresse de livraison (facultatif)': 'المدينة / عنوان التوصيل (اختياري)',
    'Note pour le livreur (facultatif)': 'ملاحظة لعامل التوصيل (اختياري)',
    'Vous réglez en espèces à la réception.': 'تدفع نقدًا عند الاستلام.',
    'Partager ce produit': 'شارك هذا المنتج', 'Lien copié ✓': 'تم نسخ الرابط ✓',
    'Livraison rapide': 'توصيل سريع', 'Payez à la livraison': 'ادفع عند الاستلام', 'Retours sous 7 j': 'إرجاع خلال 7 أيام',
    'Description': 'الوصف', 'Livraison': 'التوصيل', 'Retours': 'الإرجاع',
    'Sous-total': 'المجموع الفرعي', 'Total à payer': 'الإجمالي للدفع', 'Total': 'الإجمالي', 'Variante': 'الخيار',
    'Commande confirmée !': 'تم تأكيد الطلب!', 'Continuer mes achats': 'متابعة التسوق', 'Envoi…': 'جارٍ الإرسال…',
    'Livraison à domicile': 'التوصيل إلى المنزل', 'Achat en toute confiance': 'تسوق بثقة',
    'Fiable. Discret. Toujours avec vous.': 'موثوق. سري. دائمًا معك.',
    "La boutique n'a pas encore de produits.": 'لا توجد منتجات بعد في المتجر.', 'Revenez très bientôt !': 'عد قريبًا!',
    "Vue d'ensemble": 'نظرة عامة', 'Commandes': 'الطلبات', 'Produits': 'المنتجات', 'Analyses': 'التحليلات',
    'Marketing': 'التسويق', 'Pixels': 'Pixels', 'Ma boutique': 'متجري', 'Paiement': 'المدفوعات',
    'Paramètres': 'الإعدادات', 'Comptabilité': 'المحاسبة', 'Boutique en ligne': 'المتجر الإلكتروني',
    'Gestion': 'الإدارة', 'Compte': 'الحساب', 'Nouvelle commande': 'طلب جديد', 'Voir ma boutique': 'عرض متجري', 'Menu': 'القائمة',
    "Chiffre d'affaires": 'رقم الأعمال', 'Visiteurs': 'الزوار', 'Panier moyen': 'متوسط السلة', 'Conversion': 'نسبة التحويل',
    "Ventes aujourd'hui": 'مبيعات اليوم', "Commandes aujourd'hui": 'طلبات اليوم', 'Ventes': 'المبيعات',
    'Total commandes': 'إجمالي الطلبات', 'À traiter': 'قيد المعالجة', 'Livrées': 'تم التوصيل', 'Toutes les commandes': 'كل الطلبات',
    'Nouvelle': 'جديد', 'Confirmée': 'مؤكد', 'Expédiée': 'تم الشحن', 'Livrée': 'تم التوصيل', 'Annulée': 'ملغى', 'En attente': 'قيد الانتظار',
    'Ajouter un produit': 'إضافة منتج', 'Nouveau produit': 'منتج جديد', 'Modifier': 'تعديل', 'Enregistrer': 'حفظ',
    'Annuler': 'إلغاء', 'Supprimer': 'حذف', 'Nom du produit': 'اسم المنتج', 'Catégorie': 'الفئة',
    'Stock': 'المخزون', 'Photos du produit': 'صور المنتج', 'Ajouter une photo': 'إضافة صورة', 'Principale': 'الرئيسية',
    'Produit visible dans la boutique': 'المنتج ظاهر في المتجر', 'Enregistrer le produit': 'حفظ المنتج',
    'Activer mon abonnement': 'تفعيل اشتراكي', 'Activer via WhatsApp': 'التفعيل عبر واتساب',
    'Payer avec Wave': 'الدفع عبر Wave', 'Choisissez votre moyen de paiement': 'اختر وسيلة الدفع',
    'Abonnement mensuel · sans engagement': 'اشتراك شهري · دون التزام',
    'Adresse e-mail': 'البريد الإلكتروني', 'Mot de passe': 'كلمة المرور', 'Mot de passe oublié ?': 'هل نسيت كلمة المرور؟',
    'Déjà un compte ?': 'لديك حساب بالفعل؟', 'Pas encore de boutique ?': 'ليس لديك متجر بعد؟', 'Créer un compte': 'إنشاء حساب',
    'Nom de la boutique': 'اسم المتجر', 'Pays': 'الدولة', 'Créer mon compte': 'إنشاء حسابي',
    'Vérifiez votre e-mail': 'تحقق من بريدك الإلكتروني', 'Code de vérification': 'رمز التحقق',
    'Valider et activer mon compte': 'تأكيد وتفعيل حسابي', 'Renvoyer le code': 'إعادة إرسال الرمز',
    'Envoyer le code': 'إرسال الرمز', 'Mettre à jour le mot de passe': 'تحديث كلمة المرور',
  };

  var DICT = { en: EN, ar: AR };
  var LANGS = [{ id: 'fr', label: 'FR' }, { id: 'en', label: 'EN' }, { id: 'ar', label: 'ع' }];
  var ORIG = new WeakMap();
  var ORIGATTR = new WeakMap();
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, CODE: 1 };

  function getLang() { try { return localStorage.getItem('karat_lang') || 'fr'; } catch (_) { return 'fr'; } }
  function tr(key, l) { var d = DICT[l]; return (d && d[key]) || key; }

  function translateNode(node, l) {
    var o = ORIG.has(node) ? ORIG.get(node) : (ORIG.set(node, node.nodeValue), node.nodeValue);
    if (!o || !o.trim()) return;
    var key = o.trim();
    if (l === 'fr') { if (node.nodeValue !== o) node.nodeValue = o; return; }
    var t = tr(key, l);
    node.nodeValue = (t !== key) ? o.replace(key, t) : o;
  }
  var ATTRS = ['placeholder', 'title', 'aria-label'];
  function translateAttrs(el, l) {
    var store = ORIGATTR.get(el); if (!store) { store = {}; ORIGATTR.set(el, store); }
    ATTRS.forEach(function (a) {
      if (!el.hasAttribute(a) && store[a] === undefined) return;
      if (store[a] === undefined) store[a] = el.getAttribute(a);
      var o = store[a]; if (!o || !String(o).trim()) return;
      el.setAttribute(a, l === 'fr' ? o : tr(o.trim(), l));
    });
  }
  function walk(root, l) {
    if (!root) return;
    var els = root.querySelectorAll ? root.querySelectorAll('[placeholder],[title],[aria-label]') : [];
    for (var i = 0; i < els.length; i++) translateAttrs(els[i], l);
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p || SKIP[p.nodeName] || p.nodeName === 'svg' || (p.closest && (p.closest('svg') || p.closest('[data-no-i18n]')))) return NodeFilter.FILTER_REJECT;
        return n.nodeValue && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    var list = [], node; while ((node = tw.nextNode())) list.push(node);
    for (var j = 0; j < list.length; j++) translateNode(list[j], l);
  }

  var pending = null;
  function apply() {
    var l = getLang();
    document.documentElement.setAttribute('lang', l);
    document.documentElement.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr');
    walk(document.body, l);
    mountSwitchers();
    highlight();
  }
  function scheduleApply() { if (pending) return; pending = setTimeout(function () { pending = null; apply(); }, 120); }
  function setLang(l) { try { localStorage.setItem('karat_lang', l); } catch (_) {} apply(); }
  window.KaratI18n = { setLang: setLang, apply: apply, t: function (s) { return tr(s, getLang()); } };

  function switcherHtml() {
    return LANGS.map(function (x) { return '<button type="button" data-l="' + x.id + '">' + x.label + '</button>'; }).join('');
  }
  function highlight() {
    var l = getLang();
    document.querySelectorAll('.karat-lang button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-l') === l); });
  }
  function onClick(e) { var b = e.target.closest && e.target.closest('button[data-l]'); if (b) setLang(b.getAttribute('data-l')); }

  function injectStyle() {
    if (document.getElementById('karat-lang-style')) return;
    var s = document.createElement('style'); s.id = 'karat-lang-style';
    s.textContent = '.karat-lang{display:inline-flex;gap:4px;background:rgba(20,18,14,.55);border:1px solid rgba(212,175,55,.35);border-radius:50px;padding:3px}'
      + '.karat-lang button{min-width:32px;height:28px;border:none;background:transparent;color:inherit;opacity:.8;font:600 12px system-ui,sans-serif;border-radius:50px;cursor:pointer;padding:0 8px}'
      + '.karat-lang button.on{background:linear-gradient(120deg,#d4af37,#f5d77e);color:#1a1400;opacity:1}'
      + '.karat-lang.float{position:fixed;z-index:80;bottom:14px;inset-inline-start:14px;background:rgba(20,18,14,.92);backdrop-filter:blur(8px);box-shadow:0 8px 24px rgba(0,0,0,.35)}'
      + '@media(max-width:900px){.karat-lang.float{bottom:78px}}';
    document.head.appendChild(s);
  }
  function mountSwitchers() {
    injectStyle();
    var slots = document.querySelectorAll('[data-lang-switch]');
    if (slots.length) {
      // Retirer le flottant si des emplacements de menu existent.
      var fl = document.getElementById('karat-lang-float'); if (fl) fl.remove();
      slots.forEach(function (slot) {
        if (slot.getAttribute('data-mounted')) return;
        slot.setAttribute('data-mounted', '1');
        slot.setAttribute('data-no-i18n', '');
        var box = document.createElement('div'); box.className = 'karat-lang'; box.innerHTML = switcherHtml();
        box.addEventListener('click', onClick);
        slot.appendChild(box);
      });
    } else if (!document.getElementById('karat-lang-float')) {
      var box = document.createElement('div'); box.id = 'karat-lang-float'; box.className = 'karat-lang float';
      box.setAttribute('data-no-i18n', ''); box.innerHTML = switcherHtml();
      box.addEventListener('click', onClick);
      document.body.appendChild(box);
    }
  }

  function init() {
    apply();
    try { new MutationObserver(function () { scheduleApply(); }).observe(document.body, { childList: true, subtree: true }); } catch (_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
