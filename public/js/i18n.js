/* Karat — i18n léger (FR par défaut, EN, AR avec RTL).
   Traduit l'interface via un dictionnaire (clé = texte français source).
   Un observateur applique la traduction au contenu ajouté dynamiquement. */
(function () {
  'use strict';

  var EN = {
    // Navigation / commun
    'Accueil': 'Home', 'Fonctionnalités': 'Features', 'Modèles': 'Templates', 'FAQ': 'FAQ', 'Contact': 'Contact',
    'Se connecter': 'Sign in', 'Créer ma boutique': 'Create my store', 'Déconnexion': 'Log out', 'Se déconnecter': 'Log out',
    "Retour à l'accueil": 'Back to home', "Retour à l'inscription": 'Back to sign up', 'Retour au site': 'Back to site',
    // Accueil
    'Modèles de boutiques': 'Store templates', 'Des designs prêts à vendre': 'Ready-to-sell designs',
    'Choisissez un modèle adapté à votre secteur et lancez-vous immédiatement.': 'Choose a template for your industry and get started right away.',
    'Aperçu': 'Preview', 'Utiliser ce modèle': 'Use this template', "Voir d'autres modèles": 'See other templates',
    // Boutique (client)
    'Nos produits': 'Our products', 'Découvrir la boutique': 'Explore the store',
    'Commander': 'Order', 'Commander maintenant': 'Order now', 'Rupture de stock': 'Out of stock',
    'Quantité': 'Quantity', 'Vos coordonnées': 'Your details', 'Nom complet': 'Full name', 'Téléphone': 'Phone',
    'Ville / adresse de livraison (facultatif)': 'City / delivery address (optional)',
    'Note pour le livreur (facultatif)': 'Note for the courier (optional)',
    'Paiement à la livraison': 'Cash on delivery', 'Vous réglez en espèces à la réception.': 'You pay in cash on delivery.',
    'Partager ce produit': 'Share this product', 'Lien copié ✓': 'Link copied ✓',
    'Livraison rapide': 'Fast delivery', 'Payez à la livraison': 'Pay on delivery', 'Retours sous 7 j': '7-day returns',
    'Description': 'Description', 'Livraison': 'Delivery', 'Retours': 'Returns',
    'Sous-total': 'Subtotal', 'Total à payer': 'Total to pay', 'Total': 'Total', 'Variante': 'Option',
    'Commande confirmée !': 'Order confirmed!', 'Continuer mes achats': 'Continue shopping', 'Envoi…': 'Sending…',
    'Livraison à domicile': 'Home delivery', 'Achat en toute confiance': 'Shop with confidence',
    'Fiable. Discret. Toujours avec vous.': 'Reliable. Discreet. Always with you.',
    "La boutique n'a pas encore de produits.": 'The store has no products yet.', 'Revenez très bientôt !': 'Check back soon!',
    'Rechercher un produit…': 'Search for a product…',
    // Tableau de bord — navigation
    "Vue d'ensemble": 'Overview', 'Commandes': 'Orders', 'Produits': 'Products', 'Analyses': 'Analytics',
    'Marketing': 'Marketing', 'Pixels': 'Pixels', 'Ma boutique': 'My store', 'Paiement': 'Payments',
    'Paramètres': 'Settings', 'Comptabilité': 'Accounting', 'Boutique en ligne': 'Online store',
    'Gestion': 'Management', 'Compte': 'Account', 'Nouvelle commande': 'New order', 'Voir ma boutique': 'View my store',
    'Menu': 'Menu',
    // KPIs
    "Chiffre d'affaires": 'Revenue', 'Visiteurs': 'Visitors', 'Panier moyen': 'Average cart', 'Conversion': 'Conversion',
    "Ventes aujourd'hui": "Today's sales", "Commandes aujourd'hui": "Today's orders", 'Ventes': 'Sales', 'Aujourd’hui': 'Today',
    'Total commandes': 'Total orders', 'À traiter': 'To process', 'Livrées': 'Delivered', 'Toutes les commandes': 'All orders',
    // Statuts
    'Nouvelle': 'New', 'Confirmée': 'Confirmed', 'Expédiée': 'Shipped', 'Livrée': 'Delivered', 'Annulée': 'Cancelled', 'En attente': 'Pending',
    // Produits (gestion)
    'Ajouter un produit': 'Add a product', 'Nouveau produit': 'New product', 'Modifier': 'Edit', 'Enregistrer': 'Save',
    'Annuler': 'Cancel', 'Supprimer': 'Delete', 'Nom du produit': 'Product name', 'Catégorie': 'Category',
    'Stock': 'Stock', 'Photos du produit': 'Product photos', 'Ajouter une photo': 'Add a photo', 'Principale': 'Main',
    'Produit visible dans la boutique': 'Product visible in the store', 'Enregistrer le produit': 'Save the product',
    'Description': 'Description',
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
    // Accueil (hero / CTA)
    'Créer ma boutique gratuitement': 'Create my store for free', 'Voir les modèles': 'See templates',
    'Gratuit · Sans engagement · Sans carte bancaire': 'Free · No commitment · No card',
    "Karat permet aux commerçants d'ouvrir une boutique en ligne élégante, d'ajouter leurs produits et d'encaisser des paiements locaux — sans écrire une seule ligne de code.": 'Karat lets merchants open an elegant online store, add their products and collect local payments — without writing a single line of code.',
  };

  var AR = {
    'Accueil': 'الرئيسية', 'Fonctionnalités': 'المميزات', 'Modèles': 'القوالب', 'FAQ': 'الأسئلة الشائعة', 'Contact': 'اتصل بنا',
    'Se connecter': 'تسجيل الدخول', 'Créer ma boutique': 'أنشئ متجري', 'Déconnexion': 'تسجيل الخروج', 'Se déconnecter': 'تسجيل الخروج',
    "Retour à l'accueil": 'العودة إلى الرئيسية', "Retour à l'inscription": 'العودة إلى التسجيل', 'Retour au site': 'العودة إلى الموقع',
    'Modèles de boutiques': 'قوالب المتاجر', 'Des designs prêts à vendre': 'تصاميم جاهزة للبيع',
    'Choisissez un modèle adapté à votre secteur et lancez-vous immédiatement.': 'اختر قالبًا يناسب مجالك وابدأ فورًا.',
    'Aperçu': 'معاينة', 'Utiliser ce modèle': 'استخدم هذا القالب', "Voir d'autres modèles": 'عرض قوالب أخرى',
    'Nos produits': 'منتجاتنا', 'Découvrir la boutique': 'اكتشف المتجر',
    'Commander': 'اطلب', 'Commander maintenant': 'اطلب الآن', 'Rupture de stock': 'نفدت الكمية',
    'Quantité': 'الكمية', 'Vos coordonnées': 'معلوماتك', 'Nom complet': 'الاسم الكامل', 'Téléphone': 'الهاتف',
    'Ville / adresse de livraison (facultatif)': 'المدينة / عنوان التوصيل (اختياري)',
    'Note pour le livreur (facultatif)': 'ملاحظة لعامل التوصيل (اختياري)',
    'Paiement à la livraison': 'الدفع عند الاستلام', 'Vous réglez en espèces à la réception.': 'تدفع نقدًا عند الاستلام.',
    'Partager ce produit': 'شارك هذا المنتج', 'Lien copié ✓': 'تم نسخ الرابط ✓',
    'Livraison rapide': 'توصيل سريع', 'Payez à la livraison': 'ادفع عند الاستلام', 'Retours sous 7 j': 'إرجاع خلال 7 أيام',
    'Description': 'الوصف', 'Livraison': 'التوصيل', 'Retours': 'الإرجاع',
    'Sous-total': 'المجموع الفرعي', 'Total à payer': 'الإجمالي للدفع', 'Total': 'الإجمالي', 'Variante': 'الخيار',
    'Commande confirmée !': 'تم تأكيد الطلب!', 'Continuer mes achats': 'متابعة التسوق', 'Envoi…': 'جارٍ الإرسال…',
    'Livraison à domicile': 'التوصيل إلى المنزل', 'Achat en toute confiance': 'تسوق بثقة',
    'Fiable. Discret. Toujours avec vous.': 'موثوق. سري. دائمًا معك.',
    "La boutique n'a pas encore de produits.": 'لا توجد منتجات بعد في المتجر.', 'Revenez très bientôt !': 'عد قريبًا!',
    'Rechercher un produit…': 'ابحث عن منتج…',
    "Vue d'ensemble": 'نظرة عامة', 'Commandes': 'الطلبات', 'Produits': 'المنتجات', 'Analyses': 'التحليلات',
    'Marketing': 'التسويق', 'Pixels': 'Pixels', 'Ma boutique': 'متجري', 'Paiement': 'المدفوعات',
    'Paramètres': 'الإعدادات', 'Comptabilité': 'المحاسبة', 'Boutique en ligne': 'المتجر الإلكتروني',
    'Gestion': 'الإدارة', 'Compte': 'الحساب', 'Nouvelle commande': 'طلب جديد', 'Voir ma boutique': 'عرض متجري',
    'Menu': 'القائمة',
    "Chiffre d'affaires": 'رقم الأعمال', 'Visiteurs': 'الزوار', 'Panier moyen': 'متوسط السلة', 'Conversion': 'نسبة التحويل',
    "Ventes aujourd'hui": 'مبيعات اليوم', "Commandes aujourd'hui": 'طلبات اليوم', 'Ventes': 'المبيعات', 'Aujourd’hui': 'اليوم',
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
    'Créer ma boutique gratuitement': 'أنشئ متجري مجانًا', 'Voir les modèles': 'عرض القوالب',
    'Gratuit · Sans engagement · Sans carte bancaire': 'مجاني · دون التزام · دون بطاقة بنكية',
    "Karat permet aux commerçants d'ouvrir une boutique en ligne élégante, d'ajouter leurs produits et d'encaisser des paiements locaux — sans écrire une seule ligne de code.": 'يمكّن Karat التجار من فتح متجر إلكتروني أنيق، وإضافة منتجاتهم، وتحصيل المدفوعات المحلية — دون كتابة سطر برمجي واحد.',
  };

  var DICT = { en: EN, ar: AR };
  var LANGS = [{ id: 'fr', label: 'FR' }, { id: 'en', label: 'EN' }, { id: 'ar', label: 'ع' }];
  var ORIG = new WeakMap();   // texte français d'origine par nœud
  var ORIGATTR = new WeakMap(); // {attr: valeur FR} par élément
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, CODE: 1, svg: 1, SVG: 1 };

  function getLang() { try { return localStorage.getItem('karat_lang') || 'fr'; } catch (_) { return 'fr'; } }
  function dictOf(l) { return DICT[l] || null; }
  function tr(key, l) { var d = dictOf(l); return (d && d[key]) || key; }

  function translateNode(node, l) {
    var o = ORIG.has(node) ? ORIG.get(node) : (ORIG.set(node, node.nodeValue), node.nodeValue);
    if (!o || !o.trim()) return;
    var key = o.trim();
    if (l === 'fr') { if (node.nodeValue !== o) node.nodeValue = o; return; }
    var t = tr(key, l);
    if (t !== key) node.nodeValue = o.replace(key, t);
    else if (node.nodeValue !== o) node.nodeValue = o;
  }

  var ATTRS = ['placeholder', 'title', 'aria-label'];
  function translateAttrs(el, l) {
    var store = ORIGATTR.get(el); if (!store) { store = {}; ORIGATTR.set(el, store); }
    ATTRS.forEach(function (a) {
      if (!el.hasAttribute(a) && store[a] === undefined) return;
      if (store[a] === undefined) store[a] = el.getAttribute(a);
      var o = store[a]; if (o === null || o === undefined || !String(o).trim()) return;
      el.setAttribute(a, l === 'fr' ? o : tr(o.trim(), l));
    });
  }

  function walk(root, l) {
    if (!root) return;
    // Attributs
    var els = root.querySelectorAll ? root.querySelectorAll('[placeholder],[title],[aria-label]') : [];
    for (var i = 0; i < els.length; i++) translateAttrs(els[i], l);
    if (root.nodeType === 1 && (root.hasAttribute('placeholder') || root.hasAttribute('title') || root.hasAttribute('aria-label'))) translateAttrs(root, l);
    // Textes
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p || SKIP[p.nodeName] || (p.closest && p.closest('[data-no-i18n]'))) return NodeFilter.FILTER_REJECT;
        return n.nodeValue && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    var list = [], node;
    while ((node = tw.nextNode())) list.push(node);
    for (var j = 0; j < list.length; j++) translateNode(list[j], l);
  }

  var pending = null;
  function apply() {
    var l = getLang();
    document.documentElement.setAttribute('lang', l);
    document.documentElement.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr');
    walk(document.body, l);
    highlight();
  }
  function scheduleApply() { if (pending) return; pending = setTimeout(function () { pending = null; apply(); }, 120); }

  function setLang(l) {
    try { localStorage.setItem('karat_lang', l); } catch (_) {}
    apply();
  }
  window.KaratI18n = { setLang: setLang, apply: apply, t: function (s) { return tr(s, getLang()); } };

  // Sélecteur de langue flottant
  var box;
  function highlight() {
    if (!box) return;
    var l = getLang();
    box.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-l') === l); });
  }
  function buildSwitcher() {
    if (document.getElementById('karat-lang')) return;
    box = document.createElement('div');
    box.id = 'karat-lang';
    box.setAttribute('data-no-i18n', '');
    box.innerHTML = LANGS.map(function (x) { return '<button type="button" data-l="' + x.id + '">' + x.label + '</button>'; }).join('');
    var s = document.createElement('style');
    s.textContent = '#karat-lang{position:fixed;z-index:80;bottom:14px;inset-inline-start:14px;display:flex;gap:4px;background:rgba(20,18,14,.92);backdrop-filter:blur(8px);border:1px solid rgba(212,175,55,.35);border-radius:50px;padding:4px;box-shadow:0 8px 24px rgba(0,0,0,.35)}'
      + '#karat-lang button{min-width:34px;height:30px;border:none;background:transparent;color:#cfc8b8;font:600 13px system-ui,sans-serif;border-radius:50px;cursor:pointer;padding:0 8px}'
      + '#karat-lang button.on{background:linear-gradient(120deg,#d4af37,#f5d77e);color:#1a1400}'
      + '@media(max-width:900px){#karat-lang{bottom:78px}}';
    document.head.appendChild(s);
    box.addEventListener('click', function (e) { var b = e.target.closest('button[data-l]'); if (b) setLang(b.getAttribute('data-l')); });
    document.body.appendChild(box);
    highlight();
  }

  function init() {
    buildSwitcher();
    apply();
    try {
      var mo = new MutationObserver(function () { scheduleApply(); });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
