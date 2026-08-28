# Provider Interface Implementation - GPWA-8

## Summary

This implementation establishes the foundation for integrating external route providers (Komoot, Strava) into gpx2wanderer.

## What's Implemented

### 1. Multi-Provider Credential Management (`src/providers/auth/credentials.ts`)

**Features:**
- Machine-bound encryption using AES-256-GCM
- Credentials stored in `~/.gpx2wanderer/.env`
- Support for three credential types:
  - **Komoot**: email, password, token, userID
  - **Strava**: clientId, clientSecret, accessToken, refreshToken
  - **Wanderer**: username, password, host, cookie (optional)

**API:**
```typescript
// Komoot
hasKomootCredentials(): boolean
loadKomootCredentials(): KomootCredentials | null
saveKomootCredentials(credentials: KomootCredentials): void

// Strava
hasStravaCredentials(): boolean
loadStravaCredentials(): StravaCredentials | null
saveStravaCredentials(credentials: StravaCredentials): void

// Wanderer
hasWandererCredentials(): boolean
loadWandererCredentials(): WandererCredentials | null
saveWandererCredentials(credentials: WandererCredentials): void
saveWandererCookie(cookie: string): void
```

**Security:**
- Encryption key derived from `hostname:username` using scrypt
- Each credential field encrypted separately with unique IV
- Auth tags prevent tampering
- File permissions: 0o600 (owner read/write only)
- Directory permissions: 0o700 (owner only)

### 2. Provider Stubs

**KomootProvider** (`src/providers/komoot/index.ts`):
- Implements `RouteProvider` interface
- All methods throw "not yet implemented" errors
- Ready for full implementation in follow-up story

**StravaProvider** (`src/providers/strava/index.ts`):
- Implements `RouteProvider` interface
- All methods throw "not yet implemented" errors
- Ready for full implementation in follow-up story

### 3. Utility Functions

**env-parser** (`src/utils/env-parser.ts`):
- Parses .env file format
- Handles comments and empty lines
- Returns key-value pairs

### 4. Tests

**Comprehensive test coverage** (`src/__tests__/providers/credentials.test.ts`):
- 29 tests covering all credential operations
- Tests for encryption/decryption
- Tests for multi-provider isolation
- Tests for error handling (invalid data, missing credentials)
- All tests passing ✅

## File Structure

```
src/
├── utils/
│   └── env-parser.ts                    # .env file parser
├── providers/
│   ├── types.ts                         # RouteProvider interface (already existed)
│   ├── auth/
│   │   └── credentials.ts               # Multi-provider credential management
│   ├── komoot/
│   │   └── index.ts                     # KomootProvider stub
│   └── strava/
│       └── index.ts                     # StravaProvider stub
└── __tests__/
    └── providers/
        └── credentials.test.ts          # Credential management tests
```

## Next Steps (Follow-up Stories)

### Komoot Provider Implementation
1. Port Komoot API client from `komoot-route-extractor`
2. Implement authentication flow (email/password → token)
3. Implement route listing (GET /v007/tours/)
4. Implement route download with GPX building
5. Integrate with existing GPX modules

### Strava Provider Implementation
1. Implement OAuth2 authentication flow
2. Implement activity listing (GET /api/v3/athlete/activities)
3. Implement activity download as GPX
4. Handle Strava-specific data mapping

## Design Decisions

1. **Fail-fast approach**: Methods throw errors if not implemented, no silent failures
2. **Multi-provider isolation**: Each provider's credentials are independent
3. **Machine-bound encryption**: Credentials can't be copied to another machine
4. **Existing GPX modules**: Will reuse `src/gpx/` modules for GPX building
5. **Separate config directory**: Uses `~/.gpx2wanderer/` instead of `~/.komoot2wanderer/`

## Testing

Run tests with:
```bash
npm test -- credentials.test.ts
```

All 29 tests pass successfully.
