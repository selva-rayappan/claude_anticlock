# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server at http://localhost:5173
npm run build     # Type-check (tsc) then bundle for production
npm run preview   # Serve the production build locally
```

There are no tests in this project.

ESLint runs automatically via `vite-plugin-eslint` during `npm run dev` and `npm run build` — errors appear in the terminal and browser overlay.

## Environment setup

Create a `.env` file in the project root before running:

```
VITE_API_KEY=<your-tmdb-api-key>
VITE_TMDB_API_BASE_URL=/tmdb-api
```

`VITE_TMDB_API_BASE_URL` must be `/tmdb-api` (not the direct TMDB URL) so the Vite dev-server proxy in `vite.config.ts` can forward requests to `https://api.themoviedb.org/3` and avoid CORS issues. The `dev` script sets `NODE_TLS_REJECT_UNAUTHORIZED=0` for the same reason.

Optional env vars (for production only): `VITE_GA_MEASUREMENT_ID`, `VITE_GOOGLE_AD_SLOT`, `VITE_GOOGLE_AD_CLIENT`.

## Architecture

**Provider stack** (`src/main.tsx`): `BrowserRouter` → `ApiProvider` (RTK Query) → `ThemeProvider` → `GlobalContextProvider` → `LazyMotion` → `App`

**Data fetching** — all TMDB calls go through a single RTK Query API slice at `src/services/TMDB.ts`. It exposes two endpoints:
- `useGetShowsQuery` — list queries (popular, top-rated, search, similar) parameterised by `{ category, type, page, searchQuery, showSimilarShows, id }`
- `useGetShowQuery` — single item with appended `videos` and `credits`

`category` is always `"movie"` or `"tv"` and maps directly to TMDB URL segments.

**Routing** (`src/App.tsx`):
- `/` → `Home` (hero slider + 4 curated sections)
- `/:category` → `Catalog` (paginated browse + search)
- `/:category/:id` → `Detail` (full movie/show info)
- `*` → `NotFound`

All page components are lazy-loaded via `React.lazy`.

**Global state** is split across two React contexts:
- `themeContext` — dark/light/system theme, persisted to `localStorage` via `src/utils/helper.ts` (`saveTheme`/`getTheme`)
- `globalContext` — sidebar open/close state, video modal state, and `getTrailerId` (fetches trailer key directly via `fetch`, not RTK Query)

**Shared UI** (`src/common/`) — reusable components exported from a barrel (`src/common/index.ts`): `Header`, `Footer`, `SideBar`, `VideoModal`, `Section`, `MovieCard`, `Poster`, `Image`, `Loader`, `Error`, `Overlay`, `ScrollToTop`, `Logo`, `ThemeMenu`.

**Styling** — Tailwind CSS with dark-mode via the `dark` class on `<html>`. Reusable Tailwind class strings are exported from `src/styles/index.ts` (e.g. `maxWidth`, `mainHeading`, `watchBtn`) and composed with `cn()` from `src/utils/helper.ts` (a wrapper around `clsx` + `tailwind-merge`).

**Path alias** — `@/` resolves to `src/` (configured in both `vite.config.ts` and `tsconfig.json`).

**Home page sections** are driven by the `sections` array in `src/constants/index.ts` — add or reorder entries there to change what appears on the home page.
