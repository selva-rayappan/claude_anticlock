# Watchlist Feature Specification

**Project:** tMovies  
**Document version:** 1.0  
**Date:** 2026-06-10  
**Status:** Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals and Non-Goals](#2-goals-and-non-goals)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [Design Approach](#5-design-approach)
6. [Recommended Tech Stack](#6-recommended-tech-stack)
7. [Data Model](#7-data-model)
8. [Component Architecture](#8-component-architecture)
9. [State Management Architecture](#9-state-management-architecture)
10. [Routing](#10-routing)
11. [Persistence Strategy](#11-persistence-strategy)
12. [Open Questions](#12-open-questions)

---

## 1. Overview

Users of tMovies currently have no way to save titles they intend to watch. This feature adds a **Watchlist** — a client-side collection where users can bookmark movies and TV series from any screen in the app and revisit them on a dedicated page.

---

## 2. Goals and Non-Goals

### Goals

- Allow users to add and remove any movie or TV series to a personal watchlist with a single interaction.
- Persist the watchlist across browser sessions without requiring an account.
- Provide a dedicated `/watchlist` page to browse all saved titles.
- Integrate visually with the existing dark/light theme system and component library.

### Non-Goals

- User accounts, authentication, or cross-device sync (deferred to a future phase).
- Sorting, filtering, or tagging within the watchlist (deferred to a future phase).
- Sharing a watchlist with other users.
- Tracking watch status (watched / in progress / not started).

---

## 3. Functional Requirements

### FR-01 — Add to Watchlist

- A bookmark icon button shall appear on every `MovieCard` component.
- On the `Detail` page, an "Add to Watchlist" / "Remove from Watchlist" button shall appear alongside the existing watch-trailer action.
- Activating the button when the item is **not** in the watchlist shall add it.
- The button shall provide immediate visual feedback (icon fill, colour change, brief animation) to confirm the action.

### FR-02 — Remove from Watchlist

- Activating the bookmark button on a title already in the watchlist shall remove it.
- On the dedicated Watchlist page, each card shall expose a remove button that is always visible (not hover-only), because intent on that page is unambiguous.

### FR-03 — Watchlist Page

- A route `/watchlist` shall render all saved titles as a responsive grid, using the same `MovieCard` layout used in the Catalog page.
- The page shall display the total item count in its heading (e.g. "Your Watchlist · 12 titles").
- When the watchlist is empty, a contextual empty state shall be shown with a call-to-action linking to the Home page.
- Items shall render in the order they were added (most recent first).

### FR-04 — Watchlist Count Badge

- The navigation (Header and SideBar) shall display the watchlist item count as a badge on the watchlist nav link when the count is greater than zero.

### FR-05 — State Persistence

- The watchlist shall survive page refresh and browser restart by persisting to `localStorage`.
- Changes (add/remove) shall be reflected instantly across all open components without a page reload.

### FR-06 — Duplicate Prevention

- Adding a title that is already in the watchlist shall be a no-op. The UI shall reflect the already-saved state on mount.

---

## 4. Non-Functional Requirements

| ID     | Category        | Requirement                                                                                           |
|--------|-----------------|-------------------------------------------------------------------------------------------------------|
| NFR-01 | Performance     | Adding or removing an item shall complete within one render cycle with no perceptible lag.            |
| NFR-02 | Accessibility   | Bookmark buttons shall have descriptive `aria-label` attributes that reflect current state ("Add to watchlist" / "Remove from watchlist"). |
| NFR-03 | Responsiveness  | The Watchlist page shall use the same responsive grid breakpoints as the Catalog page.               |
| NFR-04 | Theme           | All new UI elements shall honour the existing dark/light class-based Tailwind theme.                 |
| NFR-05 | Bundle size     | No new runtime dependencies shall be introduced unless justified; use packages already in the project where possible. |
| NFR-06 | Storage limit   | `localStorage` usage shall be bounded; only the minimum required fields per title shall be stored (see Data Model). |

---

## 5. Design Approach

### 5.1 Bookmark Button on MovieCard

A bookmark icon (from the existing `react-icons` package — `BsBookmark` / `BsBookmarkFill`) shall be overlaid in the top-right corner of each card poster. It sits inside the existing hover overlay on desktop, but remains always visible on touch devices (detected via the existing `useMediaQuery` hook).

```
┌──────────────────┐
│  [poster image]  │  ← BsBookmarkFill (filled, accent colour) if saved
│                🔖│  ← BsBookmark (outline) if not saved
│                  │
└──────────────────┘
   Movie Title
```

The icon uses the existing red accent (`#ff0000` / `text-[#ff0000]`) when active, and `text-gray-400` when inactive, consistent with the YouTube icon treatment in the current overlay.

### 5.2 Detail Page CTA

On the Detail page, a secondary button is added next to the trailer button row:

```
[ ▶ Watch Trailer ]  [ 🔖 Add to Watchlist ]
                     [ 🔖 Saved ✓           ]   ← when already saved
```

The button uses the existing `watchBtn` style class from `src/styles/index.ts` with a border variant to distinguish it visually from the primary trailer CTA.

### 5.3 Watchlist Page

The page layout mirrors Catalog (`CatalogHeader` + grid), with the following differences:

- Header reads "Your Watchlist" with the item count subtitle.
- No search bar or type filter (deferred).
- Each card includes a permanently visible remove button (trash icon), not just on hover.
- Empty state: centred SVG illustration + "Nothing saved yet" + "Browse Movies" link.

### 5.4 Navigation

A new "Watchlist" entry is added to the `navLinks` array in `src/constants/index.ts`:

```ts
{ title: "watchlist", path: "/watchlist", icon: BsBookmark }
```

The Header and SideBar components will automatically pick this up with no structural changes, since they both iterate `navLinks`. A small numeric badge is rendered conditionally on this nav item when `watchlistCount > 0`.

### 5.5 Animation

Framer Motion's `AnimatePresence` (already available via `framer-motion`) shall animate cards exiting the Watchlist grid when removed, using a simple `opacity` + `scale` exit transition consistent with the motion style used on the Detail page (`useMotion` hook).

---

## 6. Recommended Tech Stack

### 6.1 State Management — Redux Toolkit slice (upgrade from `ApiProvider`)

The app currently uses RTK Query's lightweight `ApiProvider` wrapper, which only supports a single API and does not expose a standard Redux store. To add a Redux slice for watchlist state, **`ApiProvider` must be replaced with the full Redux `Provider` backed by a `configureStore`**.

```ts
// src/store.ts
import { configureStore } from "@reduxjs/toolkit";
import { tmdbApi } from "@/services/TMDB";
import watchlistReducer from "@/features/watchlist/watchlistSlice";

export const store = configureStore({
  reducer: {
    [tmdbApi.reducerPath]: tmdbApi.reducer,
    watchlist: watchlistReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(tmdbApi.middleware),
});
```

**Rationale:** Redux Toolkit is already a direct dependency (`@reduxjs/toolkit`). This change adds no new packages, keeps the existing RTK Query behaviour intact, and gives watchlist state the same reactive, globally accessible store that already handles API cache.

**Alternative considered — React Context:** A context provider with `useState` would work for simpler cases but does not support the middleware pattern needed to sync state to `localStorage` cleanly (see §6.2). Redux is already present and the upgrade is minimal.

**Alternative considered — Zustand:** Lighter API, built-in `persist` middleware, no provider boilerplate. Would be a valid choice for a greenfield feature but introduces a new dependency when Redux Toolkit is already installed.

### 6.2 Persistence — `redux-persist`

| Package | Version | Purpose |
|---|---|---|
| `redux-persist` | `^6.0.0` | Serialises and rehydrates Redux slices to/from `localStorage` automatically |

`redux-persist` wraps the `watchlist` slice reducer and handles read/write to `localStorage` transparently. It also provides a `PersistGate` that delays rendering until the persisted state is rehydrated, preventing a flash where the watchlist appears empty on first paint.

**Alternative considered — manual `localStorage` sync in the slice:** Writing `useEffect`-based sync or store subscribers by hand is fragile and duplicates logic that `redux-persist` handles reliably. Given the app already uses `localStorage` for theme, a single consistent persistence mechanism is preferable.

### 6.3 Icons

No new package required. `react-icons` (already installed) provides:

- `BsBookmark` / `BsBookmarkFill` — bookmark toggle
- `BsTrash` — remove button on Watchlist page

### 6.4 Animation

No new package required. `framer-motion` (already installed) provides `AnimatePresence` for exit animations on the Watchlist grid.

### 6.5 Summary of New Dependencies

| Package | Justification |
|---|---|
| `redux-persist` ^6 | `localStorage` sync with rehydration support; no viable equivalent already in project |

All other requirements are satisfied by existing dependencies.

---

## 7. Data Model

Only the fields required to render a watchlist card and route to its Detail page are stored. Full movie data is intentionally **not** persisted to stay within `localStorage` limits and to avoid stale data.

```ts
interface WatchlistItem {
  id: string;              // TMDB item id — used to build /:category/:id route
  category: "movie" | "tv";
  title: string;           // original_title (movies) or name (TV series)
  poster_path: string;     // relative TMDB image path
  addedAt: number;         // Unix timestamp (ms) — used for most-recent-first sort
}
```

**Slice shape:**

```ts
interface WatchlistState {
  items: WatchlistItem[];
}
```

**Selectors needed:**

- `selectWatchlistItems` — all items ordered by `addedAt` descending
- `selectIsInWatchlist(id)` — boolean used by BookmarkButton to determine icon state
- `selectWatchlistCount` — used by nav badge

---

## 8. Component Architecture

```
src/
├── features/
│   └── watchlist/
│       ├── watchlistSlice.ts        # Redux slice: add, remove actions + selectors
│       └── BookmarkButton.tsx       # Reusable icon button (used in MovieCard & Detail)
├── pages/
│   └── Watchlist/
│       ├── index.tsx                # Page component
│       └── WatchlistEmptyState.tsx  # Empty state UI
└── store.ts                         # Replaces ApiProvider; configureStore
```

**`BookmarkButton` props:**

```ts
interface BookmarkButtonProps {
  item: WatchlistItem;
  variant?: "overlay" | "inline";   // "overlay" for MovieCard, "inline" for Detail page
  className?: string;
}
```

The `variant` prop controls size and positioning so the same component works in both the card overlay and the Detail page button row.

---

## 9. State Management Architecture

```
User clicks BookmarkButton
        │
        ▼
dispatch(addToWatchlist(item))  or  dispatch(removeFromWatchlist(id))
        │
        ▼
watchlistSlice reducer updates state
        │
        ├─► redux-persist middleware writes to localStorage
        │
        └─► React components re-render via useSelector
               ├── BookmarkButton (icon fill updates)
               ├── Nav badge (count updates)
               └── WatchlistPage grid (item appears/disappears)
```

No async thunks are required. All watchlist operations are synchronous local mutations.

---

## 10. Routing

Add a new route in `src/App.tsx`:

```tsx
<Route path="/watchlist" element={<Watchlist />} />
```

The Watchlist page is lazy-loaded via `React.lazy` to match the pattern used for all other pages.

---

## 11. Persistence Strategy

```
App boot
   │
   ├─ redux-persist rehydrates watchlist slice from localStorage
   ├─ PersistGate holds render until rehydration completes
   └─ Components render with correct initial state (no empty-flash)

User adds/removes item
   └─ redux-persist serialises updated state to localStorage synchronously
      (no debounce needed; watchlist operations are infrequent)
```

The `localStorage` key shall be `tmovies_watchlist` to avoid collision with the existing `tmovies_theme` key written by `src/utils/helper.ts`.

---

## 12. Open Questions

| # | Question | Impact | Owner |
|---|---|---|---|
| 1 | Should the watchlist count badge cap at 99+ or show the exact number? | Minor UI decision | Design |
| 2 | Is cross-device sync (account/backend) on the roadmap? If yes, the local-first model here should be designed to sync to a backend later (e.g. Supabase `upsert` on login). | Architecture | Product |
| 3 | Should removing an item from the Watchlist page trigger a confirmation dialog, or be immediate with an undo toast? | UX | Design |
| 4 | Should the Watchlist page be accessible to search engine crawlers, or should it be excluded via `robots.txt`? | SEO | Product |
