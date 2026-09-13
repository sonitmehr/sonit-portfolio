# Personal Tracker & Backend for Sonit Portfolio

Add a Firebase-backed personal tracker with admin authentication, gaming progress integration (PlayStation & Steam), bucket list / life goals tracking, career growth tracker, and configurable public website sections — all with DDoS/billing protections.

---

## Decisions (Resolved)

| Question | Decision |
|---|---|
| Auth method | Firebase Email/Password (single admin account) |
| Gaming platforms | **Both** PlayStation (psn-api) + Steam (Web API) |
| Bucket list layout | Separate sections per category |
| Public visibility | Private by default. Admin can selectively publish items to a new **"Get to Know Me Better"** public section |
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

```
┌───────────────────────────────────────────────────────┐
│                 FRONTEND (React + Vite)                │
│                                                        │
│  ┌────────────────────┐  ┌──────────────────────────┐ │
│  │   Public Site       │  │ Secret Admin Dashboard   │ │
│  │   - Intro           │  │ (mobile-first, auth-gated)│
│  │   - Skills          │  │                          │ │
│  │   - Portfolio       │  │ - Bucket List Manager    │ │
│  │   - Work Exp        │  │   ├ Places to Visit      │ │
│  │   - Contact         │  │   ├ Gaming Backlog       │ │
│  │   - Footer          │  │   └ Personal Growth      │ │
│  │   - "Get to Know    │  │ - Gaming Tracker         │ │
│  │      Me Better"     │  │   (Steam + PSN sync)     │ │
│  │   (admin-curated)   │  │ - Career Growth Tracker  │ │
│  │                     │  │ - Site Config Panel      │ │
│  │   (all configurable)│  │ - Publish-to-Public ctrl │ │
│  └────────────────────┘  └──────────────────────────┘ │
│            ▲ secret entry: hidden gesture / URL        │
└──────────────┬──────────────────────┬──────────────────┘
               │                      │
               │ Firestore SDK        │ Firestore SDK
               │ (public reads only)  │ (full CRUD)
               ▼                      ▼
┌───────────────────────────────────────────────────────┐
│                  FIREBASE SERVICES                     │
│                                                        │
│  ┌──────────────┐  ┌───────────────────────────────┐  │
│  │ Firebase Auth │  │ Cloud Firestore               │  │
│  │ (email/pass,  │  │                               │  │
│  │  single admin)│  │ - config/site                 │  │
│  └──────────────┘  │ - bucketList/{id}              │  │
│                     │ - gamingProgress/{id}          │  │
│  ┌──────────────┐  │ - careerGoals/{id}             │  │
│  │Cloud Functions│  │ - publicShowcase/{id}          │  │
│  │               │  │ - contactMessages/{id}         │  │
│  │ - syncSteam   │  │ - rateLimits/{entry}           │  │
│  │   (monthly)   │  └───────────────────────────────┘  │
│  │ - syncPSN     │                                     │
│  │   (monthly)   │  ┌───────────────────────────────┐  │
│  │ - contactMsg  │  │ Firebase App Check             │  │
│  │ - cleanup     │  │ (DDoS / abuse protection)      │  │
│  └──────────────┘  └───────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
               │                      │
               ▼                      ▼
       ┌──────────────┐      ┌──────────────┐
       │ Steam Web API│      │ PSN API      │
       │ (via key)    │      │ (via NPSSO)  │
       └──────────────┘      └──────────────┘
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
- **Mobile:** Bottom tab navigation (Bucket List, Gaming, Career, Settings)
- **Desktop:** Sidebar navigation
- Header with user info and logout button
- Dark theme matching the portfolio

---

#### [NEW] `src/pages/Admin/BucketList/BucketList.jsx` + `BucketList.css`
Bucket list management page with **three separate tabs/sections:**

##### Places to Visit
- Add/edit/delete destinations
- Fields: place name, country, description, priority, status, target date, notes
- Mark as visited with completion date

##### Gaming Backlog
- Manually curated list of games you want to play (separate from API-synced progress)
- Fields: game title, platform, priority, status, notes
- Can link to a `gamingProgress` entry if synced data exists

##### Personal Growth Goals
- Fields: goal title, description, category tag, priority, status, target date, milestones (sub-items), notes
- Track progress with milestone checkboxes

##### Common features across all three:
- CRUD operations with inline editing
- Filter by status (todo / in-progress / completed)
- Sort by priority or date
- **"Publish to Public"** toggle per item → copies item to `publicShowcase` collection for the public "Get to Know Me Better" section
- Swipe-to-complete / swipe-to-delete on mobile

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

#### [NEW] `src/pages/Admin/Settings/SiteSettings.jsx` + `SiteSettings.css`
Site configuration page:
- **Section toggles:** Enable/disable each public section (Intro, Skills, Portfolio, Work Experience, Contact, "Get to Know Me Better")
- **Manage Published Items:** Review what's currently published to the "Get to Know Me Better" section, unpublish items
- Saves to `config/site` Firestore document

---

### 5. Frontend — Public Site Updates

#### [NEW] `src/components/Showcase/Showcase.jsx` + `Showcase.css`
New public section: **"Get to Know Me Better"**
- Renders items from the `publicShowcase` Firestore collection
- Grouped by source type: places visited, games completed, career wins, personal growth achievements
- Card-based layout with icons per category
- Only renders if the section is enabled in `config/site` AND has published items
- Placed between Contact and Footer in the page flow

#### [MODIFY] [App.jsx](file:///c:/Users/AWCC/Desktop/Learning/sonit-portfolio/src/App.jsx)
- Fetch `config/site` on load to determine which sections to render
- Conditionally render existing sections (Intro, Skills, Portfolio, Work Exp, Contact) based on config
- Add `<Showcase />` component if enabled

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
      return request.auth != null && request.auth.uid == 'YOUR_ADMIN_UID';
    }

    // Site config — public read, admin write
    match /config/{document} {
      allow read: if true;
      allow write: if isAdmin();
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

#### Firebase Storage Security Rules (`storage.rules`)

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
> Free tier: 5 GB storage, 1 GB/day download, 20K/day upload operations.

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
    "showcase": { "enabled": true }
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
    { "id": "personal_growth", "label": "Personal Growth", "icon": "🌱", "color": "#95E1D3", "enabled": true }
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

#### `bucketList/{id}`

```json
{
  "title": "Visit Japan",
  "description": "Cherry blossom season in Kyoto",
  "category": "places",
  "priority": "high",
  "status": "todo",
  "targetDate": "<timestamp or null>",
  "completedAt": "<timestamp or null>",
  "notes": "Save up for the trip",
  "imageUrl": "https://firebasestorage.googleapis.com/... or null",
  "isPublic": false,
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>"
}
```
> `category` values: dynamic — read from `config/categories.bucketList[].id`
> `imageUrl`: optional — uploaded via admin dashboard, stored in Firebase Storage

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

#### `publicShowcase/{id}`

```json
{
  "title": "Visited Japan 🇯🇵",
  "description": "Cherry blossom season in Kyoto, 2025",
  "sourceType": "places",
  "sourceId": "bucketList/abc123",
  "icon": "🗺️",
  "imageUrl": "https://firebasestorage.googleapis.com/... or null",
  "completedAt": "<timestamp>",
  "createdAt": "<timestamp>"
}
```
> `sourceType` values: dynamic — matches any category `id` from `config/categories`, plus `"career"`
> `imageUrl`: copied from the source item's imageUrl when published
> This collection is populated when admin toggles `isPublic: true` on any item or explicitly publishes to showcase.

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
| `firebase` | Firebase JS SDK (Auth, Firestore, **Storage**, App Check) | Frontend |
| `react-router-dom` | Client-side routing for admin vs public | Frontend |
| `firebase-functions` | Cloud Functions runtime | `functions/` |
| `firebase-admin` | Admin SDK for Firestore from Cloud Functions | `functions/` |
| `psn-api` | PlayStation Network trophy/game data | `functions/` |
| `firebase-tools` | CLI for deploy (devDependency or global) | Dev |

---

## File Structure After Changes

```
sonit-portfolio/
├── firebase.json                         [NEW]
├── firestore.rules                       [NEW]
├── storage.rules                         [NEW — Firebase Storage security]
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
│   │   └── storage.js                    [NEW — upload/delete helpers]
│   ├── contexts/
│   │   └── AuthContext.jsx               [NEW]
│   ├── components/
│   │   ├── ProtectedRoute/
│   │   │   └── ProtectedRoute.jsx        [NEW]
│   │   ├── ImageUpload/
│   │   │   ├── ImageUpload.jsx           [NEW — reusable upload component]
│   │   │   └── ImageUpload.css           [NEW]
│   │   ├── Showcase/
│   │   │   ├── Showcase.jsx              [NEW]
│   │   │   └── Showcase.css              [NEW]
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
│   │   └── Admin/
│   │       ├── AdminLayout.jsx           [NEW]
│   │       ├── AdminLayout.css           [NEW]
│   │       ├── BucketList/
│   │       │   ├── BucketList.jsx        [NEW]
│   │       │   └── BucketList.css        [NEW]
│   │       ├── Gaming/
│   │       │   ├── GamingTracker.jsx     [NEW]
│   │       │   └── GamingTracker.css     [NEW]
│   │       ├── Career/
│   │       │   ├── CareerTracker.jsx     [NEW]
│   │       │   └── CareerTracker.css     [NEW]
│   │       └── Settings/
│   │           ├── SiteSettings.jsx      [NEW]
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

### Phase 1 — Foundation
- Firebase project config (`firebase.json`, `.env`, `firestore.rules`)
- `src/lib/firebase.js` — SDK init
- `react-router-dom` routing in `App.jsx`
- `AuthContext` + `ProtectedRoute`
- `Login` page (mobile-first)
- Secret entry: long-press logo + `/admin` URL route
- Create admin account in Firebase Console

### Phase 2 — Admin Dashboard Shell
- `AdminLayout` with mobile bottom-tab nav + desktop sidebar
- `SiteSettings` page — section toggles + **dynamic category management** (add/rename/remove/reorder categories)
- Seed `config/categories` with default categories (Places, Gaming Backlog, Personal Growth)
- Wire up `config/site` reads on the public site to conditionally render sections

### Phase 3 — Bucket List
- `BucketList` page with **dynamic tabs** (reads from `config/categories.bucketList`)
- Full CRUD for each category
- **Image upload** per item (Firebase Storage + `ImageUpload` component)
- "Publish to Public" toggle per item (copies to `publicShowcase` with `imageUrl`)
- `publicShowcase` collection writes

### Phase 4 — Career Growth Tracker
- `CareerTracker` page: Skills Roadmap, Learning Goals, Career Milestones
- CRUD + milestone tracking
- "Publish to Public" toggle

### Phase 5 — Gaming Integration
- `functions/` directory setup
- `steam.js` + `psn.js` API modules
- Monthly scheduled Cloud Functions for auto-sync
- On-demand sync button in admin
- `GamingTracker` UI with progress visualization

### Phase 6 — Public Showcase & Contact Migration
- `Showcase` component on public site ("Get to Know Me Better")
- Migrate contact form from EmailJS → Cloud Function
- Remove exposed EmailJS keys from client

### Phase 7 — Security & Polish
- Firebase App Check setup
- Firestore rules deployment and testing
- **Firebase Storage rules** deployment (admin upload, public read for published images)
- Rate limiting on contact form
- Client-side caching (`localStorage` + TTL)
- Budget alert setup in Google Cloud Console
- Clean up `index.html` inline Firebase script

---

## Verification Plan

### Automated Tests
- Firestore rules: test locally using `firebase emulators:start` + `@firebase/rules-unit-testing`
- Cloud Functions: test locally using Firebase emulator suite
- Verify monthly cron fires correctly in emulator

### Manual Verification
- **Auth flow:** Login from mobile, access admin, verify public site shows no admin links
- **Secret entry:** Test long-press gesture on mobile, test `/admin` URL
- **Bucket List:** Add/edit/delete across all 3 categories, verify Firestore writes
- **Career Tracker:** Add skills, learning goals, milestones — verify data persistence
- **Publish to Public:** Toggle items public, verify they appear in "Get to Know Me Better"
- **Gaming Sync:** Trigger manual sync, verify Steam + PSN data populates
- **Site Config:** Toggle sections off, verify public site hides them
- **Contact Form:** Submit from public site, verify message stored in Firestore (not via EmailJS)
- **Rate Limiting:** Attempt rapid contact form submissions, verify rejection
- **Mobile UI:** Test all admin pages on phone-sized viewport
- **Billing:** Confirm budget alert is set in Google Cloud Console
