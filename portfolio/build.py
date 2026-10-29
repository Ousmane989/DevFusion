# Génère index.html (site autonome pour Vercel) à partir de src.html.
import base64, pathlib
d = pathlib.Path(__file__).parent
s = (d / 'src.html').read_text()
photo = 'data:image/jpeg;base64,' + base64.b64encode((d / 'photo.jpg').read_bytes()).decode()
s = s.replace('__PHOTO__', photo)
for key, name in (('__LOGONAV__', 'logo-nav.jpg'), ('__LOGOFULL__', 'logo-full.jpg')):
    s = s.replace(key, 'data:image/jpeg;base64,' + base64.b64encode((d / name).read_bytes()).decode())
# portfolio.html : version Artifact (sans <head>)
(d / 'portfolio.html').write_text(s)
# index.html : site complet, avec téléchargement du CV en PDF
s = s.replace('<a class="btn primary magnetic" href="#contact">Demander la version PDF',
              '<a class="btn primary magnetic" href="CV_El_Yonel_Ousmane_Niang.pdf" download>Télécharger le CV (PDF)')
head = '''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta property="og:title" content="El Yonel Ousmane Niang · Développeur logiciel">
<meta property="og:description" content="Portfolio, projets et CV d'El Yonel Ousmane Niang, développeur logiciel à Nouakchott.">
<meta property="og:type" content="website">
<link rel="icon" type="image/png" href="logo-mark.png">
<link rel="apple-touch-icon" href="logo-mark.png">
<meta property="og:image" content="https://ousmane-niang-portfolio.vercel.app/logo.png">
<meta name="theme-color" content="#040303">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
'''
title_end = s.index('</title>') + len('</title>')
style_end = s.index('</style>') + len('</style>')
s = head + s[:style_end] + '\n</head>\n<body>\n' + s[style_end:] + '\n</body>\n</html>\n'
(d / 'index.html').write_text(s)
print('ok')
