# gpx2wanderer — Project Overview

## Problem Statement

When importing GPX tracks into Wanderer, the ability to edit routes post-import depends on having waypoints (via-points) along the track. Different route sources handle this differently:

- **Komoot**: Provides via-points in tour data, but they're Komoot-specific and may not align with Valhalla's routing
- **Strava**: Records GPS tracks without waypoints. No native support for via-points
- **Manual waypoint extraction**: Tedious and error-prone

The core issue: **waypoints from one routing engine (Komoot) don't translate cleanly to another (Valhalla)**, causing unexpected route changes when editing in Wanderer.

## Solution: Algorithmic Waypoint Generation

Instead of extracting waypoints from the source, we generate them algorithmically using a hybrid approach:

### Phase 1: Douglas-Peucker Simplification
- Apply geometric line simplification to the raw GPX track
- Preserves sharp turns and direction changes
- Configurable epsilon parameter (default: 30m)
- Produces ~20-30 initial waypoints

### Phase 2: Valhalla Route Validation Loop
- Send simplified waypoints to self-hosted Valhalla instance
- Valhalla reconstructs the route using its routing engine
- Compare Valhalla's route against the original GPX track
- If max divergence exceeds tolerance (default: 50m), add waypoint at point of maximum divergence
- Repeat until routes match within tolerance or max iterations reached (default: 10)

### Result
- **Minimal waypoints** — only where needed for routing accuracy
- **Provider-agnostic** — works with any GPX input (Komoot, Strava, manual uploads)
- **Valhalla-native** — waypoints are optimized for the same routing engine that Wanderer uses
- **Fully editable** — post-import edits in Wanderer produce predictable rerouting

## Technical Architecture

### Core Components
┌─────────────────────────────────────────────────────────┐
│ Docker Compose Stack                                    │
├─────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│ │ Wanderer     │ │   Valhalla   │ │ gpx2wanderer │      │
│ │ (existing)   │ │  (existing)  │ │    (new)     │      │
│ │              │ │              │ │              │      │
│ │ Port 3000    │ │  Port 8002   │ │ Port 4000    │      │
│ └──────────────┘ └──────────────┘ └──────────────┘      │
└─────────────────────────────────────────────────────────┘

### Internal Structure

gpx2wanderer/
├── src/
│ ├── server/ # Hono web server (Phase 2)
│ │ ├── app.ts # Main app, routes
│ │ ├── middleware/ # Auth, error handling
│ │ └── routes/ # API endpoints
│ ├── providers/ # Route source integrations
│ │ ├── types.ts # RouteProvider interface
│ │ ├── komoot/ # Komoot API client (future)
│ │ └── strava/ # Strava API client (future)
│ ├── waypoints/ # Waypoint generation algorithms
│ │ ├── simplifier.ts # Douglas-Peucker implementation
│ │ ├── valhalla.ts # Valhalla routing client
│ │ └── generator.ts # Hybrid orchestration
│ ├── gpx/ # GPX parsing and serialization
│ │ ├── parser.ts # Read GPX files
│ │ ├── serializer.ts # Write GPX files
│ │ └── types.ts # GPX data structures
│ ├── wanderer/ # Wanderer API integration
│ │ ├── api.ts # Upload trails, update metadata
│ │ ├── category-mapping.ts
│ │ └── credentials.ts
│ ├── crypto/ # Credential encryption
│ │ └── encryption.ts # AES-256-GCM
│ └── ui/ # SvelteKit frontend (Phase 2)
├── Dockerfile
└── docker-compose.yml


## Tech Stack

### Backend: Hono
- Modern, lightweight web framework built on Web Standards API
- TypeScript-first with excellent type safety
- Minimal boilerplate, fast performance
- Ideal for Docker deployment (small footprint)

### Frontend: SvelteKit (Phase 2)
- Compiled to vanilla JavaScript → smaller bundles
- Less boilerplate than React (no useState/useEffect)
- Built-in routing and server-side rendering
- Perfect for dashboard-style UI

### Credential Encryption: AES-256-GCM
- Machine-bound key derivation (scrypt)
- Per-provider credential storage (Komoot, Strava, Wanderer)
- Encrypted at rest in `~/.gpx2wanderer/.env`

### Language: TypeScript
- Existing codebase provides ~60% reusable logic
- Excellent ecosystem for HTTP clients, XML parsing, encryption
- Type safety for complex data transformations
- Already productive in the language

## Implementation Phases

### Phase 1: MVP (CLI-First)
**Goal:** Validate the waypoint generation algorithm with real GPX files

**Deliverables:**
- GPX parser and serializer
- Douglas-Peucker simplification
- Valhalla route validation loop
- Wanderer upload integration
- CLI interface with progress reporting
- Docker deployment

**Success Criteria:**
- Can import a GPX file and generate waypoints
- Waypoints produce routes that match original track within tolerance
- Successfully uploads to Wanderer with correct metadata

### Phase 2: Web UI
**Goal:** Provide a user-friendly interface for managing imports and credentials

**Deliverables:**
- Hono backend with REST API
- SvelteKit frontend
- Credential management UI
- Settings configuration UI
- Import history and progress tracking
- Real-time progress updates (WebSocket/SSE)

### Phase 3: Provider Integration
**Goal:** Integrate with Komoot and Strava APIs for seamless route import

**Deliverables:**
- Komoot provider (authenticate, fetch tours, download GPX)
- Strava provider (OAuth2 flow, fetch activities, download GPX)
- UI for browsing and selecting routes from providers
- Batch import support

## Key Design Decisions

1. **New project, not a fork** — The use case fundamentally changes from "extract Komoot routes" to "import any GPX into Wanderer"
2. **CLI-first approach** — Validate the algorithm before building the web UI
3. **Self-hosted Valhalla** — Leverage existing infrastructure, no external API dependencies
4. **Valhalla-native waypoints** — Generate waypoints optimized for the same routing engine Wanderer uses
5. **SQLite over Postgres** — Simpler for single-user tool, no extra container needed
6. **Hono over Express/NestJS** — Lighter weight, better TypeScript support, less boilerplate
7. **SvelteKit over React** — Less boilerplate for CRUD UI, smaller bundles

## Success Metrics

- **Waypoint quality**: Generated waypoints produce routes that match original track within 50m tolerance
- **Waypoint count**: Typically 20-50 waypoints for a 50km route (vs. 1000+ raw track points)
- **Processing time**: < 30 seconds for a typical cycling route
- **User experience**: One-command import with clear progress reporting
- **Editability**: Post-import edits in Wanderer produce predictable, expected rerouting

## Future Considerations

- **Batch processing**: Import multiple routes in one operation
- **Route comparison**: Visualize original vs. Valhalla-routed track
- **Custom costing models**: Support for different activity types (gravel, MTB, hiking)
- **Waypoint refinement**: Manual adjustment of generated waypoints before upload
- **Export formats**: Support for additional output formats beyond GPX
