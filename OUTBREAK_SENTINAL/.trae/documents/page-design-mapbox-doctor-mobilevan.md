# Page Design Spec — Mapbox in Doctor + MobileVan Dashboards

## Global styles (applies to all pages)
- Design tokens (desktop-first):
  - Background: `#0B1220` (app shell), surfaces `#111B2E`, borders `#23324D`
  - Text: primary `#EAF0FF`, secondary `#A7B4D1`, muted `#7D8AA8`
  - Accent: `#3B82F6` (primary), success `#22C55E`, warning `#F59E0B`, danger `#EF4444`
  - Typography scale: 12/14/16/20/24 (base 14–16 on desktop)
  - Buttons: solid primary + subtle secondary; hover = +6% brightness; disabled = 40% opacity
  - Links: accent color + underline on hover
- Map styling:
  - Use a Mapbox style optimized for dark UI (dark basemap), with high-contrast route line.
  - Route line: primary accent with 70–90% opacity; outline stroke for legibility.
- Responsiveness:
  - Desktop (≥1024): split layout (map + list/panels).
  - Tablet/mobile (<1024): stacked layout; map becomes primary, list/panels collapse into drawers.

## Page: Sign-in
### Layout
- Flexbox centered card (max-width 420px) within full-height container.

### Meta Information
- Title: "Sign in | Dashboard"
- Description: "Secure access to Doctor and MobileVan dashboards."

### Page Structure
1. Header (brand + environment label if applicable)
2. Sign-in card
3. Footer (support link + version)

### Sections & Components
- Sign-in card
  - Inputs: email/username + password (or the existing auth method)
  - Primary action: Sign in
  - Error area: inline validation + auth failure banner
  - Loading state: disable form + show spinner on button
- Post-login routing
  - Redirect to `/doctor` or `/mobilevan` based on role

## Page: Doctor Dashboard
### Layout
- Hybrid CSS Grid:
  - Left: Map canvas (fluid)
  - Right: Sidebar (360–440px) with van list + details drawer
  - Top: App header (sticky)

### Meta Information
- Title: "Doctor Dashboard | Live Map"
- Description: "Track MobileVan locations and inspect routes in real time."
- Open Graph: title/description + generic dashboard preview

### Page Structure
1. Header bar
2. Main grid: Map area + Sidebar

### Sections & Components
- Header bar (sticky)
  - Left: Page title + last refresh timestamp
  - Center: Search (van id/name)
  - Right: User menu + Sign out

- Map area (Mapbox GL JS)
  - Map controls (top-right): zoom, compass, fullscreen (optional)
  - Custom controls (top-left):
    - Filter chip group: Online / Offline / All
    - “Follow selected van” toggle
  - Markers:
    - Van markers with status color ring (online=green, stale=amber, offline=red)
    - Hover tooltip: van name + last update age
    - Click selects van and opens details panel
  - Route overlay:
    - When a van is selected, request current route and render polyline + start/end pins
  - Empty / error states:
    - If no data: show overlay message and retry button

- Sidebar
  - Van list panel
    - List rows: name/id, status dot, last update age
    - Sorting: default by online then recency
  - Details drawer (appears when selected)
    - Summary: van name/id, connection state, last known coordinates
    - Route summary: ETA + distance (if provided)
    - Live indicator: “Connected” / “Reconnecting…”

- Live updates behavior
  - WebSocket status pill in header: Connected / Reconnecting / Offline
  - Smooth marker transitions (short linear interpolation) but never fabricate coordinates

## Page: MobileVan Dashboard
### Layout
- Desktop: two-column grid
  - Left: Map (primary)
  - Right: Route + status panel (360–440px)
- Tablet/mobile: map first, right panel becomes bottom drawer

### Meta Information
- Title: "MobileVan Dashboard | Navigation"
- Description: "View your assigned route and live position updates."

### Page Structure
1. Header bar
2. Main grid: Map + Route/Status panel

### Sections & Components
- Header bar
  - Left: Van identifier + session state
  - Right: Connection status pill + user menu

- Map (Mapbox GL JS)
  - Centered on own van by default
  - Recenter button (floating, bottom-right)
  - Heading indicator (arrow/chevron) if heading provided
  - Route overlay always visible when route exists

- Route/Status panel
  - Route summary card: ETA, distance, last updated
  - Next instruction card (only if backend provides steps): next maneuver + distance-to-next
  - Actions (only if backend supports today): Start / Pause / Complete
  - Alerts:
    - “Stale GPS” warning if updates exceed threshold (e.g., >30s)
    - “Disconnected” banner if WebSocket is down; show retry spinner

- Failure handling
  - If WebSocket fails: fallback to periodic REST refresh (degraded mode) and clearly label it.
  - If route fetch fails: keep showing last known route with “out of date” badge.
