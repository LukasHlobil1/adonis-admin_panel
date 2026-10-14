# Správa uživatelů v AdonisJS

Webová aplikace pro administraci uživatelů postavená na frameworku **[AdonisJS 7](https://adonisjs.com)** s databází **SQLite**.

Vychází z oficiální startovací šablony *Hypermedia Starter Kit* (serverové vykreslování šablon Edge + Alpine.js), na kterou navazuje vlastní administrací uživatelů.

> Dokumentace s dojmy z práce, výhodami a nevýhodami a srovnáním s Laravelem je v souboru **[DOKUMENTACE.md](DOKUMENTACE.md)**.

## Funkce

**Administrace uživatelů** (`/admin/users`, jen pro administrátory)

- výpis uživatelů se stránkováním (10 na stránku)
- vyhledávání podle jména a e-mailu, filtr podle role a stavu účtu
- řazení podle jména, role, data registrace a posledního přihlášení
- vytvoření uživatele (jméno, e-mail, role, stav, heslo)
- úprava uživatele včetně volitelné změny hesla
- zablokování / odblokování účtu jedním kliknutím
- smazání uživatele s potvrzením

**Ochrany a pravidla**

- dvě role: `admin` a `user`; do administrace se dostane jen admin (middleware `admin`)
- zablokovaný uživatel se nemůže přihlásit; pokud je zrovna přihlášený, je při dalším požadavku odhlášen (middleware `activeUser`)
- administrátor nemůže smazat, zablokovat ani degradovat sám sebe
- v systému vždy zůstane alespoň jeden aktivní administrátor
- e-mail musí být unikátní, hesla se ukládají jako hash (scrypt)
- ochrana proti CSRF útokům u všech formulářů
- první uživatel zaregistrovaný do prázdné databáze se automaticky stane administrátorem

**Ostatní**

- přehled (dashboard) se statistikami pro administrátory
- stránka „Můj profil“ pro změnu jména, e-mailu a hesla
- ukládání času posledního přihlášení
- české rozhraní i chybové hlášky validace
- světlý a tmavý režim
- funkční testy (Japa)

## Technologie

| Oblast | Řešení |
|---|---|
| Framework | AdonisJS 7 (TypeScript, Node.js 24+) |
| Databáze | SQLite (`better-sqlite3`), soubor `tmp/db.sqlite3` |
| ORM a migrace | Lucid |
| Validace | VineJS |
| Autentizace | `@adonisjs/auth` – session guard |
| Šablony | Edge + Alpine.js, styly v čistém CSS |
| Testy | Japa (`@japa/api-client`) |

## Spuštění

Požadavky: **Node.js 24 nebo novější** a npm.

```bash
# 1. stažení projektu
git clone https://github.com/<uzivatel>/adonisjs-user-admin.git
cd adonisjs-user-admin

# 2. instalace závislostí
npm install

# 3. konfigurace prostředí
cp .env.example .env
node ace generate:key

# 4. vytvoření databáze a naplnění ukázkovými daty
node ace migration:run
node ace db:seed

# 5. spuštění vývojového serveru
npm run dev
```

Aplikace poběží na <http://localhost:3333>.

### Přihlašovací údaje z ukázkových dat

| Role | E-mail | Heslo |
|---|---|---|
| Administrátor | `admin@example.com` | `admin1234` |
| Administrátor | `eva@example.com` | `heslo1234` |
| Uživatel | `jana@example.com` | `heslo1234` |
| Uživatel | `petr@example.com` | `heslo1234` |
| Zablokovaný | `karel@example.com` | `heslo1234` |

Bez spuštění seederu se lze zaregistrovat na `/signup` – první registrovaný uživatel dostane roli administrátora.

### Další příkazy

```bash
npm test                    # spuštění testů (používají vlastní databázi tmp/test.sqlite3)
npm run typecheck           # kontrola typů TypeScriptu
npm run build && npm start  # produkční sestavení a spuštění
node ace migration:fresh --seed   # smazání a znovuvytvoření databáze s daty
```

## Struktura projektu

Nejdůležitější soubory, které byly k šabloně přidány nebo upraveny:

```
app/
  controllers/
    admin/users_controller.ts   # CRUD administrace uživatelů
    dashboard_controller.ts     # přehled se statistikami
    profile_controller.ts       # vlastní profil a změna hesla
    session_controller.ts       # přihlášení (kontrola blokace, poslední přihlášení)
    new_account_controller.ts   # registrace (první uživatel = admin)
  middleware/
    admin_middleware.ts         # přístup jen pro adminy
    active_user_middleware.ts   # odhlášení zablokovaných
  models/user.ts                # model uživatele, role
  services/user_stats.ts        # počty uživatelů pro statistiky
  validators/user.ts            # validační schémata VineJS
database/
  migrations/                   # tabulka users + sloupce role, is_active, last_login_at
  seeders/user_seeder.ts        # ukázkoví uživatelé
  schema.ts                     # sloupce modelu (generuje se při migraci)
resources/
  views/pages/admin/users/      # seznam, vytvoření, úprava
  views/pages/profile/          # profil
  views/partials/admin/         # sdílené části (formulář, štítky)
  css/app.css                   # styly
start/
  routes.ts                     # routy
  kernel.ts                     # registrace middleware
  validator.ts                  # české hlášky validace
tests/functional/               # funkční testy
```

## Přehled rout

| Metoda | URL | Popis |
|---|---|---|
| GET | `/login`, `/signup` | přihlášení, registrace |
| POST | `/logout` | odhlášení |
| GET | `/dashboard` | přehled |
| GET / PUT | `/profile` | profil |
| PUT | `/profile/password` | změna hesla |
| GET | `/admin/users` | seznam uživatelů |
| GET / POST | `/admin/users/create`, `/admin/users` | nový uživatel |
| GET / PUT | `/admin/users/:id/edit`, `/admin/users/:id` | úprava |
| PATCH | `/admin/users/:id/status` | blokace / odblokování |
| DELETE | `/admin/users/:id` | smazání |
