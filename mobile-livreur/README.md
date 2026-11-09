# Karat Livreur — application Android des livreurs

Application Capacitor qui ouvre l'espace livreur de Karat Logistique
(`https://karat-logistique.netlify.app/livreur/coursier`) et partage la position
du livreur **même téléphone verrouillé** pendant son service (service de premier
plan avec la notification « Karat Livreur — suivi actif »,
plugin `@capacitor-community/background-geolocation`). La position est envoyée par
le réseau natif (`CapacitorHttp`) avec un jeton (`/api/livreur/courier/device-token`).

## Construire l'APK

Prérequis : Node 18+, JDK 17+, Android SDK (platform 35, build-tools 35).

```sh
npm install
npx cap sync android
cd android
KARAT_KEYSTORE=/chemin/karat-livreur.keystore KARAT_KEYSTORE_PASSWORD=... ./gradlew assembleRelease
```

L'APK signé se trouve dans `android/app/build/outputs/apk/release/app-release.apk`.
Copiez-le dans `public/livreur/app/karat-livreur.apk` pour le publier sur le site.

La clé de signature n'est **pas** dans le dépôt (public) : le propriétaire de
Karat Logistique la conserve (archive `karat-livreur-cle.zip` : keystore, mot de
passe, alias `karat`). Toutes les mises à jour doivent être signées avec cette
même clé, sinon Android refuse de les installer par-dessus.
Pensez à augmenter `versionCode` dans `android/app/build.gradle` à chaque version.
