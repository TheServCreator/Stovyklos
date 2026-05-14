# Top Stovyklos — CMS prisijungimo nustatymas

Svetainė naudoja **Sveltia CMS** (git pagrindu veikianti turinio valdymo sistema).
Turinį galima redaguoti adresu **https://topstovyklos.lt/admin/**.

Kad prisijungimas veiktų, reikia vienkartinio nustatymo: GitHub OAuth programėlės
ir nedidelio Cloudflare Worker, kuris tvarko prisijungimą. Žemiau — žingsnis po žingsnio.

> Tai reikia padaryti **vieną kartą**. Po to klientas tiesiog jungiasi per GitHub.

---

## 1. Sukurti GitHub OAuth programėlę

1. Eik į **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
   (tiesioginė nuoroda: https://github.com/settings/developers)
2. Užpildyk:
   - **Application name:** `Top Stovyklos CMS`
   - **Homepage URL:** `https://topstovyklos.lt`
   - **Authorization callback URL:** `https://topstovyklos-cms-auth.<tavo-subdomenas>.workers.dev/callback`
     *(tikslų adresą sužinosi po 2 žingsnio — kol kas įrašyk bet ką, vėliau pataisysi)*
3. Paspausk **Register application**
4. Nukopijuok **Client ID**
5. Paspausk **Generate a new client secret** ir nukopijuok **Client Secret**
   *(jis rodomas tik vieną kartą — išsaugok saugiai)*

---

## 2. Įdiegti `sveltia-cms-auth` Cloudflare Worker

Šis Worker'is yra oficialus, atvirojo kodo (autorius — Sveltia CMS kūrėjas).
Jis tarpininkauja tarp CMS ir GitHub prisijungimo.

**Lengviausias būdas — „Deploy to Cloudflare" mygtukas:**

1. Atidaryk https://github.com/sveltia/sveltia-cms-auth
2. README'e paspausk **Deploy to Cloudflare Workers** mygtuką
3. Prisijunk prie savo Cloudflare paskyros (ta pati, kur veikia `topstovyklos`)
4. Įdiegus, Cloudflare parodys Worker adresą, pvz.
   `https://sveltia-cms-auth.tavo-paskyra.workers.dev`
5. Worker nustatymuose (**Settings → Variables and Secrets**) pridėk šiuos
   **encrypted** kintamuosius:
   | Kintamasis | Reikšmė |
   |---|---|
   | `GITHUB_CLIENT_ID` | iš 1 žingsnio |
   | `GITHUB_CLIENT_SECRET` | iš 1 žingsnio |
   | `ALLOWED_DOMAINS` | `topstovyklos.lt` |
6. Grįžk į GitHub OAuth programėlę (1 žingsnis) ir pataisyk **Authorization
   callback URL** į tikrąjį: `https://<worker-adresas>/callback`

---

## 3. Įrašyti Worker adresą į CMS konfigūraciją

Faile **`public/admin/config.yml`** pakeisk eilutę:

```yaml
  base_url: https://REIKIA-PAKEISTI.workers.dev
```

į savo tikrąjį Worker adresą (be `/callback` galo), pvz.:

```yaml
  base_url: https://sveltia-cms-auth.tavo-paskyra.workers.dev
```

Commit'ink pakeitimą — Cloudflare Pages automatiškai perstatys svetainę.

---

## 4. Prisijungti

1. Eik į **https://topstovyklos.lt/admin/**
2. Paspausk **Sign in with GitHub**
3. Patvirtink prieigą
4. Pamatysi „Stovyklos" ir „Svetainės turinys" — ten redaguojami
   prekės ženklai, miestai, stovyklų datos, nuotraukos, tekstai ir kt.

Kiekvienas išsaugojimas sukuria git commit'ą ir per 1–2 minutes
svetainė atsinaujina automatiškai.

---

## 5. Pridėti klientą kaip redaktorių (su jo paties GitHub paskyra)

Klientui **nereikia** jūsų GitHub paskyros. Sveltia CMS leidžia prisijungti
bet kuriam GitHub naudotojui, turinčiam **rašymo teisę** šiame repozitorijuje.
OAuth programėlė (1 žingsnis) yra bendra — ji nepririšta prie konkretaus žmogaus.

Žingsniai:

1. Klientas susikuria nemokamą **GitHub paskyrą** (https://github.com/signup),
   jei dar neturi.
2. Repozitorijaus savininkas eina į
   **GitHub → `gaurilgustas284-wq/Stovyklos` → Settings → Collaborators →
   Add people**, įveda kliento GitHub vardą ir suteikia **Write** rolę.
3. Klientas priima pakvietimą (gauna jį el. paštu arba
   github.com/notifications).
4. Klientas eina į **https://topstovyklos.lt/admin/**, jungiasi **savo**
   GitHub paskyra — viskas.

Pastabos:
- Kiekvienas pakeitimas bus pažymėtas kliento GitHub vardu (aišku, kas ką keitė).
- Norint atimti prieigą — tiesiog pašalink jį iš Collaborators sąrašo.
- Galima pridėti kelis redaktorius tuo pačiu būdu.
- `Write` rolė reiškia, kad klientas techniškai gali matyti visą repozitoriją
  GitHub'e, bet praktiškai jis naudosis tik /admin/ sąsaja.

---

## Testavimas lokaliai (nebūtina, bet patogu)

Sveltia CMS lokaliai veikia **be jokio proxy serverio** — naudoja naršyklės
File System Access API ir rašo tiesiai į failus diske.

**Reikia Chromium naršyklės** (Chrome, Edge arba Brave — Firefox / Safari
File System Access API nepalaiko).

1. Paleisk svetainę:
   ```bash
   npm run dev
   ```
2. Chrome arba Edge naršyklėje atidaryk **http://localhost:5173/admin/index.html**
3. Paspausk **„Work with Local Repository"** ir pasirink projekto aplanką
   (`...\newone\Stovyklos`)
4. Redaguok turinį — pakeitimai rašomi tiesiai į `src/data/camps.json`
5. Peržiūrėk http://localhost:5173/
6. Kai patenkintas — `git add`, `git commit`, `git push` įprastai

Prisijungimo (GitHub OAuth) lokaliam testavimui **nereikia** — jis būtinas
tik produkcijoje (topstovyklos.lt/admin/).

---

## Ką galima redaguoti dabar

**Šiame etape (camps-first):** visos stovyklų datos — prekės ženklai, miestai
su adresais, ir kiekviena stovyklos data (programa + data pagal stovyklą ir
miestą). Tai tas pats sąrašas, kuris maitina registracijos formos
išskleidžiamuosius meniu.

**Vėlesni etapai:** karuselių nuotraukos, logotipai, tekstai, akcijos langas —
juos galima pridėti į `config.yml` kaip atskiras kolekcijas.
