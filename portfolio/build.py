# Génère index.html (site autonome pour Vercel) à partir de src.html.
import base64, pathlib
d = pathlib.Path(__file__).parent
s = (d / 'src.html').read_text()
photo = 'data:image/jpeg;base64,' + base64.b64encode((d / 'photo.jpg').read_bytes()).decode()
s = s.replace('__PHOTO__', photo)
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
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%234a3b3c'/%3E%3Ctext x='32' y='41' font-size='24' font-family='Arial' font-weight='700' text-anchor='middle' fill='%23d9b878'%3EEY%3C/text%3E%3C/svg%3E">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
'''
title_end = s.index('</title>') + len('</title>')
style_end = s.index('</style>') + len('</style>')
s = head + s[:style_end] + '\n</head>\n<body>\n' + s[style_end:] + '\n</body>\n</html>\n'
(d / 'index.html').write_text(s)
print('ok')
