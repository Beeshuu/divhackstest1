# Campus Connect — Frontend Spec (Phase 1)

## Purpose

Campus Connect is a live campus event map for Columbia University. Students open it to
see what is happening right now — free food, socials, study sessions, career events,
pickup sports — plotted on a campus map, and open a detail panel for any event.

This document describes the **Phase 1 visual prototype**. It exists so a future
contributor (human or agent) can understand and extend the frontend without any chat
history.

## Phase 1 goal: reference-driven reproduction

Phase 1 had exactly one goal: reproduce a reference design screenshot as closely as
realistically possible. It is a **visual** milestone — layout accuracy, spacing,
proportions, typography, animation and responsive behaviour. No backend behaviour.

Every dimension in this document was measured by pixel-analysing the reference image
(1672×941) and scaling to the primary desktop target (1536×864, factor `1536/1672 ≈
0.9187`). When changing layout, **compare against the reference rather than against
taste** — it is the source of truth.

## Stack

| Concern    | Choice                                        |
| ---------- | --------------------------------------------- |
| Framework  | Next.js 16 (App Router) + React 19, Turbopack |
| Language   | TypeScript (strict, no `any`)                 |
| Styling    | Tailwind CSS v4 (`@theme` tokens in CSS)      |
| Icons      | `lucide-react` + two local multi-colour SVGs  |
| Animation  | `framer-motion`                               |
| Fonts      | Inter via `next/font/google`                  |

Dependencies are deliberately minimal. Do **not** add a component library, a state
manager, a data layer, or a second icon set. Custom Tailwind components are preferred.

## Running it

```bash
cd frontend
npm install
npm run dev     # http://localhost:3000, or -p <port>
npm run build   # must pass before any change is considered done
```

`next.config.ts` pins `turbopack.root` because the repository root also contains a
lockfile (an unrelated legacy Vite/Express prototype), and disables the floating dev
indicator so it does not overlap the map controls during visual review.

## Component structure

```
src/
  app/
    layout.tsx          Inter font, metadata, viewport
    globals.css         Tailwind import + @theme design tokens + body defaults
    page.tsx            Shell composition + drawer/sidebar visibility state only
  components/
    layout/
      TopNavbar.tsx     Brand block, visual-only search field, account cluster
      Sidebar.tsx       Category rail + Post Event button
    map/
      CampusMapPlaceholder.tsx   Map container: art, labels, markers, user dot, controls
      CampusMapArt.tsx           Pure-SVG campus illustration (buildings/streets/trees)
      MapFilters.tsx             Floating filter pill row
      EventMarker.tsx            Single teardrop pin
      CampusStats.tsx            Floating bottom status bar
      MapControls.tsx            Locate / zoom in / zoom out
    events/
      EventDrawer.tsx   Sliding event detail panel
      EventHeroArt.tsx  Local SVG hero illustration (pizza + Columbia banner)
      AvatarStack.tsx   Overlapping initials chips + overflow count chip
    icons/
      CategoryIcons.tsx PizzaSliceIcon, BasketballIcon
  data/mock-events.ts   7 mock events, featured id, user location, campus stats
  types/event.ts        CampusEvent and its union types
  lib/
    constants.ts        LAYOUT, MARKER_PALETTE, MAP_LABELS
    utils.ts            cn(), formatCount()
    use-media-query.ts  SSR-safe breakpoint hook (drawer animation axis only)
public/assets/          Local placeholder portrait
```

`page.tsx` stays a shell: it composes the navbar, sidebar, map surface and drawer, and
owns nothing but `drawerOpen` and `sidebarOpen`. It must never grow event data, map
markup, or component-specific styling.

`globals.css` holds only body defaults, font smoothing, the global background,
box-sizing, the focus ring and shared design tokens. Component styling lives in
Tailwind utilities inside the components.

## Key dimensions (1536×864 target)

| Element                  | Value                                            |
| ------------------------ | ------------------------------------------------ |
| Top navbar height        | 72px, white, 1px bottom border                   |
| Left sidebar width       | 276px (236px on the 900–1199px tier)             |
| Centre map               | all remaining width (~846px) — always the largest area |
| Right drawer column      | 416px (360px on the 900–1199px tier)             |
| Drawer card              | ~408px wide, floating: 8px top, 6px right, 10px bottom |
| Search field             | x 308, width 620 (max), height 44, pill radius   |
| Sidebar nav item         | 244×49, 5px gaps, first item at y 88             |
| Post Event button        | y 482, height 48                                 |
| Filter pills             | first at x 300 / y 88, height 42, 22px gaps      |
| Campus stats bar         | y 761, height 83, ~709px wide, 20px bottom inset |
| Map controls             | 17px from the map's left edge; 46×46 locate, 46×69 zoom stack |
| Drawer hero              | 186px tall, 12px inset inside the card           |
| Drawer content padding   | 26px horizontal                                  |
| Event markers            | 34×44 normal, 39×50 selected (plus an 84px glow) |

Spacing follows a 4/8/12/16/20/24/32 scale: ~16–22px inside nav items, 14–24px between
drawer sections, ~13px pill horizontal padding.

Radii: search bar fully rounded; filter pills `9999px`; sidebar selected item 13px;
Post Event 12px; drawer card 20px; hero 16px; CTAs 13px; stats bar 20px.

Shadows are restrained and cool-tinted, defined once as `--shadow-pill`,
`--shadow-pill-hover`, `--shadow-float`, `--shadow-panel`, `--shadow-marker`. No large
blurry black shadows.

## Colour system

Tokens live in the `@theme` block of `globals.css`, so every colour is available as a
Tailwind utility (`bg-brand`, `text-ink`, `border-line`, …). Values were sampled from
the reference screenshot rather than invented.

| Token          | Value     | Use                                  |
| -------------- | --------- | ------------------------------------ |
| `brand`        | `#1766E8` | Primary blue: CTAs, active states    |
| `brand-dark`   | `#1159CE` | Hover                                |
| `brand-press`  | `#0F4FB8` | Active/pressed                       |
| `brand-tint`   | `#EAF1FD` | Selected sidebar item, icon hover    |
| `brand-soft`   | `#E6EEFB` | Secondary button background          |
| `ink`          | `#0F2547` | Headings, primary text (navy)        |
| `ink-soft`     | `#33456A` | Body text                            |
| `muted`        | `#67758F` | Secondary text                       |
| `faint`        | `#8E9BB2` | Placeholder, chevrons                |
| `canvas`       | `#F1F4FA` | Page background                      |
| `panel`        | `#FFFFFF` | Cards, navbar, drawer                |
| `rail`         | `#FBFCFE` | Sidebar background                   |
| `line`         | `#E7ECF4` | Subtle borders and dividers          |
| `line-strong`  | `#DDE3EC` | Sidebar edge, navbar divider         |
| `field`        | `#F2F4F8` | Search input background              |
| `coral`        | `#F13F2D` | Free Food accent                     |
| `coral-soft`   | `#FCE2E3` | Category badge / urgency pill bg     |
| `coral-text`   | `#E23522` | Text on coral tints                  |
| `map-*`        | various   | Placeholder map palette              |

No gradients beyond the map/hero illustrations, no dark mode, no neon, no
glassmorphism, no heavy transparency.

### Category colours

`MARKER_PALETTE` in `lib/constants.ts` maps each `MarkerColor` to a `solid` marker
fill, a `soft` tint for pills and badges, and a readable `text` colour:

| Category      | Marker colour | Solid     |
| ------------- | ------------- | --------- |
| Free Food     | coral         | `#F13F2D` |
| Social        | pink          | `#F7609B` |
| Academic      | blue          | `#1B68EA` |
| Career        | orange        | `#FA8625` |
| Sports        | green         | `#30B45E` |
| Entertainment | purple        | `#9451EE` |
| (study/teal)  | teal          | `#2FB7C9` |

`teal` exists because the reference shows a teal graduation-cap pin alongside the blue
academic pin; it is a marker colour, not a separate category.

## Typography

Inter throughout, except map building labels which use `--font-serif` to match the
reference's map lettering.

| Element                | Size / weight  |
| ---------------------- | -------------- |
| "Campus Connect"       | 22px / 800     |
| Navbar subtitle        | 12.5px / 500   |
| Search placeholder     | 15px / 400     |
| Sidebar nav item       | 15.5px / 600–700 |
| Event title            | 32px / 800     |
| Event location         | 15px / 700     |
| Body / description     | 15px / 400, line-height 1.35 |
| Metadata               | 12–14.5px      |
| Large statistics       | 24px / 800     |
| Filter pills           | 14px / 600     |
| Map building labels    | 15px serif     |
| Map street labels      | 12.5px / 500   |

Text is crisp and compact — resist oversizing.

## Animation

Motion is subtle and premium; nothing bounces, pulses continuously, rotates, or scales
dramatically.

- Sidebar nav hover: 150ms colour transition.
- Filter pills and icon buttons: `translateY(-1px)` on hover, `scale(0.97)` on press.
- Primary buttons: slight lift on hover, `scale(0.98)` on press.
- Event markers: idle still; hover `scale(1.08)` with a 3px lift; the selected marker is
  larger and carries a soft outer glow.
- Drawer: slides in from the right in ~300ms and out in ~260ms, easing
  `[0.32, 0.72, 0, 1]`. Its in-flow column width animates to 0 on exit so the map
  expands into the space while the card translates offscreen. Below 900px it becomes a
  bottom sheet animating on the Y axis instead.

## Responsive behaviour

Custom breakpoints are declared as Tailwind screens: `tablet: 900px`,
`desktop: 1200px`.

- **≥1200px** — full layout: 276px sidebar, 416px drawer column, map dominant. Primary
  target is ~1440–1600px, especially 1536×864. The app fills the viewport
  (`min-height: 100vh`) and the desktop layout does not scroll the page.
- **900–1199px** — sidebar narrows to 236px and the drawer column to 360px; the map
  stays the largest region. Some secondary navbar text is hidden.
- **<900px** — the sidebar becomes a hamburger-triggered overlay with a backdrop, and
  the drawer becomes a bottom sheet over the map. Panels scroll internally
  (`.scrollbar-none`) rather than breaking the layout.

Desktop is the priority; mobile only needs to be reasonable.

## Accessibility

Real `<button>` elements everywhere, `aria-label` on every icon-only control,
`aria-pressed` / `aria-current` on selection state, a visible `:focus-visible` ring,
`role="img"` plus a descriptive label on the decorative SVG illustrations, and
`aria-hidden` on purely decorative glyphs.

## Frontend interactivity (browser-only)

The approved UI is interactive, with everything running in the browser: React state,
browser APIs and the existing components. There is no API route, database, auth or
server persistence. State lives in `lib/use-campus-state.ts`, and `components/CampusApp.tsx`
wires it into the shell shared by `/` and `/events/[id]`.

| Feature | How it works |
| --- | --- |
| Pan / zoom | `components/map/use-map-view.ts` transforms the map layer with motion values (no React re-render while dragging). Drag, wheel/trackpad, pinch, arrow keys, and the +/− controls; zoom 1×–3×. Pins, labels and the user dot sit on counter-scaled `MapAnchor`s, so they stay aligned and constant-size. |
| Marker selection | Every pin selects its event, opens the drawer and gets the selected glow. |
| Event drawer | Fully data-driven. Built-in pizza keeps its bespoke hero; other events use `CategoryHeroArt`. |
| Geolocation | `lib/use-geolocation.ts`. Requested **only** when Near Me or the locate control is used, never on load. Kept in memory only (never sent or stored). `watchPosition` moves the dot. After a denial it never re-prompts and shows a subtle message instead. Off-campus positions are explained, not faked. `lib/geo.ts` projects lat/lng onto the stylised map. |
| Search | Local events only: title, category, location and host. Filters the pins live and offers a keyboard-navigable result list. |
| Filters | Sidebar categories + Saved, the single-select Trending / Near Me / Free Food pills, and the Today / All Categories menus all compose. An empty state offers "Show all events". |
| I'm Going / Saved | Per-event toggles in memory; counts update locally. Saved has a sidebar count and filter. Reset on refresh by design. |
| Directions | Standard Google Maps walking link in a new tab (no maps SDK). Session events route to their pin's coordinates. |
| Post Event | `CreateEventModal` → "Choose on map" (tap the map; Esc cancels) → the new event appears as a marker immediately. |
| Temporary events | Exist only in the current session and disappear on refresh. The drawer says so, share explains that links need persistence, and they never get a URL. |
| Routes / share | `/events/[id]` is statically generated for built-in events (unknown IDs 404). Selecting an event syncs the URL and tab title via `history.replaceState`. Share uses the native share sheet or copies the link. |

Intentional visual changes from the approved baseline: the location dot only renders
from a real browser location (it used to be decorative), and the drawer hero gained
Save and Share buttons beside the close button.

Still presentation-only: the notification bell, the account menu, the campus stats
figures, and the mock events' distance and time strings.

## Phase 2: Mapbox integration

`CampusMapPlaceholder` is the single seam. It owns the static illustration, labels,
markers, user dot and controls, and exposes the camera through `viewRef`
(`centerOn`, `reset`):

```ts
{
  events: CampusEvent[]; selectedEventId: string | null; onSelectEvent: (id: string) => void;
  viewRef?: Ref<MapViewHandle>; userPoint?: MapPoint | null; onLocate: () => void;
  onPickPoint?: (point: MapPoint) => void; draftPin?: MapPoint & {...} | null;
}
```

To integrate Mapbox:

1. Add `CampusMap.tsx` with the **same props and handle**, and swap the import in
   `CampusApp.tsx`.
2. Delete `CampusMapArt.tsx` and `use-map-view.ts`; Mapbox owns the camera.
3. Replace `mapX` / `mapY` with real `lng` / `lat`, and drop the `lib/geo.ts` projection.
4. Keep `MapFilters`, `CampusStats`, `MapToast` and the drawer as overlays.
5. Keep the map desaturated so event markers stay the most saturated thing on screen.

## Future backend integration

- Replace `MOCK_EVENTS` with a typed fetch; `CampusEvent` is already the wire shape.
- Persist posted events (then drop `isTemporary` and give them `/events/[id]` URLs),
  RSVPs, and saved events.
- Auth for the account cluster, and real counts for the campus stats bar.

None of this belongs in the visual components: keep data fetching in server components
or dedicated hooks, and keep the presentational components taking plain props.

## Working conventions

- The reference screenshot is authoritative for anything visual. Measure, do not guess.
- Stay modular: small focused components, no giant files, no duplicate components, no
  speculative abstraction.
- No backend code, data fetching, or side effects inside visual components.
- Maintain the established token system; add a token rather than hard-coding a new
  colour twice.
- Avoid new dependencies. If something needs ~40 lines of local SVG instead of a
  package, write the SVG.
- `npm run build` must pass before any change is done.
