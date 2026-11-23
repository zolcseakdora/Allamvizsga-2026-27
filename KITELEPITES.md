# MMDSZ – kitelepítés (éles)

Firebase-projekt: `allamvizsga-47738` (a `.firebaserc` már erre mutat).
Minden parancsot a repó gyökeréből futtass (PowerShell vagy Git Bash), kivéve ahol más mappa szerepel.

## 0. Egyszeri előfeltételek (Firebase Console)

- [ ] **Blaze (pay-as-you-go) csomag** a projekten – Cloud Functions és az új Storage bucket csak ezzel működik.
- [ ] **Authentication → E-mail/jelszó** bejelentkezés engedélyezve.
- [ ] **Storage** létrehozva (bucket: `allamvizsga-47738.firebasestorage.app`).
- [ ] **Trigger Email bővítmény** (`firestore-send-email`) telepítve, a figyelt gyűjtemény: `mail`, SMTP beállítva. Enélkül a meghívó e-mailek nem mennek ki.
- [ ] Van legalább egy **főszervező** profil: `users/{uid}` dokumentumban `role: "Főszervező"` (és `accountStatus: "active"`, ha van ilyen mező).

## 1. Eszközök és bejelentkezés

```bash
npm install -g firebase-tools
firebase login
firebase use allamvizsga-47738
```

## 2. Függőségek telepítése

```bash
cd MMDSZApp_Regi && npm ci && cd ..
cd functions && npm ci && npm run build && cd ..
cd MMDSZApp_Regi/functions && npm ci && cd ../..
```

## 3. Környezeti változó a meghívókhoz

Másold le a `functions/.env.example` fájlt `functions/.env` néven (nincs a gitben), és ellenőrizd a címet:

```
MMDSZ_APP_URL=https://mmdszapp-regi.expo.app
```

## 4. Ellenőrzés kitelepítés előtt (kb. 5 perc, Java 21 kell)

```bash
cd MMDSZApp_Regi
npx tsc --noEmit
node --test tests/registration-functions.test.cjs tests/invite-security.test.cjs tests/registration-review.test.cjs
npm run test:rules
cd functions
firebase --config ../../firebase.json emulators:exec --only firestore,storage --project demo-event-admin-validation "node --test test/*.test.js"
cd ../../functions
firebase --config ../firebase.json emulators:exec --only auth,firestore,functions --project demo-mmdsz-shared-code "node tests/shared-captain-code.test.cjs"
cd ..
```

Ugyanezt a GitHub Actions is lefuttatja minden `release/**` és `fix/**` ágra való push után – ha ott zöld, mehet.

## 5. Backend kitelepítése

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```

Ez telepíti a Firestore- és Storage-szabályokat, az indexeket, és mindkét függvénycsomagot
(`default` = regisztráció/meghívók, `events` = FebruTális/események), mindkettőt `europe-west1` régióba.
Ha a CLI régi (`us-central1`) függvények törlését kérdezi, válaszolj **igen**-nel.

## 6. Webes alkalmazás kitelepítése (EAS Hosting)

```bash
cd MMDSZApp_Regi
npx expo export --platform web
npx eas-cli@latest login
npx eas-cli@latest deploy --prod
```

## 7. Gyors füstteszt élesben

1. Főszervezőként bejelentkezés → Admin → közös kapitányi kód generálása.
2. Új fiók „Regisztráció csapatkapitányként” a kóddal → e-mail megerősítés → igazolás feltöltése.
3. Főszervezőként Regisztráltak → jóváhagyás → a csapat létrejön.
4. Admin → Meghívók → szervező meghívása → megjön az e-mail.
5. Eseményváltó FebruTálisra → meglévő fiókkal FebruTális-jelentkezés → Regisztráltak → kapitány kijelölése.
6. Galéria: kép feltöltése és törlése.

## Megjegyzés: események adatai

Az alkalmazás a 2027-es Diáknapok és FebruTális kiírást a beépített JSON-ból (`MMDSZApp_Regi/data/events`) is betölti,
a napokat és programokat pedig a főszervező az Admin felületen tudja szerkeszteni. Kitelepítéshez nincs szükség adatimportra.
