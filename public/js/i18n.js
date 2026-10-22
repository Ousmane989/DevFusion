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
    'Tous les produits': 'All products', 'Voir tous les produits': 'See all products', 'Trier par': 'Sort by',
    'Nouveautés': 'Newest', 'Prix croissant': 'Price: low to high', 'Prix décroissant': 'Price: high to low', 'Meilleures promos': 'Best deals',
    'Nom (A → Z)': 'Name (A → Z)', 'Aucun produit ne correspond à votre recherche.': 'No product matches your search.', 'Réinitialiser': 'Reset', 'Tout': 'All',
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
    // Tableau de bord — détaillé
    'Navigation rapide': 'Quick navigation', 'Mes boutiques': 'My stores', 'Créer une boutique': 'Create a store',
    'API & Webhooks': 'API & Webhooks', 'Bonjour,': 'Hello,',
    'Voici les performances de votre boutique sur les 30 derniers jours.': "Here's your store's performance over the last 30 days.",
    'Comparé à la période précédente': 'Compared to the previous period', 'Recevez vos commandes en direct': 'Get your orders live',
    "Activez les notifications : une alerte sonore s'affichera sur votre téléphone à chaque nouvelle commande, même l'application fermée.": 'Enable notifications: a sound alert will play on your phone for every new order, even when the app is closed.',
    'Activer les notifications': 'Enable notifications', 'Tester': 'Test',
    'Sur 30 jours': 'Over 30 days', 'Visiteurs → clients': 'Visitors → customers',
    'Évolution du chiffre d\'affaires': 'Revenue trend', 'Passez la souris sur la courbe pour le détail.': 'Hover over the chart for details.',
    'Aujourd’hui': 'Today', '7 j': '7 d', '30 j': '30 d', '12 mois': '12 months',
    'Tunnel de conversion': 'Conversion funnel', 'Du visiteur à la commande — 30 derniers jours.': 'From visitor to order — last 30 days.',
    'Sources de trafic': 'Traffic sources',
    'Ajoutez et gérez les articles de votre boutique.': 'Add and manage your store items.',
    'Nom requis.': 'Name required.', 'Prix': 'Price', 'Prix invalide.': 'Invalid price.', 'Stock invalide.': 'Invalid stock.',
    'Accroche courte (sous le prix)': 'Short tagline (under the price)', 'Prix barré (promo)': 'Crossed-out price (sale)',
    'Ancien prix affiché barré à côté du prix.': 'Old price shown crossed out next to the price.',
    'Variantes': 'Options', 'Note (sur 5)': 'Rating (out of 5)', "Nombre d'avis": 'Number of reviews', '(jusqu\'à 3)': '(up to 3)',
    'JPG ou PNG — redimensionnées automatiquement. La 1ʳᵉ photo est l\'image principale.': 'JPG or PNG — resized automatically. The 1st photo is the main image.',
    'Statut': 'Status', 'Actions': 'Actions', 'Aucun produit pour le moment.': 'No products yet.',
    'Cliquez sur « Ajouter un produit » pour commencer à vendre.': 'Click “Add a product” to start selling.',
    'Suivez et faites évoluer le statut de vos commandes. Paiement à la livraison.': 'Track and update the status of your orders. Cash on delivery.',
    'CA encaissé (livrées)': 'Revenue collected (delivered)', 'Aucune commande pour le moment.': 'No orders yet.',
    'Définissez vos zones de livraison et leurs frais.': 'Set your delivery zones and their fees.',
    'Zones de livraison': 'Delivery zones', 'Ajouter une zone': 'Add a zone', 'Enregistrer la livraison': 'Save delivery',
    "Personnalisez l'apparence et l'identité de votre boutique.": 'Customize your store’s look and identity.',
    'Choisir un thème': 'Choose a theme', 'Identité visuelle': 'Visual identity', 'Logo': 'Logo', 'Aucun': 'None',
    'Choisir': 'Choose', 'Retirer': 'Remove', 'Bannière (image de fond du héro)': 'Banner (hero background image)', 'Aucune': 'None',
    'Contenu du site (modifiable)': 'Site content (editable)', 'Titre principal (héro)': 'Main title (hero)',
    'Slogan / sous-titre': 'Slogan / subtitle', 'Accroche (sous le titre)': 'Tagline (under the title)',
    'À propos de la boutique': 'About the store', 'Politique de retours (affichée sur la fiche produit)': 'Return policy (shown on the product page)',
    'Adresse de la boutique (nom de domaine)': 'Store address (domain name)', 'Votre boutique :': 'Your store:',
    'Cette adresse est déjà prise ou invalide.': 'This address is taken or invalid.',
    'Coordonnées (affichées sur votre boutique)': 'Contact details (shown on your store)', 'Adresse': 'Address',
    'Enregistrer les modifications': 'Save changes', 'WhatsApp': 'WhatsApp', 'E-mail': 'Email',
    'Pixels et suivi des conversions': 'Pixels & conversion tracking', 'Désactivé': 'Disabled',
    'Reliez Facebook, Instagram et TikTok à votre boutique.': 'Connect Facebook, Instagram and TikTok to your store.',
    'Identifiant du Pixel Meta': 'Meta Pixel ID', 'Dépense publicitaire': 'Ad spend', 'Coût par commande': 'Cost per order',
    'Coût par clic': 'Cost per click', 'CA net / dépense': 'Net revenue / spend', '30 jours': '30 days', '7 jours': '7 days', 'Année en cours': 'This year',
    // Formation
    'Formation': 'Training', 'Formation Karat': 'Karat Training', 'Programme': 'Program', '6 leçons': '6 lessons', 'terminés': 'completed',
    "De l'ajout d'un produit au lancement de votre première publicité : apprenez à réussir votre boutique, pas à pas. Tout se fait avec Facebook / Meta Business.": 'From adding a product to launching your first ad: learn to grow your store, step by step. Everything is done with Facebook / Meta Business.',
    'Vidéo bientôt disponible': 'Video coming soon', 'Cette leçon arrive très bientôt.': 'This lesson is coming very soon.', 'Bientôt': 'Soon',
    'Marquer comme terminé': 'Mark as completed', 'Terminé ✓': 'Completed ✓',
    'Introduction': 'Introduction', 'Chapitre 1': 'Chapter 1', 'Chapitre 2': 'Chapter 2', 'Chapitre 3': 'Chapter 3', 'Chapitre 4': 'Chapter 4', 'Chapitre 5': 'Chapter 5',
    'Bienvenue sur Karat': 'Welcome to Karat', 'Comment ajouter un produit': 'How to add a product', 'Comment personnaliser sa boutique': 'How to customize your store',
    'Créer une page Facebook et la lier à ma boutique': 'Create a Facebook page and link it to my store',
    'Configurer le Pixel et le connecter à ma boutique': 'Set up the Pixel and connect it to my store',
    'Lancer une campagne publicitaire': 'Launch an advertising campaign',
    "Découvrez la plateforme Karat et comprenez ce qu'est l'e-commerce : vendre en ligne, encaisser et livrer, simplement.": 'Discover the Karat platform and understand what e-commerce is: selling online, getting paid and delivering, simply.',
    'Créez votre première fiche produit : photos, prix, description et stock, pour la mettre en vente en quelques minutes.': 'Create your first product page: photos, price, description and stock, to put it on sale in minutes.',
    'Mettez vos couleurs, votre logo et votre bannière pour une boutique professionnelle à votre image.': 'Add your colors, logo and banner for a professional store in your own image.',
    'Créez votre page Facebook professionnelle avec Meta Business et reliez-la à votre boutique Karat.': 'Create your professional Facebook page with Meta Business and link it to your Karat store.',
    'Installez le Pixel Meta et connectez-le à votre boutique pour mesurer vos visiteurs et vos ventes.': 'Install the Meta Pixel and connect it to your store to measure your visitors and sales.',
    'Créez et lancez votre première publicité sur Meta Business pour attirer des clients vers votre boutique.': 'Create and launch your first ad on Meta Business to bring customers to your store.',
    // Agence de livraison (collaboration)
    'Agence de livraison': 'Delivery agency',
    "Confiez vos livraisons à une agence partenaire. Envoyez une demande : dès qu'elle accepte, vos commandes lui sont transmises automatiquement, en temps réel.": 'Hand your deliveries to a partner agency. Send a request: as soon as it accepts, your orders are forwarded to it automatically, in real time.',
    "1. Vous envoyez une demande à une agence. 2. L'agence l'accepte. 3. Chaque nouvelle commande de votre boutique arrive directement chez elle pour être livrée — paiement à la livraison.": '1. You send a request to an agency. 2. The agency accepts it. 3. Every new order from your store goes straight to it for delivery — cash on delivery.',
    'Demander la collaboration': 'Request collaboration', 'Collaboration active ✓': 'Collaboration active ✓', 'Demande en attente…': 'Request pending…',
    'Demande refusée': 'Request declined', 'Non connectée': 'Not connected', 'Redemander': 'Request again', 'Annuler la demande': 'Cancel request', 'Arrêter': 'Stop',
    'Aucune agence de livraison disponible pour le moment.': 'No delivery agency available at the moment.',
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
    'Tous les produits': 'كل المنتجات', 'Voir tous les produits': 'عرض كل المنتجات', 'Trier par': 'ترتيب حسب',
    'Nouveautés': 'الأحدث', 'Prix croissant': 'السعر: من الأقل إلى الأعلى', 'Prix décroissant': 'السعر: من الأعلى إلى الأقل', 'Meilleures promos': 'أفضل العروض',
    'Nom (A → Z)': 'الاسم (أ ← ي)', 'Aucun produit ne correspond à votre recherche.': 'لا يوجد منتج يطابق بحثك.', 'Réinitialiser': 'إعادة الضبط', 'Tout': 'الكل',
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
    'Navigation rapide': 'تنقل سريع', 'Mes boutiques': 'متاجري', 'Créer une boutique': 'إنشاء متجر',
    'API & Webhooks': 'API وWebhooks', 'Bonjour,': 'مرحبًا،',
    'Voici les performances de votre boutique sur les 30 derniers jours.': 'إليك أداء متجرك خلال آخر 30 يومًا.',
    'Comparé à la période précédente': 'مقارنة بالفترة السابقة', 'Recevez vos commandes en direct': 'استقبل طلباتك مباشرة',
    "Activez les notifications : une alerte sonore s'affichera sur votre téléphone à chaque nouvelle commande, même l'application fermée.": 'فعّل الإشعارات: سيصدر تنبيه صوتي على هاتفك عند كل طلب جديد، حتى والتطبيق مغلق.',
    'Activer les notifications': 'تفعيل الإشعارات', 'Tester': 'اختبار',
    'Sur 30 jours': 'خلال 30 يومًا', 'Visiteurs → clients': 'الزوار ← العملاء',
    'Évolution du chiffre d\'affaires': 'تطور رقم الأعمال', 'Passez la souris sur la courbe pour le détail.': 'مرّر فوق المنحنى لعرض التفاصيل.',
    'Aujourd’hui': 'اليوم', '7 j': '7 أيام', '30 j': '30 يومًا', '12 mois': '12 شهرًا',
    'Tunnel de conversion': 'مسار التحويل', 'Du visiteur à la commande — 30 derniers jours.': 'من الزائر إلى الطلب — آخر 30 يومًا.',
    'Sources de trafic': 'مصادر الزيارات',
    'Ajoutez et gérez les articles de votre boutique.': 'أضف وأدِر منتجات متجرك.',
    'Nom requis.': 'الاسم مطلوب.', 'Prix': 'السعر', 'Prix invalide.': 'سعر غير صالح.', 'Stock invalide.': 'مخزون غير صالح.',
    'Accroche courte (sous le prix)': 'عبارة قصيرة (أسفل السعر)', 'Prix barré (promo)': 'السعر المشطوب (تخفيض)',
    'Ancien prix affiché barré à côté du prix.': 'السعر القديم يظهر مشطوبًا بجانب السعر.',
    'Variantes': 'الخيارات', 'Note (sur 5)': 'التقييم (من 5)', "Nombre d'avis": 'عدد التقييمات', '(jusqu\'à 3)': '(حتى 3)',
    'JPG ou PNG — redimensionnées automatiquement. La 1ʳᵉ photo est l\'image principale.': 'JPG أو PNG — يُعاد تحجيمها تلقائيًا. الصورة الأولى هي الرئيسية.',
    'Statut': 'الحالة', 'Actions': 'إجراءات', 'Aucun produit pour le moment.': 'لا توجد منتجات بعد.',
    'Cliquez sur « Ajouter un produit » pour commencer à vendre.': 'انقر على «إضافة منتج» لبدء البيع.',
    'Suivez et faites évoluer le statut de vos commandes. Paiement à la livraison.': 'تابع وحدّث حالة طلباتك. الدفع عند الاستلام.',
    'CA encaissé (livrées)': 'الإيراد المحصّل (المسلّمة)', 'Aucune commande pour le moment.': 'لا توجد طلبات بعد.',
    'Définissez vos zones de livraison et leurs frais.': 'حدّد مناطق التوصيل ورسومها.',
    'Zones de livraison': 'مناطق التوصيل', 'Ajouter une zone': 'إضافة منطقة', 'Enregistrer la livraison': 'حفظ التوصيل',
    "Personnalisez l'apparence et l'identité de votre boutique.": 'خصّص مظهر وهوية متجرك.',
    'Choisir un thème': 'اختر سمة', 'Identité visuelle': 'الهوية البصرية', 'Logo': 'الشعار', 'Aucun': 'لا شيء',
    'Choisir': 'اختر', 'Retirer': 'إزالة', 'Bannière (image de fond du héro)': 'لافتة (خلفية الواجهة)', 'Aucune': 'لا شيء',
    'Contenu du site (modifiable)': 'محتوى الموقع (قابل للتعديل)', 'Titre principal (héro)': 'العنوان الرئيسي (الواجهة)',
    'Slogan / sous-titre': 'شعار / عنوان فرعي', 'Accroche (sous le titre)': 'عبارة (أسفل العنوان)',
    'À propos de la boutique': 'عن المتجر', 'Politique de retours (affichée sur la fiche produit)': 'سياسة الإرجاع (تظهر في صفحة المنتج)',
    'Adresse de la boutique (nom de domaine)': 'عنوان المتجر (اسم النطاق)', 'Votre boutique :': 'متجرك:',
    'Cette adresse est déjà prise ou invalide.': 'هذا العنوان محجوز أو غير صالح.',
    'Coordonnées (affichées sur votre boutique)': 'بيانات الاتصال (تظهر في متجرك)', 'Adresse': 'العنوان',
    'Enregistrer les modifications': 'حفظ التعديلات', 'WhatsApp': 'واتساب', 'E-mail': 'البريد الإلكتروني',
    'Pixels et suivi des conversions': 'Pixels وتتبّع التحويلات', 'Désactivé': 'معطّل',
    'Reliez Facebook, Instagram et TikTok à votre boutique.': 'اربط فيسبوك وإنستغرام وتيك توك بمتجرك.',
    'Identifiant du Pixel Meta': 'معرّف Pixel من Meta', 'Dépense publicitaire': 'الإنفاق الإعلاني', 'Coût par commande': 'التكلفة لكل طلب',
    'Coût par clic': 'التكلفة لكل نقرة', 'CA net / dépense': 'صافي الإيراد / الإنفاق', '30 jours': '30 يومًا', '7 jours': '7 أيام', 'Année en cours': 'السنة الحالية',
    // Formation
    'Formation': 'التدريب', 'Formation Karat': 'تدريب Karat', 'Programme': 'البرنامج', '6 leçons': '6 دروس', 'terminés': 'مكتملة',
    "De l'ajout d'un produit au lancement de votre première publicité : apprenez à réussir votre boutique, pas à pas. Tout se fait avec Facebook / Meta Business.": 'من إضافة منتج إلى إطلاق أول إعلان لك: تعلّم كيف تنجح بمتجرك خطوة بخطوة. كل شيء يتم عبر Facebook / Meta Business.',
    'Vidéo bientôt disponible': 'الفيديو قريبًا', 'Cette leçon arrive très bientôt.': 'هذا الدرس قريبًا جدًا.', 'Bientôt': 'قريبًا',
    'Marquer comme terminé': 'وضع علامة كمكتمل', 'Terminé ✓': 'مكتمل ✓',
    'Introduction': 'مقدمة', 'Chapitre 1': 'الفصل 1', 'Chapitre 2': 'الفصل 2', 'Chapitre 3': 'الفصل 3', 'Chapitre 4': 'الفصل 4', 'Chapitre 5': 'الفصل 5',
    'Bienvenue sur Karat': 'مرحبًا بك في Karat', 'Comment ajouter un produit': 'كيفية إضافة منتج', 'Comment personnaliser sa boutique': 'كيفية تخصيص متجرك',
    'Créer une page Facebook et la lier à ma boutique': 'إنشاء صفحة فيسبوك وربطها بمتجري',
    'Configurer le Pixel et le connecter à ma boutique': 'إعداد Pixel وربطه بمتجري',
    'Lancer une campagne publicitaire': 'إطلاق حملة إعلانية',
    "Découvrez la plateforme Karat et comprenez ce qu'est l'e-commerce : vendre en ligne, encaisser et livrer, simplement.": 'اكتشف منصة Karat وافهم ما هي التجارة الإلكترونية: البيع عبر الإنترنت، التحصيل والتوصيل، ببساطة.',
    'Créez votre première fiche produit : photos, prix, description et stock, pour la mettre en vente en quelques minutes.': 'أنشئ أول بطاقة منتج: الصور والسعر والوصف والمخزون، لعرضه للبيع في دقائق.',
    'Mettez vos couleurs, votre logo et votre bannière pour une boutique professionnelle à votre image.': 'أضف ألوانك وشعارك ولافتتك لمتجر احترافي يعكس هويتك.',
    'Créez votre page Facebook professionnelle avec Meta Business et reliez-la à votre boutique Karat.': 'أنشئ صفحتك الاحترافية على فيسبوك عبر Meta Business واربطها بمتجر Karat.',
    'Installez le Pixel Meta et connectez-le à votre boutique pour mesurer vos visiteurs et vos ventes.': 'ثبّت Meta Pixel واربطه بمتجرك لقياس زوّارك ومبيعاتك.',
    'Créez et lancez votre première publicité sur Meta Business pour attirer des clients vers votre boutique.': 'أنشئ وأطلق أول إعلان لك على Meta Business لجذب العملاء إلى متجرك.',
    // Agence de livraison (collaboration)
    'Agence de livraison': 'وكالة التوصيل',
    "Confiez vos livraisons à une agence partenaire. Envoyez une demande : dès qu'elle accepte, vos commandes lui sont transmises automatiquement, en temps réel.": 'أوكِل عمليات التوصيل إلى وكالة شريكة. أرسل طلبًا: بمجرد قبولها، تُحوَّل طلباتك إليها تلقائيًا، في الوقت الفعلي.',
    "1. Vous envoyez une demande à une agence. 2. L'agence l'accepte. 3. Chaque nouvelle commande de votre boutique arrive directement chez elle pour être livrée — paiement à la livraison.": '1. ترسل طلبًا إلى وكالة. 2. تقبله الوكالة. 3. يصل كل طلب جديد من متجرك إليها مباشرة للتوصيل — الدفع عند الاستلام.',
    'Demander la collaboration': 'طلب التعاون', 'Collaboration active ✓': 'تعاون نشط ✓', 'Demande en attente…': 'الطلب قيد الانتظار…',
    'Demande refusée': 'تم رفض الطلب', 'Non connectée': 'غير متصلة', 'Redemander': 'إعادة الطلب', 'Annuler la demande': 'إلغاء الطلب', 'Arrêter': 'إيقاف',
    'Aucune agence de livraison disponible pour le moment.': 'لا توجد وكالة توصيل متاحة حاليًا.',
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

  // Noms des langues selon la langue d'interface active.
  var NAMES = {
    fr: { en: 'Anglais', fr: 'Français', ar: 'Arabe' },
    en: { en: 'English', fr: 'French', ar: 'Arabic' },
    ar: { en: 'الإنجليزية', fr: 'الفرنسية', ar: 'العربية' },
  };
  var ORDER = ['en', 'fr', 'ar'];
  var ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.9 15l-2.6-2.57.03-.03A17.9 17.9 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17A15.9 15.9 0 0 1 9 10.88 15.9 15.9 0 0 1 6.9 7.5h-2A17.9 17.9 0 0 0 7.6 12L2.5 17.03 4 18.5l5-5 3.1 3.1.8-1.6zM17.5 10h-2L11 22h2l1.12-3h4.75L20 22h2l-4.5-12zm-1.62 5l1.62-4.33L19.12 15h-3.24z"/></svg>';

  function closeAllMenus() { document.querySelectorAll('.kl-menu').forEach(function (m) { m.hidden = true; }); }
  function highlight() {
    var l = getLang();
    document.querySelectorAll('.karat-lang').forEach(function (c) {
      c.querySelectorAll('.kl-menu button[data-l]').forEach(function (b) {
        var id = b.getAttribute('data-l');
        b.textContent = (NAMES[l] || NAMES.fr)[id];
        b.classList.toggle('current', id === l);
        b.disabled = (id === l);
      });
    });
  }

  function injectStyle() {
    if (document.getElementById('karat-lang-style')) return;
    var s = document.createElement('style'); s.id = 'karat-lang-style';
    s.textContent = '.karat-lang{position:relative;display:inline-block;line-height:0}'
      + '.kl-btn{width:40px;height:40px;border:1px solid var(--line,#2a2723);background:var(--bg-card,var(--surface,#171717));color:var(--gold,var(--accent,#d4af37));border-radius:12px;display:grid;place-items:center;cursor:pointer;transition:border-color .15s,color .15s}'
      + '.kl-btn:hover{border-color:var(--gold,var(--accent,#d4af37));color:var(--gold-light,var(--accent,#f5d77e))}.kl-btn svg{width:21px;height:21px}'
      + '.kl-menu{position:absolute;top:calc(100% + 10px);inset-inline-end:0;min-width:170px;background:var(--bg-card,var(--surface,#171717));border:1px solid var(--line,#2a2723);border-radius:14px;box-shadow:0 22px 48px rgba(0,0,0,.5);padding:6px;z-index:95;display:flex;flex-direction:column;text-align:start}'
      + '.kl-menu[hidden]{display:none}'
      + '.kl-menu button{display:block;width:100%;text-align:start;background:none;border:none;font:500 15px var(--sans,system-ui,-apple-system,sans-serif);color:var(--text,#f4f1ea);padding:11px 16px;border-radius:10px;cursor:pointer;white-space:nowrap}'
      + '.kl-menu button:hover{background:color-mix(in srgb,var(--gold,var(--accent,#d4af37)) 14%,transparent);color:var(--gold-light,var(--accent,#f5d77e))}'
      + '.kl-menu button.current{color:var(--text-mute,var(--muted,#837e72));cursor:default;background:none}'
      + '.karat-lang.float{position:fixed;z-index:80;bottom:14px;inset-inline-start:14px}'
      + '.karat-lang.float .kl-menu{top:auto;bottom:calc(100% + 10px);inset-inline-end:auto;inset-inline-start:0}'
      + '@media(max-width:900px){.karat-lang.float{bottom:80px}}';
    document.head.appendChild(s);
  }

  function buildSwitcher(container, floating) {
    container.className = 'karat-lang' + (floating ? ' float' : '');
    container.setAttribute('data-no-i18n', '');
    container.innerHTML = '<button type="button" class="kl-btn" aria-label="Langue" aria-haspopup="true">' + ICON + '</button>'
      + '<div class="kl-menu" hidden>' + ORDER.map(function (id) { return '<button type="button" data-l="' + id + '"></button>'; }).join('') + '</div>';
    container.addEventListener('click', function (e) {
      var lang = e.target.closest('button[data-l]');
      if (lang && !lang.disabled) { setLang(lang.getAttribute('data-l')); closeAllMenus(); return; }
      var btn = e.target.closest('.kl-btn');
      if (btn) { var m = container.querySelector('.kl-menu'); var open = m.hidden; closeAllMenus(); m.hidden = !open; }
    });
  }

  var docBound = false;
  function mountSwitchers() {
    injectStyle();
    if (!docBound) { docBound = true; document.addEventListener('click', function (e) { if (!e.target.closest('.karat-lang')) closeAllMenus(); }); }
    var slots = document.querySelectorAll('[data-lang-switch]');
    if (slots.length) {
      var fl = document.getElementById('karat-lang-float'); if (fl) fl.remove();
      slots.forEach(function (slot) {
        if (slot.getAttribute('data-mounted')) return;
        slot.setAttribute('data-mounted', '1');
        var box = document.createElement('div');
        buildSwitcher(box, false);
        slot.appendChild(box);
      });
    } else if (!document.getElementById('karat-lang-float')) {
      var box = document.createElement('div'); box.id = 'karat-lang-float';
      buildSwitcher(box, true);
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
