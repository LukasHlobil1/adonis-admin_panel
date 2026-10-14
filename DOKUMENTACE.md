# Dokumentace: Správa uživatelů v AdonisJS

## 1. Zadání a výsledek

Cílem bylo vytvořit funkční administraci uživatelů ve frameworku **AdonisJS** s databází **SQLite**, kód průběžně verzovat v Gitu a zhodnotit práci se systémem.

Výsledkem je webová aplikace, ve které:

- se uživatelé registrují a přihlašují,
- administrátor v sekci **Uživatelé** vidí seznam všech účtů s vyhledáváním, filtry, řazením a stránkováním,
- administrátor může uživatele **vytvořit, upravit, zablokovat/odblokovat a smazat** a měnit jim **roli** (admin / uživatel),
- každý uživatel si v **profilu** upraví jméno, e-mail a heslo,
- přehled (dashboard) ukazuje administrátorovi statistiky.

Návod ke spuštění je v [README.md](README.md).

## 2. Použité technologie

| Vrstva | Použité řešení | Poznámka |
|---|---|---|
| Framework | AdonisJS 7.5 | aktuální verze z roku 2026, vyžaduje Node.js 24 |
| Jazyk | TypeScript | nastavený hned po založení projektu |
| Databáze | SQLite přes `better-sqlite3` | jeden soubor `tmp/db.sqlite3`, žádný databázový server |
| ORM | Lucid | Active Record, migrace, seedery |
| Validace | VineJS | součást frameworku |
| Autentizace | `@adonisjs/auth` | přihlášení přes session (cookie) |
| Šablony | Edge + Alpine.js | serverové vykreslování HTML |
| Testy | Japa | testovací framework od autorů AdonisJS |

Projekt jsem založil z oficiální šablony **Hypermedia Starter Kit** (`npm init adonisjs@latest`). Ta už obsahuje registraci, přihlášení, SQLite a sadu komponent pro formuláře, takže jsem mohl začít rovnou administrací.

## 3. Jak jsem postupoval

Vývoj je rozdělený do commitů v Gitu, každý odpovídá jednomu kroku:

1. **Založení projektu** ze startovací šablony.
2. **Datová vrstva** – migrace přidala do tabulky `users` sloupce `role`, `is_active` a `last_login_at`; seeder vytvoří administrátora a ukázkové uživatele.
3. **Backend administrace** – controller `Admin/UsersController` s akcemi `index`, `create`, `store`, `edit`, `update`, `toggleStatus` a `destroy`, validátory VineJS a dva middleware (`admin` a `activeUser`).
4. **Šablony** – seznam s tabulkou a filtry, formulář sdílený pro vytvoření i úpravu, dashboard a profil.
5. **Testy** – funkční testy pokrývají oprávnění, vytvoření, úpravu, blokaci a mazání.
6. **Dokumentace.**

### Ukázky kódu

Routy administrace jsou na jednom místě a chráněné řetězcem middleware:

```ts
router
  .group(() => {
    router.get('users', [controllers.admin.Users, 'index']).as('admin.users.index')
    router.post('users', [controllers.admin.Users, 'store']).as('admin.users.store')
    router.put('users/:id', [controllers.admin.Users, 'update']).as('admin.users.update')
    router.delete('users/:id', [controllers.admin.Users, 'destroy']).as('admin.users.destroy')
    // ...
  })
  .prefix('admin')
  .use([middleware.auth(), middleware.activeUser(), middleware.admin()])
```

Validace úpravy uživatele – e-mail musí být unikátní, ale nesmí kolidovat sám se sebou:

```ts
export const adminUpdateUserValidator = vine.withMetaData<{ userId: number }>().create({
  fullName: vine.string().trim().maxLength(100).nullable(),
  email: vine.string().trim().email().unique({
    table: 'users',
    column: 'email',
    filter: (query, _value, field) => {
      query.whereNot('id', field.meta.userId)
    },
  }),
  role: vine.enum(['admin', 'user']),
  isActive: vine.boolean().optional(),
  password: vine.string().minLength(8).maxLength(32).nullable(),
})
```

Middleware, který pustí do administrace jen administrátora:

```ts
export default class AdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (!ctx.auth.user?.isAdmin) {
      ctx.session.flash('error', 'Do administrace mají přístup pouze administrátoři.')
      return ctx.response.redirect().toRoute('dashboard')
    }
    return next()
  }
}
```

## 4. Dojmy z práce

### Co mě příjemně překvapilo

**Všechno potřebné je hned k dispozici.** Přihlášení, hashování hesel, ochrana proti CSRF, sessions, validace i ORM fungovaly od první minuty. Nemusel jsem vybírat a propojovat desítky knihoven, jak by to bylo u Expressu.

**Jasná struktura projektu.** Controllery, modely, validátory a middleware mají svou složku a je hned vidět, kam co patří. Po Laravelu je struktura skoro totožná, takže orientace byla rychlá.

**Validace přes VineJS je čitelná.** Pravidla se píšou řetězením metod a chyby se automaticky vrátí do formuláře včetně původně vyplněných hodnot. Pravidlo `unique()` se samo dotáže databáze.

**Routy na jednom místě.** V souboru `start/routes.ts` je přehledně vidět celá aplikace – jaké URL existují, jaký mají middleware a který controller je obsluhuje.

**SQLite bez práce.** Databáze je jeden soubor, není potřeba instalovat ani spouštět databázový server. Pro školní projekt nebo prototyp je to ideální.

**TypeScript všude.** Editor napovídá názvy sloupců modelu, metody query builderu i data z validátoru. Překlep v názvu sloupce odhalí kompilátor ještě před spuštěním.

**Testy jsou součástí frameworku.** Testovací klient umí přihlásit uživatele jedním voláním `loginAs(user)` a každý test běží v transakci, která se na konci vrátí, takže se testy navzájem neovlivňují.

### Na co jsem narazil

- **Verze 7 vyžaduje Node.js 24.** Se starší verzí Node.js projekt nejde spustit, je potřeba nejdřív aktualizovat.
- **Generované soubory.** Sloupce modelu se ve verzi 7 negenerují ručně, ale automaticky do `database/schema.ts` při spuštění migrací. Podobně se generuje seznam controllerů a typy rout ve složce `.adonisjs`. Je to pohodlné, ale chvíli trvá pochopit, proč se soubor sám mění a že se nemá upravovat ručně.
- **SQLite a boolean.** SQLite nemá datový typ boolean a ukládá `0`/`1`. V modelu jsem musel přidat převod (`consume: (value) => Boolean(value)`), aby `isActive` bylo skutečně `true`/`false`.
- **Šablony Edge mají svá pravidla.** Tagy jako `@include` nebo `@if` musí začínat na novém řádku, nejde je napsat doprostřed HTML (`<td>@include(...)</td>` nefunguje). Komponenty a sloty se používají jinak než v Blade.
- **Formuláře a metody PUT/DELETE.** HTML formulář umí jen GET a POST. AdonisJS to řeší parametrem `_method` v URL; komponenta `@form` ho doplní automaticky, ale musí být zapnuté `allowMethodSpoofing`.
- **Menší komunita.** Na řadu otázek jsem nenašel odpověď na Stack Overflow a musel jsem číst přímo dokumentaci nebo zdrojový kód balíčků. Dokumentace je ale kvalitní a návodů pro verzi 7 přibývá.
- **Chybí hotové prvky, které má Laravel.** Například stránkování v šabloně jsem si musel vykreslit sám, Laravel má hotové `{{ $users->links() }}`. Pro oprávnění existuje balíček Bouncer, ale pro dvě role mi stačil vlastní middleware.

## 5. Výhody a nevýhody AdonisJS

### Výhody

| Výhoda | Proč je důležitá |
|---|---|
| Batteries included | autentizace, ORM, validace, mail, testy – vše oficiální a vzájemně sladěné |
| TypeScript od základu | méně chyb, napovídání v editoru, typově bezpečné routy a validace |
| Struktura a konvence | v týmu se nemusí řešit architektura, nový vývojář se rychle zorientuje |
| Jeden jazyk pro frontend i backend | JavaScript/TypeScript na obou stranách |
| Výkon Node.js | asynchronní zpracování, vhodné pro API a real-time aplikace |
| Kvalitní dokumentace | přehledná, s příklady a oficiálním tutoriálem |
| Vestavěné testování | Japa s pluginy pro HTTP, prohlížeč i databázi |
| SQLite, PostgreSQL, MySQL, MSSQL | změna databáze jen v konfiguraci |

### Nevýhody

| Nevýhoda | Dopad |
|---|---|
| Menší komunita | méně návodů, odpovědí a hotových balíčků třetích stran |
| Těžší hledání vývojářů | AdonisJS zná méně lidí než Express, NestJS nebo Laravel |
| Velké změny mezi verzemi | návody pro verzi 5 nebo 6 často nefungují ve verzi 7 |
| Vyšší nároky na prostředí | Node.js 24, nativní kompilace `better-sqlite3` |
| Méně „pohodlíček“ než Laravel | chybí např. hotové stránkování v šablonách nebo admin panel typu Filament |
| Hosting | Node.js aplikace potřebuje běžící proces, nelze ji nahrát na levný PHP webhosting |

## 6. Srovnání s Laravelem

AdonisJS se Laravelem otevřeně inspiruje, proto je srovnání nejzajímavější právě s ním. Oba jsou MVC frameworky „s bateriemi“, liší se hlavně jazykem a ekosystémem.

### Přehledová tabulka

| Kritérium | AdonisJS 7 | Laravel 13 |
|---|---|---|
| Jazyk | TypeScript (Node.js) | PHP |
| Architektura | MVC | MVC |
| ORM | Lucid (Active Record) | Eloquent (Active Record) |
| Šablony | Edge | Blade |
| Validace | VineJS | Validator / Form Requests |
| CLI | `node ace` | `php artisan` |
| Autentizace | `@adonisjs/auth` | starter kity, Fortify, Sanctum |
| Oprávnění | Bouncer | Gates a Policies (v jádře) |
| Testy | Japa | PHPUnit / Pest |
| Frontend SPA | Inertia (React, Vue, Svelte) | Inertia, Livewire |
| Admin panel | není oficiální | Filament, Nova |
| Typová kontrola | ano, staticky při překladu | jen částečně (PHP typy, PHPStan) |
| Velikost komunity | menší | velmi velká |
| Hosting | Node.js server / kontejner | i levný sdílený PHP hosting |

### Stejná úloha v obou frameworcích

**Routy**

```ts
// AdonisJS – start/routes.ts
router.get('users', [controllers.admin.Users, 'index']).as('admin.users.index')
router.delete('users/:id', [controllers.admin.Users, 'destroy']).as('admin.users.destroy')
```

```php
// Laravel – routes/web.php
Route::get('users', [UserController::class, 'index'])->name('admin.users.index');
Route::delete('users/{user}', [UserController::class, 'destroy'])->name('admin.users.destroy');
```

**Migrace**

```ts
// AdonisJS
this.schema.alterTable('users', (table) => {
  table.string('role', 20).notNullable().defaultTo('user')
  table.boolean('is_active').notNullable().defaultTo(true)
})
```

```php
// Laravel
Schema::table('users', function (Blueprint $table) {
    $table->string('role', 20)->default('user');
    $table->boolean('is_active')->default(true);
});
```

**Validace**

```ts
// AdonisJS
const payload = await request.validateUsing(adminCreateUserValidator)
```

```php
// Laravel
$payload = $request->validate([
    'email' => 'required|email|unique:users,email',
    'role'  => 'required|in:admin,user',
]);
```

**Dotaz se stránkováním**

```ts
// AdonisJS
const users = await User.query().whereLike('email', `%${search}%`).paginate(page, 10)
```

```php
// Laravel
$users = User::where('email', 'like', "%{$search}%")->paginate(10);
```

Kód je si velmi podobný. Kdo umí Laravel, naučí se AdonisJS za pár dní.

### Hlavní rozdíly, které jsem pocítil

1. **Typová bezpečnost.** V AdonisJS editor ví, jaký tvar mají data po validaci a jaké sloupce má model. V Laravelu jsou data z `$request->validate()` obyčejné pole a překlep v klíči se projeví až za běhu.
2. **Laravel má víc hotových věcí.** Stránkování v šabloně (`links()`), oprávnění (Policies), notifikace, administraci (Filament) – v AdonisJS je potřeba víc dopsat ručně nebo hledat balíček.
3. **Komunita a návody.** Na téměř každý problém v Laravelu existuje návod, video nebo balíček. U AdonisJS jsem častěji četl dokumentaci a zdrojový kód.
4. **Asynchronní kód.** V AdonisJS se všude píše `await` (dotazy do databáze, validace), protože Node.js je asynchronní. V Laravelu je kód synchronní, což je pro začátečníka jednodušší.
5. **Nasazení.** Laravel lze nahrát na téměř jakýkoli webhosting s PHP. AdonisJS potřebuje server, kde běží Node.js proces (VPS, Docker, Railway, Render apod.).

### Krátce i ostatní frameworky

- **Express** – minimalistický; pro tuto úlohu bych musel sám vybrat a propojit ORM (Prisma), validaci (Zod), sessions, hashování hesel, CSRF ochranu a šablony. AdonisJS ušetřil velkou část této práce.
- **NestJS** – také TypeScript, ale postavený na modulech a dekorátorech po vzoru Angularu. Hodí se spíš pro velká API a mikroslužby; pro jednoduchou administraci s HTML šablonami je zbytečně složitý a nemá vlastní ORM ani šablony.
- **Django (Python)** – má jako jediný z uvedených **hotový admin panel**, takže by správa uživatelů byla téměř bez práce. Za cenu menší kontroly nad vzhledem a jiného jazyka.

## 7. Závěr

AdonisJS se mi pro tento typ aplikace osvědčil. Za krátkou dobu vznikla funkční administrace s přihlášením, rolemi, validací, ochranou proti CSRF a testy, aniž bych musel řešit, jak spojit různé knihovny. Největší výhodou je kombinace **pevné struktury (jako Laravel)** a **TypeScriptu (jako NestJS)**.

Laravel bych zvolil tam, kde rozhoduje velký ekosystém, hotové admin panely nebo levný hosting. AdonisJS je dobrá volba pro tým, který chce psát celou aplikaci v TypeScriptu a ocení typovou bezpečnost a hotová řešení v jednom balíku.

## Zdroje

- [AdonisJS – oficiální web](https://adonisjs.com)
- [Dokumentace AdonisJS](https://docs.adonisjs.com)
- [AdonisJS v7 – oznámení vydání](https://adonisjs.com/blog/v7)
- [Startovací šablony AdonisJS](https://github.com/adonisjs/starter-kits)
- [Dokumentace VineJS](https://vinejs.dev)
- [Dokumentace Laravel](https://laravel.com/docs)
