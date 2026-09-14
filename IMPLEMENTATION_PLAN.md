# Personal Tracker & Backend for Sonit Portfolio

Add a Firebase-backed personal tracker with admin authentication, gaming progress integration (PlayStation & Steam), bucket list / life goals tracking, career growth tracker, credit card collection, and dedicated public topic pages (`/travel`, `/gaming`, `/career`, `/credit-cards`, etc.) — all admin-curated with DDoS/billing protections.

---

## Decisions (Resolved)

| Question | Decision |
|---|---|
| Auth method | Firebase Email/Password (single admin account) |
| Gaming platforms | **Both** PlayStation (psn-api) + Steam (Web API) |
| Bucket list layout | Separate sections per category (dynamic via `config/categories`) |
| Bucket list gamification | **ACTIVE** — Gamified tracking: XP per item, Levels & Ranks, Badges/Achievements, Streaks, Confetti/Celebration animations, and an interactive Gamified Progress Dashboard |
| Admin overview dashboard | **Gamified Progress Dashboard** — Hero Level card, XP progress bar, Category completion rings, Active Quests log, Badges showcase, and Activity timeline |
| Firebase Storage | **PENDING / DEFERRED** — Storage setup deferred until Blaze upgrade. Support direct image URLs with instant preview in the meantime; direct upload architecture preserved for post-MVP upgrade |
| Public visibility | Private by default. Admin publishes items to **dedicated public route pages** (`/travel`, `/gaming`, `/career`, `/credit-cards`, etc.) — each route shows only approved content |
| Public route architecture | **Dedicated pages per topic** — `/travel`, `/gaming`, `/career`, `/credit-cards`, etc. Each renders from `publicPages/{slug}` Firestore collection. Admin controls what appears on each page |
| Credit card collection | **NEW** — Track credit cards owned/applied for, with card design images, benefits, rewards, and "wallet showcase" |
| Admin entry point | Secret — hidden gesture or URL, accessible on mobile |
| Gaming sync | Monthly scheduled Cloud Function cron |
| Primary admin device | **Mobile phone** — admin UI must be mobile-first |
| Career tracking | **NEW** — Career Growth Tracker section for learning goals and skill roadmaps |

---

## Firebase Credentials

> [!NOTE]
> These client-side keys are safe in source code — security is enforced by Firestore rules and Auth, not by hiding these values. API keys for Steam/PSN will go in `functions/.env` (gitignored).

| Key | Value |
|---|---|
| **Admin UID** | `R4yb7LzRJfhLQ31AQF6G6px2Eg73` |
| **Project ID** | `sonitmehrotra-portfolio` |
| **App ID** | `1:537969629359:web:f2e136b806a709a8d31c5a` |
| **Auth Domain** | `sonitmehrotra-portfolio.firebaseapp.com` |
| **Storage Bucket** | `sonitmehrotra-portfolio.firebasestorage.app` |
| **Messaging Sender ID** | `537969629359` |
| **API Key** | `AIzaSyC9s75ux3Hn0bbg9unjPxOHTlhqscCk9yE` |

```js
// Firebase config (for src/lib/firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyC9s75ux3Hn0bbg9unjPxOHTlhqscCk9yE",
  authDomain: "sonitmehrotra-portfolio.firebaseapp.com",
  projectId: "sonitmehrotra-portfolio",
  storageBucket: "sonitmehrotra-portfolio.firebasestorage.app",
  messagingSenderId: "537969629359",
  appId: "1:537969629359:web:f2e136b806a709a8d31c5a"
};
```

---

## User Review Required

> [!NOTE]
> **Firebase Storage — Deferred to Pending Stage**
> Since Firebase Storage requires an account/plan upgrade, direct file upload has been moved to the **Pending Stage** (deferred).
> - **Current behavior:** All items (Bucket List, Career Goals, Public Showcase) support direct **image URLs** (e.g., Unsplash, Cloudinary, Imgur, or direct web links) with instant preview and fallback placeholder icons.
> - **Future seamless upgrade:** `storage.rules`, helper service, and `ImageUpload` component are fully mapped out and ready to deploy as soon as the project is upgraded.

> [!IMPORTANT]
> **Gaming API Credentials Needed**
> - **Steam:** You'll need a Steam Web API key (free, get it at [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)) and your Steam ID (64-bit).
> - **PlayStation:** The `psn-api` npm package requires a **PSN NPSSO token** obtained by logging into your PSN account at [store.playstation.com](https://store.playstation.com), then visiting `https://ca.account.sony.com/api/v1/ssocookie` to get the token. This token expires periodically (~60 days) and must be refreshed.

> [!WARNING]
> **Firebase Billing — Blaze Plan Required for Cloud Functions**
> Firebase Cloud Functions require the **Blaze (Pay-as-you-go)** plan. The Spark free tier does NOT support Cloud Functions. However, Blaze still includes the same free quotas:
> - Firestore: 50K reads/day, 20K writes/day, 20K deletes/day, 1 GiB storage
> - Cloud Functions: 2M invocations/month, 400K GB-seconds, 200K GHz-seconds
> - Hosting: 10 GB storage, 360 MB/day transfer
>
> Set a **billing budget alert** (e.g. $5/month) in the Google Cloud Console.

> [!CAUTION]
> **PSN Token Expiry**
> The PSN NPSSO token expires roughly every 60 days. You'll need to manually refresh it. We'll store it in Firebase environment config so it's easy to update via CLI (`firebase functions:config:set psn.npsso="NEW_TOKEN"`) without redeploying code.

---

## Proposed Architecture

```mermaid
flowchart TD
  subgraph Frontend ["Frontend (React + Vite)"]
    subgraph Public ["Public Site"]
      P0["/ — Main Portfolio (Intro / Skills / Portfolio / Work Exp / Contact)"]
      P1["/travel — Places Visited & Travel Wishlist"]
      P2["/gaming — Gaming Progress & Backlog"]
      P3["/career — Career Growth & Milestones"]
      P4["/credit-cards — Card Collection Showcase"]
      PX["/[custom-slug] — Dynamic Future Pages"]
    end
    subgraph Admin ["Secret Admin Dashboard (Mobile-First)"]
      A1["Gamified Dashboard (Level, XP, Rings, Quests, Badges)"]
      A2["Bucket List Manager (Dynamic Categories + Gamification)"]
      A3["Gaming Tracker (Steam + PSN Sync)"]
      A4["Career Growth Tracker"]
      A5["Credit Card Collection Manager"]
      A6["Public Page Builder (per-route content curation)"]
      A7["Settings & Dynamic Categories Config"]
    end
  end

  subgraph Firebase ["Firebase Services"]
    Auth["Firebase Auth (Admin Email/Password)"]
    AppCheck["App Check (DDoS / Bot Protection)"]
    Firestore[("Cloud Firestore")]
    Functions["Cloud Functions (Steam/PSN Cron & Contact)"]
    Storage["Firebase Storage [PENDING STAGE]"]
  end

  subgraph External ["External Gaming APIs"]
    Steam["Steam Web API"]
    PSN["PlayStation Network API"]
  end

  Admin -->|Full CRUD| Firestore
  Public -->|Read Approved Items| Firestore
  Admin -->|Auth| Auth
  Functions -->|Monthly Sync| Steam
  Functions -->|Monthly Sync| PSN
  Functions -->|Upsert Data| Firestore
```

---

## Proposed Changes

### 1. Firebase Setup & Configuration

#### [NEW] `firebase.json`
Firebase configuration file for Hosting, Firestore, and Cloud Functions:
- Hosting rewrites for SPA routing
- Firestore rules and indexes deployment
- Cloud Functions deployment config

#### [NEW] `firestore.rules`
Firestore security rules (see detailed rules below in the Security section).

#### [NEW] `firestore.indexes.json`
Composite indexes for queries (e.g., filtering bucket list by category + status, career goals by status).

---

### 2. Cloud Functions (Backend API)

#### [NEW] `functions/` directory

##### `functions/package.json`
Node.js project for Cloud Functions with dependencies:
- `firebase-functions`, `firebase-admin`
- `psn-api` (PlayStation Network)
- `node-fetch` or built-in fetch (for Steam Web API)

##### `functions/src/index.js`
Cloud Functions entry point exporting:

1. **`syncSteamGames`** — Scheduled (monthly cron: `0 0 1 * *`):
   - Calls Steam Web API `IPlayerService/GetOwnedGames` to fetch all owned games with playtime
   - Calls `ISteamUserStats/GetPlayerAchievements` per game for achievement progress
   - Upserts results into `gamingProgress/{steamAppId}` collection
   - Also callable on-demand by admin via HTTPS callable

2. **`syncPSNGames`** — Scheduled (monthly cron: `0 0 1 * *`):
   - Uses `psn-api` to authenticate via stored NPSSO token
   - Fetches user's title list (games) and trophy progress per title
   - Upserts results into `gamingProgress/{psnTitleId}` collection
   - Handles token refresh errors gracefully
   - Also callable on-demand by admin

3. **`submitContactMessage`** — HTTPS callable (public):
   - Validates App Check token
   - Rate-limits by IP (max 3 submissions per hour, tracked in Firestore)
   - Stores message in `contactMessages` collection

4. **`cleanupRateLimits`** — Scheduled function (daily):
   - Cleans up expired rate-limit records from Firestore

##### `functions/src/steam.js`
Steam API integration module:
- `getOwnedGames(steamId, apiKey)` → list of games with playtime
- `getAchievements(steamId, appId, apiKey)` → achievement list with unlock status
- Error handling for private profiles, rate limits

##### `functions/src/psn.js`
PSN API integration module:
- `authenticatePSN(npsso)` → access token
- `getUserTitles(accessToken, accountId)` → list of games
- `getTrophiesForTitle(accessToken, accountId, titleId)` → trophy details
- Token refresh and expiry handling

---

### 3. Frontend — Routing, Auth & Secret Entry

#### [NEW] `src/lib/firebase.js`
Firebase SDK initialization:
- Initialize Firebase App, Auth, and Firestore from environment config
- Export `auth`, `db` instances
- Initialize App Check with reCAPTCHA Enterprise provider

#### [NEW] `src/contexts/AuthContext.jsx`
React context for authentication state:
- `useAuth()` hook returning `{ user, loading, isAdmin }`
- Wraps `onAuthStateChanged` listener
- Admin check: UID matches hardcoded admin UID

#### [NEW] `src/components/ProtectedRoute/ProtectedRoute.jsx`
Route guard component:
- Shows login page if not authenticated
- Redirects to public site if authenticated but not admin

#### Secret Admin Entry Point

The admin dashboard must be accessible but not discoverable by casual visitors. Implementation:

- **URL-based:** Navigate to `/admin` (or a custom secret path like `/sonit-admin`) — there will be no visible link to this URL anywhere on the public site
- **Mobile gesture (optional enhancement):** Long-press on the logo in the navbar (3+ seconds) to navigate to admin login — works naturally on touch devices
- The login page itself is a simple, minimal form — no branding that reveals what's behind it

#### [MODIFY] [App.jsx](file:///c:/Users/AWCC/Desktop/Learning/sonit-portfolio/src/App.jsx)
- Add client-side routing (`react-router-dom`)
- Public routes: `/` (existing portfolio)
- Secret routes: `/admin` → login if not authed, dashboard if authed
- Protected routes: `/admin/bucket-list`, `/admin/gaming`, `/admin/career`, `/admin/settings`
- Wrap app in `AuthProvider`
- Fetch `config/site` to determine which sections to render publicly
- Render new **"Get to Know Me Better"** section from `publicShowcase` collection

#### [MODIFY] [package.json](file:///c:/Users/AWCC/Desktop/Learning/sonit-portfolio/package.json)
- Add dependencies: `firebase`, `react-router-dom`

---

### 4. Frontend — Admin Dashboard (Mobile-First)

All admin UI components will be designed **mobile-first**: touch-friendly controls, full-width layouts on small screens, bottom navigation, large tap targets, swipe gestures where appropriate. Desktop will scale up gracefully.

#### [NEW] `src/pages/Login/Login.jsx` + `Login.css`
Admin login page:
- Email + password form (Firebase Auth `signInWithEmailAndPassword`)
- Minimal, clean design — no obvious "admin panel" branding
- Mobile-optimized input fields and button sizing
- Redirect to `/admin` on success

#### [NEW] `src/pages/Admin/AdminLayout.jsx` + `AdminLayout.css`
Admin dashboard layout:
- **Mobile:** Bottom tab navigation (Dashboard, Bucket List, Gaming, Career, Settings)
- **Desktop:** Sidebar navigation with collapsed/expanded states
- Header with user profile, current Level badge ("Lv. 3 Adventurer"), XP pill, and logout button
- Dark theme matching the portfolio with sleek glassmorphism accents

---

#### [NEW] `src/pages/Admin/Dashboard/Dashboard.jsx` + `Dashboard.css`
**Gamified Progress Dashboard (Primary Admin Hub):**
- **Hero Level Card:**
  - Dynamic Level number & Rank title (e.g., "Level 4 • Pathfinder")
  - Total XP counter with animated progress bar towards the next level
  - Active Streak indicator (consecutive months with completed goals)
  - Completion velocity (items completed this month vs previous month)
- **Category Progress Rings:**
  - Interactive circular progress gauges for each category (Places, Gaming, Growth, plus custom categories)
  - Displays completed vs total count and completion percentage
- **Active Quests (Quest Log):**
  - Highlights top 3 in-progress items prioritized by difficulty/XP
  - One-click completion trigger directly from the dashboard
- **Badges & Achievements Showcase:**
  - Grid of unlockable milestone badges:
    - 🌟 *First Step:* Complete 1st bucket list item
    - 🗺️ *Globetrotter:* Complete 5 travel destinations
    - 🎮 *Backlog Slayer:* Complete 5 gaming backlog titles
    - 🌱 *Self Master:* Complete 5 personal growth goals
    - ⚡ *High Achiever:* Complete 3 High or Epic priority goals
    - 💎 *Century Club:* Cross 1,000 total XP
    - 🔥 *Streak Master:* Keep a 3-month completion streak
    - 💳 *Wallet Warrior:* Collect 5 credit cards
  - Glowing colored badges for unlocked achievements; sleek silhouettes with progress tips for locked ones
- **Recent Activity Timeline:**
  - Feed of recently completed items with timestamp, XP earned (+250 XP 🌟), and celebratory tags

---

#### [NEW] `src/pages/Admin/BucketList/BucketList.jsx` + `BucketList.css`
Bucket list management page with **dynamic category tabs & gamified mechanics:**

##### Gamified Item Structure & Controls:
- **Difficulty & XP Assignment:**
  - `Casual` (50 XP) | `Moderate` (100 XP) | `Challenging` (250 XP) | `Epic` (500 XP)
  - Auto-calculates XP value based on difficulty with optional custom XP override
- **Interactive Completion Experience:**
  - Checkbox triggers the gamification completion flow:
    - Instant reward animation (confetti burst via `canvas-confetti` + XP floating notification)
    - Updates item status to `completed` and records `completedAt` timestamp
    - Automatically updates `userStats/gamification` (awards XP, checks badge unlock conditions, logs recent activity)
    - Level-up modal if XP surpasses the next level threshold
- **Un-completing / Deletion Handling:**
  - Unchecking an item automatically rolls back its awarded XP and updates category counts
  - Safe delete confirmation modal with automatic XP subtraction if the deleted item was completed
- **Category Tabs (Dynamic):**
  - Reads categories from `config/categories.bucketList` (Places to Visit, Gaming Backlog, Personal Growth, etc.)
  - Filter by status: All, In Progress, Completed
  - Sort by: Priority, XP Value, Date Created, Target Date
- **Image URL Support (Direct Preview):**
  - Text input for image URL (Unsplash, Cloudinary, Imgur, direct link) with live preview thumbnail
  - *(Firebase Storage direct file upload deferred to Pending Stage)*
- **"Publish to Public" Toggle:**
  - Publishes item to `publicShowcase` collection for the public "Get to Know Me Better" section
  - Mobile-optimized card list with swipe gestures and quick-action menu

---

#### [NEW] `src/pages/Admin/Gaming/GamingTracker.jsx` + `GamingTracker.css`
Gaming progress tracker page:
- **Summary cards:** Total games, completion %, games in progress, total playtime
- **Game list:** Fetched from `gamingProgress` collection (auto-synced monthly from Steam + PSN)
- **Per-game card:** Platform icon (PS/Steam), title, cover art, playtime, achievement/trophy progress bar
- **Manual entries:** Add games from other platforms (Switch, PC Game Pass, etc.)
- **Sync controls:** "Sync Now" button for on-demand sync, last synced timestamp
- **Status management:** Move games between Not Started → In Progress → Completed → Abandoned
- **Personal notes** per game
- Mobile: card-based list, tap to expand details

---

#### [NEW] `src/pages/Admin/Career/CareerTracker.jsx` + `CareerTracker.css`
Career growth tracker — **NEW section**:
- **Skills Roadmap:** List of skills/technologies to learn
  - Fields: skill name, category (e.g., "Frontend", "System Design", "DSA", "Cloud"), proficiency level (beginner/intermediate/advanced/expert), status (not started / learning / proficient), resources/links, notes
  - Visual progress indicator per skill
- **Learning Goals:** Specific things to complete
  - Fields: title, description, priority, status, deadline, linked skills, notes
  - Examples: "Complete System Design course", "Build a project with Go", "Practice 100 LeetCode problems"
- **Career Milestones:** Track promotions, company switches, certifications
  - Fields: milestone title, type (promotion / switch / certification / achievement), date, company, notes
  - Timeline view
- **"Publish to Public"** toggle per item → share career wins on the public site under "Get to Know Me Better"
- Mobile-first: card-based layout, collapsible sections

---

#### [NEW] `src/pages/Admin/CreditCards/CreditCardTracker.jsx` + `CreditCardTracker.css`
Credit card collection manager — **NEW section**:
- **Card Gallery View:** Visual card grid with card art/design images
  - Tap to expand: card name, issuer, network (Visa/Mastercard/Amex/RuPay), card type (rewards/travel/cashback/premium), annual fee, credit limit, key benefits, joining date
- **Status Tracking:** Applied → Approved → Active → Closed
- **Rewards & Benefits Log:** Track reward points balance, cashback earned, lounge access, milestone benefits
- **Notes:** Personal notes per card (e.g., "Use for international transactions", "Fee waiver call date")
- **"Publish to Public" toggle** → publishes to `/credit-cards` public page via `publicPages/credit-cards`
- **Gamification:** Cards count towards XP (Casual/Moderate/Challenging/Epic difficulty based on card tier)
- Mobile-first: swipeable card stack or grid layout

---

#### [NEW] `src/pages/Admin/PublicPages/PublicPageBuilder.jsx` + `PublicPageBuilder.css`
Per-route public page content curation — **NEW section**:
- **Route Management:** View all available public routes (`/travel`, `/gaming`, `/career`, `/credit-cards`, custom slugs)
- **Per-Route Controls:**
  - Enable/disable the route entirely
  - Set page title, description, hero image URL, and SEO meta
  - Curate which published items appear on that page (reorder, feature/unfeature)
- **Custom Routes:** Add new public routes for future categories (e.g., `/books`, `/fitness`) without code changes
- Saves to `publicPages/{slug}` Firestore documents

---

#### [NEW] `src/pages/Admin/Settings/SiteSettings.jsx` + `SiteSettings.css`
Site configuration page:
- **Main page section toggles:** Enable/disable each section on the main portfolio page (Intro, Skills, Portfolio, Work Experience, Contact)
- **Public Routes Overview:** Quick status view of all topic routes with enable/disable toggles
- **Dynamic category management** (add/rename/remove/reorder categories for bucket list and career tracker)
- Saves to `config/site` Firestore document

---

### 5. Frontend — Public Topic Pages (Route-Based Architecture)

The public site shifts from a single-page showcase to **dedicated route pages per topic**.
Each route is a full standalone page that renders only admin-approved content for that topic.

#### Routing Structure

| Route | Page | Data Source |
|---|---|---|
| `/` | Main portfolio (existing) | Static + `config/site` |
| `/travel` | Places visited & travel wishlist | `publicPages/travel` + linked `publicShowcase` items |
| `/gaming` | Gaming progress & backlog | `publicPages/gaming` + linked items |
| `/career` | Career growth & milestones | `publicPages/career` + linked items |
| `/credit-cards` | Credit card collection showcase | `publicPages/credit-cards` + linked items |
| `/[custom-slug]` | Dynamic future pages | `publicPages/{slug}` + linked items |

#### [NEW] `src/pages/Public/TopicPage/TopicPage.jsx` + `TopicPage.css`
Generic, reusable public topic page component:
- Reads route param (e.g., `travel`) and fetches `publicPages/{slug}` for page config (title, description, hero image, SEO)
- Fetches linked `publicShowcase` items filtered by `routeSlug`
- Renders: hero header with title/description/image, card grid of published items grouped by admin-defined order
- 404 fallback if route is disabled or doesn't exist
- SEO: dynamic `<title>`, `<meta description>`, Open Graph tags per page
- Fully responsive — beautiful on mobile and desktop

#### [NEW] `src/pages/Public/TopicPage/CreditCardShowcase.jsx` + `CreditCardShowcase.css`
Specialized sub-component for the `/credit-cards` route:
- Visual card gallery with card images displayed in a wallet-style fan or grid
- Hover/tap to reveal card details: issuer, network, benefits, joining date
- Optional "total cards" counter badge

#### [MODIFY] [App.jsx](file:///c:/Users/AWCC/Desktop/Learning/sonit-portfolio/src/App.jsx)
- Add `react-router-dom` routes: `/` (main portfolio), `/travel`, `/gaming`, `/career`, `/credit-cards`, `/:slug` (dynamic)
- Fetch `config/site` on load to determine which sections to render on main page
- Main page gets a "Explore More" section linking to enabled topic pages
- Conditionally render existing sections (Intro, Skills, Portfolio, Work Exp, Contact) based on config

#### [MODIFY] [Contact.jsx](file:///c:/Users/AWCC/Desktop/Learning/sonit-portfolio/src/components/Contact/Contact.jsx)
- Replace direct EmailJS call with Cloud Function `submitContactMessage`
- Add App Check token to requests
- Remove exposed EmailJS credentials from client code

#### [MODIFY] [index.html](file:///c:/Users/AWCC/Desktop/Learning/sonit-portfolio/index.html)
- Remove the inline Firebase SDK script (lines 12-23) — Firebase will be initialized properly via the JS SDK in `src/lib/firebase.js`

---

### 6. DDoS & Billing Protection

| Layer | Protection | Implementation |
|---|---|---|
| **1. Firebase App Check** | Block automated/bot traffic | reCAPTCHA Enterprise on frontend; enforce in Cloud Functions + Firestore rules |
| **2. Firestore Security Rules** | Prevent unauthorized access | Private collections locked to admin UID; public read-only; contact create-only with validation |
| **3. Cloud Function Rate Limiting** | Prevent function abuse | IP-based rate limiting on `submitContactMessage`; admin auth check on sync functions |
| **4. Client-Side Caching** | Reduce Firestore reads | Cache `config/site` + `publicShowcase` in `localStorage` with 1-hour TTL; only live listeners in admin |
| **5. Budget Alerts** | Catch billing spikes | Google Cloud billing budget at $5/month with email alerts |
| **6. Hosting Headers** | HTTP security | `Cache-Control` for static assets; CSP, X-Frame-Options headers |

#### Firestore Security Rules (detailed)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null && 
             exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    // Admins registry — authenticated user can read their own admin status; writes restricted to console/admin SDK
    match /admins/{adminId} {
      allow read: if request.auth != null && request.auth.uid == adminId;
      allow write: if false;
    }

    // Site config & categories — public read, admin write
    match /config/{document} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // User stats & gamification — admin only (private)
    match /userStats/{doc} {
      allow read, write: if isAdmin();
    }

    // Bucket list — admin only (private)
    match /bucketList/{item} {
      allow read, write: if isAdmin();
    }

    // Gaming progress — admin only (private)
    match /gamingProgress/{item} {
      allow read, write: if isAdmin();
    }

    // Career goals — admin only (private)
    match /careerGoals/{item} {
      allow read, write: if isAdmin();
    }

    // Credit cards — admin only (private)
    match /creditCards/{item} {
      allow read, write: if isAdmin();
    }

    // Public page configs — public read, admin write
    match /publicPages/{slug} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Public showcase — public read, admin write
    match /publicShowcase/{item} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Contact messages — public create (validated), admin read/delete
    match /contactMessages/{msg} {
      allow create: if request.resource.data.keys()
                      .hasAll(['name', 'email', 'message', 'createdAt'])
                    && request.resource.data.name is string
                    && request.resource.data.email is string
                    && request.resource.data.message is string
                    && request.resource.data.name.size() <= 100
                    && request.resource.data.email.size() <= 100
                    && request.resource.data.message.size() <= 2000;
      allow read, delete: if isAdmin();
    }

    // Rate limit tracking — Cloud Functions only
    match /rateLimits/{entry} {
      allow read, write: if false;
    }

    // Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

#### [PENDING STAGE] Firebase Storage Security Rules (`storage.rules`)

*(Storage upload deferred until Blaze upgrade. Pre-configured rules ready for future deployment:)*

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Admin can upload and delete any file
    match /{allPaths=**} {
      allow read: if true;  // Public read for published images
      allow write: if request.auth != null
                   && request.auth.uid == 'R4yb7LzRJfhLQ31AQF6G6px2Eg73';
    }

    // Restrict file size (max 5 MB) and type (images only)
    match /images/{imageId} {
      allow write: if request.auth != null
                   && request.auth.uid == 'R4yb7LzRJfhLQ31AQF6G6px2Eg73'
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```
> Storage path convention: `images/{collection}/{itemId}/{filename}` — e.g., `images/bucketList/abc123/japan-trip.jpg`
> Free tier (once enabled): 5 GB storage, 1 GB/day download, 20K/day upload operations.

---

### 7. Firestore Data Models

#### `config/site` (single document)

```json
{
  "sections": {
    "intro": { "enabled": true },
    "skills": { "enabled": true },
    "portfolio": { "enabled": true },
    "workExperience": { "enabled": true },
    "contact": { "enabled": true },
    "exploreMore": { "enabled": true }
  },
  "publicRoutes": {
    "travel": { "enabled": true, "label": "Travel", "icon": "\u2708\ufe0f", "order": 1 },
    "gaming": { "enabled": true, "label": "Gaming", "icon": "\ud83c\udfae", "order": 2 },
    "career": { "enabled": true, "label": "Career", "icon": "\ud83d\ude80", "order": 3 },
    "credit-cards": { "enabled": true, "label": "Credit Cards", "icon": "\ud83d\udcb3", "order": 4 }
  },
  "updatedAt": "<timestamp>"
}
```

#### `config/categories` (single document) — **NEW (Dynamic Categories)**

Categories are **not hardcoded** — they live in Firestore so you can add/rename/remove/reorder them from the admin Settings page without any code deploy.

```json
{
  "bucketList": [
    { "id": "places", "label": "Places to Visit", "icon": "🗺️", "color": "#4ECDC4", "enabled": true },
    { "id": "gaming", "label": "Gaming Backlog", "icon": "🎮", "color": "#FF6B6B", "enabled": true },
    { "id": "personal_growth", "label": "Personal Growth", "icon": "🌱", "color": "#95E1D3", "enabled": true },
    { "id": "credit_cards", "label": "Credit Card Collection", "icon": "💳", "color": "#FFD93D", "enabled": true }
  ],
  "career": [
    { "id": "frontend", "label": "Frontend", "icon": "🖥️", "color": "#6C5CE7" },
    { "id": "system_design", "label": "System Design", "icon": "🏗️", "color": "#FDCB6E" },
    { "id": "dsa", "label": "DSA", "icon": "🧮", "color": "#E17055" },
    { "id": "cloud", "label": "Cloud", "icon": "☁️", "color": "#74B9FF" }
  ],
  "updatedAt": "<timestamp>"
}
```
> Adding a new category (e.g., "Books to Read") = one admin Settings action. The Bucket List UI reads this dynamically and renders tabs accordingly. No code changes needed.

#### `userStats/gamification` (single document) — **NEW (Gamification Stats)**

```json
{
  "totalXp": 850,
  "currentLevel": 3,
  "levelTitle": "Adventurer",
  "streakMonths": 2,
  "totalCompleted": 7,
  "unlockedBadges": [
    { "id": "first_step", "title": "First Step", "unlockedAt": "<timestamp>", "icon": "🌟" },
    { "id": "globetrotter", "title": "Globetrotter", "unlockedAt": "<timestamp>", "icon": "🗺️" }
  ],
  "categoryBreakdown": {
    "places": { "completed": 3, "total": 8 },
    "gaming": { "completed": 2, "total": 6 },
    "personal_growth": { "completed": 2, "total": 5 },
    "credit_cards": { "completed": 1, "total": 4 }
  },
  "recentActivity": [
    { "id": "act_1", "itemId": "abc123", "title": "Visit Kyoto", "xpGained": 250, "date": "<timestamp>" }
  ],
  "updatedAt": "<timestamp>"
}
```
> Maintained automatically by the gamification engine in `src/lib/gamification.js`.
> Level progression formula:
> - Level 1: Novice (0 - 200 XP)
> - Level 2: Trailblazer (201 - 500 XP)
> - Level 3: Adventurer (501 - 1,000 XP)
> - Level 4: Pathfinder (1,001 - 2,000 XP)
> - Level 5: Master of Horizons (2,001 - 3,500 XP)
> - Level 6: Grandmaster (3,501+ XP)

#### `bucketList/{id}`

```json
{
  "title": "Visit Japan",
  "description": "Cherry blossom season in Kyoto",
  "category": "places",
  "difficulty": "challenging",
  "xpValue": 250,
  "priority": "high",
  "status": "todo",
  "targetDate": "<timestamp or null>",
  "completedAt": "<timestamp or null>",
  "notes": "Save up for the trip",
  "imageUrl": "https://images.unsplash.com/... or null",
  "isPublic": false,
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>"
}
```
> `category` values: dynamic — read from `config/categories.bucketList[].id`
> `difficulty` values: `"casual"` (50 XP) | `"moderate"` (100 XP) | `"challenging"` (250 XP) | `"epic"` (500 XP)
> `imageUrl`: direct image URL for now; direct Firebase Storage file upload is pending future upgrade

#### `gamingProgress/{id}`

```json
{
  "title": "Elden Ring",
  "platform": "steam",
  "externalId": "1245620",
  "coverArtUrl": "https://...",
  "playtimeMinutes": 4320,
  "achievementsTotal": 42,
  "achievementsUnlocked": 38,
  "trophies": {
    "platinum": 0,
    "gold": 3,
    "silver": 10,
    "bronze": 25
  },
  "status": "in_progress",
  "priority": "high",
  "personalNotes": "Need to beat Malenia",
  "isPublic": false,
  "lastSyncedAt": "<timestamp>",
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>"
}
```
> `platform` values: `"steam"` | `"psn"` | `"manual"`
> `status` values: `"not_started"` | `"in_progress"` | `"completed"` | `"abandoned"`

#### `careerGoals/{id}` — **NEW**

```json
{
  "title": "Learn System Design",
  "type": "skill",
  "description": "Complete a system design course and practice with mock interviews",
  "category": "System Design",
  "proficiencyLevel": "beginner",
  "status": "learning",
  "priority": "high",
  "deadline": "<timestamp or null>",
  "resources": [
    { "label": "Grokking System Design", "url": "https://..." }
  ],
  "milestones": [
    { "title": "Finish course module 1-5", "completed": true },
    { "title": "Design URL shortener", "completed": false }
  ],
  "notes": "Focus on distributed systems patterns",
  "imageUrl": "https://firebasestorage.googleapis.com/... or null",
  "isPublic": false,
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>"
}
```
> `type` values: `"skill"` | `"learning_goal"` | `"milestone"` (promotion, certification, etc.)
> `proficiencyLevel` values: `"beginner"` | `"intermediate"` | `"advanced"` | `"expert"`
> `status` values: `"not_started"` | `"learning"` | `"proficient"` | `"completed"`
> `category` values: dynamic — read from `config/categories.career[].id`

#### `creditCards/{id}` — **NEW**

```json
{
  "cardName": "HDFC Regalia Gold",
  "issuer": "HDFC Bank",
  "network": "visa",
  "cardType": "premium",
  "annualFee": 2500,
  "creditLimit": 300000,
  "joiningDate": "<timestamp>",
  "status": "active",
  "benefits": ["Lounge access", "2X rewards on dining", "Fuel surcharge waiver"],
  "rewardPoints": 15420,
  "cashbackEarned": 3200,
  "cardImageUrl": "https://images.example.com/regalia-gold.png or null",
  "difficulty": "moderate",
  "xpValue": 100,
  "isPublic": false,
  "notes": "Fee waiver if spend > 3L/year",
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>"
}
```
> `network` values: `"visa"` | `"mastercard"` | `"amex"` | `"rupay"` | `"diners"`
> `cardType` values: `"rewards"` | `"travel"` | `"cashback"` | `"premium"` | `"secured"` | `"business"`
> `status` values: `"applied"` | `"approved"` | `"active"` | `"closed"`

#### `publicPages/{slug}` — **NEW (Route-Based Public Pages)**

```json
{
  "slug": "travel",
  "title": "My Travel Adventures",
  "description": "Places I've visited and destinations on my bucket list",
  "heroImageUrl": "https://images.unsplash.com/... or null",
  "seoTitle": "Sonit's Travel Adventures",
  "seoDescription": "Explore the places Sonit has visited around the world",
  "enabled": true,
  "itemOrder": ["publicShowcase/item1", "publicShowcase/item2"],
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>"
}
```
> Each public route (`/travel`, `/gaming`, `/career`, `/credit-cards`) has a corresponding document.
> `itemOrder`: ordered list of `publicShowcase` document IDs to display on this page.
> Custom slugs can be created from admin for future topics without code changes.

#### `publicShowcase/{id}`

```json
{
  "title": "Visited Japan",
  "description": "Cherry blossom season in Kyoto, 2025",
  "sourceType": "places",
  "sourceId": "bucketList/abc123",
  "routeSlug": "travel",
  "icon": "🗺️",
  "imageUrl": "https://images.unsplash.com/... or null",
  "featured": false,
  "completedAt": "<timestamp>",
  "createdAt": "<timestamp>"
}
```
> `sourceType` values: dynamic — matches any category `id` from `config/categories`, plus `"career"` and `"credit_cards"`
> `routeSlug`: determines which public topic page (`/travel`, `/gaming`, etc.) this item appears on
> `featured`: if true, displayed prominently at the top of the page
> This collection is populated when admin toggles `isPublic: true` on any item.

#### `contactMessages/{id}`

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Great portfolio!",
  "createdAt": "<timestamp>",
  "read": false
}
```

---

## New Dependencies

| Package | Purpose | Where |
|---|---|---|
| `firebase` | Firebase JS SDK (Auth, Firestore, App Check; Storage pending) | Frontend |
| `react-router-dom` | Client-side routing for admin vs public | Frontend |
| `canvas-confetti` | Celebratory confetti bursts upon goal completion & level ups | Frontend |
| `firebase-functions` | Cloud Functions runtime | `functions/` |
| `firebase-admin` | Admin SDK for Firestore from Cloud Functions | `functions/` |
| `psn-api` | PlayStation Network trophy/game data | `functions/` |
| `firebase-tools` | CLI for deploy (devDependency or global) | Dev |

---

## File Structure After Changes

```
sonit-portfolio/
├── firebase.json                         [NEW]
├── firestore.rules                       [NEW — includes userStats rule]
├── storage.rules                         [PENDING STAGE — pre-configured for Blaze upgrade]
├── firestore.indexes.json                [NEW]
├── .firebaserc                           [EXISTS]
├── .env                                  [NEW — gitignored, Firebase config]
├── functions/                            [NEW]
│   ├── package.json
│   ├── .env                              [NEW — gitignored, API keys]
│   └── src/
│       ├── index.js
│       ├── steam.js
│       └── psn.js
├── src/
│   ├── lib/
│   │   ├── firebase.js                   [NEW]
│   │   ├── gamification.js               [NEW — XP, levels, badges, streak, completion helpers]
│   │   └── storage.js                    [PENDING STAGE — upload helpers for future upgrade]
│   ├── contexts/
│   │   └── AuthContext.jsx               [NEW]
│   ├── components/
│   │   ├── ProtectedRoute/
│   │   │   └── ProtectedRoute.jsx        [NEW]
│   │   ├── ImageUpload/                  [PENDING STAGE — direct file upload deferred]
│   │   ├── ExploreMore/
│   │   │   ├── ExploreMore.jsx           [NEW — links to topic pages on main site]
│   │   │   └── ExploreMore.css           [NEW]
│   │   ├── Navbar/                       [EXISTS — MODIFY for secret gesture]
│   │   ├── Intro/                        [EXISTS]
│   │   ├── Skills/                       [EXISTS]
│   │   ├── Portfolio/                    [EXISTS]
│   │   ├── Contact/                      [EXISTS — MODIFY]
│   │   └── Footer/                       [EXISTS]
│   ├── pages/
│   │   ├── Login/
│   │   │   ├── Login.jsx                 [NEW]
│   │   │   └── Login.css                 [NEW]
│   │   ├── Public/
│   │   │   └── TopicPage/
│   │   │       ├── TopicPage.jsx         [NEW — generic public topic page]
│   │   │       ├── TopicPage.css         [NEW]
│   │   │       ├── CreditCardShowcase.jsx [NEW — wallet-style card display]
│   │   │       └── CreditCardShowcase.css [NEW]
│   │   └── Admin/
│   │       ├── AdminLayout.jsx           [NEW — bottom nav on mobile, sidebar on desktop]
│   │       ├── AdminLayout.css           [NEW]
│   │       ├── Dashboard/
│   │       │   ├── Dashboard.jsx         [NEW — Gamified progress dashboard]
│   │       │   └── Dashboard.css         [NEW]
│   │       ├── BucketList/
│   │       │   ├── BucketList.jsx        [NEW — dynamic tabs + gamified completion + URL preview]
│   │       │   └── BucketList.css        [NEW]
│   │       ├── Gaming/
│   │       │   ├── GamingTracker.jsx     [NEW]
│   │       │   └── GamingTracker.css     [NEW]
│   │       ├── Career/
│   │       │   ├── CareerTracker.jsx     [NEW]
│   │       │   └── CareerTracker.css     [NEW]
│   │       ├── CreditCards/
│   │       │   ├── CreditCardTracker.jsx [NEW — card collection CRUD + gallery]
│   │       │   └── CreditCardTracker.css [NEW]
│   │       ├── PublicPages/
│   │       │   ├── PublicPageBuilder.jsx  [NEW — per-route content curation]
│   │       │   └── PublicPageBuilder.css  [NEW]
│   │       └── Settings/
│   │           ├── SiteSettings.jsx      [NEW — section toggles, route toggles, categories]
│   │           └── SiteSettings.css      [NEW]
│   ├── App.jsx                           [MODIFY]
│   ├── App.css                           [EXISTS]
│   ├── main.jsx                          [EXISTS]
│   └── main.css                          [EXISTS]
├── package.json                          [MODIFY]
├── index.html                            [MODIFY]
└── vite.config.js                        [EXISTS]
```

---

## Implementation Phases

### Phase 1 — Foundation [COMPLETED ✅]
- [x] Firebase project config (`firebase.json`, `.env`, `firestore.rules`, `firestore.indexes.json`)
- [x] Dynamic admin authorization via `admins` collection check in `firestore.rules` (zero hardcoded UIDs in public git)
- [x] `src/lib/firebase.js` — SDK initialization (Auth, Firestore)
- [x] `react-router-dom` client-side routing in `App.jsx` (`/`, `/login`, `/admin/*`)
- [x] `AuthContext` + `ProtectedRoute` (admin verification via `admins` collection and gitignored `.env`)
- [x] `Login` page (mobile-first sleek glassmorphism design with error handling)
- [x] Secret entry: 3-second long-press on logo in `Navbar` + `/admin` direct route
- [x] Cleaned up `index.html` inline script
- [x] Production build verified cleanly with `vite build`

### Phase 2 — Admin Dashboard Shell & Gamification Engine
- `AdminLayout` with mobile bottom-tab nav + desktop sidebar (Dashboard, Bucket List, Gaming, Career, Credit Cards, Public Pages, Settings)
- `src/lib/gamification.js` — XP, levels, badges, streaks, and activity logging engine
- `Dashboard` page — **Gamified Progress Dashboard**:
  - Hero Level Card (Level, XP progress bar, active streak)
  - Category Completion Rings (interactive circular gauges)
  - Active Quests log (quick-complete top items)
  - Badges & Achievements Grid (locked/unlocked milestone badges)
  - Recent activity feed
- `SiteSettings` page — section toggles + **dynamic category management** (add/rename/remove/reorder categories)
- Seed `config/categories` with default categories and initialize `userStats/gamification`
- Wire up `config/site` reads on the public site to conditionally render sections

### Phase 3 — Bucket List & Gamified Completion Experience
- `BucketList` page with **dynamic tabs** (reads from `config/categories.bucketList`)
- Full CRUD for each category with difficulty and XP assignment (Casual 50 XP, Moderate 100 XP, Challenging 250 XP, Epic 500 XP)
- **Interactive completion experience:**
  - Checkbox click triggers celebratory confetti (`canvas-confetti`) and floating XP indicator
  - Awards XP, recalculates levels, evaluates badge conditions, logs activity
  - Unchecking/deletion cleanly rolls back XP and updates category counts
- **Image URL input with live preview** (external URLs supported; direct storage upload deferred)
- "Publish to Public" toggle per item (copies to `publicShowcase` collection)

### Phase 4 — Credit Card Collection
- `CreditCardTracker` page: Card gallery with CRUD
- Card art/design image URL support with live preview
- Status tracking (Applied → Approved → Active → Closed)
- Benefits & rewards logging
- XP integration (card difficulty tiers)
- "Publish to Public" toggle → publishes to `/credit-cards` public page

### Phase 5 — Career Growth Tracker
- `CareerTracker` page: Skills Roadmap, Learning Goals, Career Milestones
- CRUD + milestone tracking
- "Publish to Public" toggle

### Phase 6 — Gaming Integration
- `functions/` directory setup
- `steam.js` + `psn.js` API modules
- Monthly scheduled Cloud Functions for auto-sync
- On-demand sync button in admin
- `GamingTracker` UI with progress visualization

### Phase 7 — Public Topic Pages & Contact Migration
- `TopicPage` generic route component for `/travel`, `/gaming`, `/career`, `/credit-cards`
- `CreditCardShowcase` specialized component for wallet-style card display
- `PublicPageBuilder` admin page for per-route content curation
- "Explore More" section on main portfolio linking to enabled topic pages
- Migrate contact form from EmailJS → Cloud Function
- Remove exposed EmailJS keys from client

### Phase 8 — Security & Polish
- Firebase App Check setup
- Firestore rules deployment and testing (including `/userStats/{doc}`, `/creditCards/{item}`, `/publicPages/{slug}`)
- Rate limiting on contact form
- Client-side caching (`localStorage` + TTL)
- Budget alert setup in Google Cloud Console
- Clean up `index.html` inline Firebase script

### [PENDING STAGE — Post-MVP / Upon Blaze Upgrade]
- Enable Firebase Storage in Console
- Deploy `storage.rules`
- Implement `ImageUpload` drag-and-drop / camera upload component

---

## Verification Plan

### Automated Tests
- Firestore rules: test locally using `firebase emulators:start` + `@firebase/rules-unit-testing`
- Gamification math: unit tests for XP accumulation, level progression thresholds, and badge condition checks
- Cloud Functions: test locally using Firebase emulator suite
- Verify monthly cron fires correctly in emulator

### Manual Verification
- **Auth flow:** Login from mobile, access admin, verify public site shows no admin links
- **Secret entry:** Test long-press gesture on mobile, test `/admin` URL
- **Gamified Dashboard:** Check Hero Level card, XP progress bar, Category completion rings, and Badges showcase
- **Gamified Completion:** Check off a bucket list item — verify confetti animation, XP award, level progress increase, and activity feed update
- **XP Rollback on Uncheck/Delete:** Uncheck an item or delete a completed item — verify XP is cleanly deducted and category total adjusts
- **Dynamic Categories:** Add a new category in Settings, verify a new tab immediately appears in Bucket List
- **Direct Image URLs:** Paste an image URL (e.g., Unsplash), verify instant preview renders cleanly on both admin and public showcase
- **Career Tracker:** Add skills, learning goals, milestones — verify data persistence
- **Credit Card Collection:** Add/edit/delete cards, verify card gallery view, benefits tracking, XP integration
- **Public Topic Pages:** Visit `/travel`, `/gaming`, `/career`, `/credit-cards` — verify only admin-approved items appear
- **Public Page Builder:** Enable/disable a route, change page title/hero, reorder items — verify changes reflect on the public page
- **Dynamic Route Creation:** Add a new custom route in admin, verify it becomes accessible at `/[slug]`
- **Publish to Public:** Toggle items public with a route assignment, verify they appear on the correct topic page
- **Gaming Sync:** Trigger manual sync, verify Steam + PSN data populates
- **Site Config:** Toggle sections off, verify public site hides them
- **Contact Form:** Submit from public site, verify message stored in Firestore (not via EmailJS)
- **Rate Limiting:** Attempt rapid contact form submissions, verify rejection
- **Mobile UI:** Test all admin pages and bottom navigation on phone-sized viewport
- **Billing:** Confirm budget alert is set in Google Cloud Console
