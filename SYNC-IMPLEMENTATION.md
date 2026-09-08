# Route Sync Implementation

This document describes the implementation of the route sync trigger feature (GPWA-38).

## Overview

Users can now trigger route synchronization by clicking on the "Synced" / "Not Synced" badges in the route table. The implementation includes:

- Clickable badges with loading states
- Confirmation dialog for re-syncing already synced routes
- Toast notifications for success/error feedback
- Partial cache updates (no full re-fetch needed)

## Components

### 1. Toast Component (`src/ui/src/lib/components/Toast.svelte`)

A notification component that displays messages with auto-dismiss functionality.

**Props:**
- `message`: The message to display
- `type`: 'success' | 'error' | 'info' | 'warning'
- `duration`: Auto-dismiss time in milliseconds (default: 4000)
- `onClose`: Callback when toast is closed

**Features:**
- Slide-in animation
- Auto-dismiss with configurable duration
- Manual close button
- Color-coded by type

### 2. ConfirmDialog Component (`src/ui/src/lib/lib/components/ConfirmDialog.svelte`)

A modal dialog for confirming actions.

**Props:**
- `open`: Whether the dialog is visible
- `title`: Dialog title
- `message`: Confirmation message
- `confirmLabel`: Label for confirm button
- `cancelLabel`: Label for cancel button
- `variant`: 'warning' | 'danger' | 'info'

**Events:**
- `confirm`: Fired when user confirms
- `cancel`: Fired when user cancels

**Features:**
- Backdrop click to close
- Animated entrance
- Color-coded by variant
- Accessible (ARIA attributes)

### 3. Badge Component Updates (`src/ui/src/lib/components/Badge.svelte`)

Enhanced to support clickable badges with loading states.

**New Props:**
- `clickable`: Whether the badge can be clicked (default: false)
- `loading`: Whether to show a loading spinner (default: false)

**New Events:**
- `click`: Fired when a clickable badge is clicked

**Features:**
- Renders as `<button>` when clickable (better accessibility)
- Shows spinner when loading
- Hover effects for clickable badges
- Disabled state when loading

### 4. RouteTable Component Updates (`src/ui/src/lib/components/RouteTable.svelte`)

Updated to handle sync triggers and show loading states.

**New Props:**
- `syncingRouteId`: ID of the route currently being synced

**New Events:**
- `sync`: Fired when a sync badge is clicked, includes the route data

**Features:**
- Shows "Syncing" badge with spinner for the route being synced
- Dispatches sync events to parent component
- Both "Synced" and "Not Synced" badges are clickable

### 5. Dashboard Page Updates (`src/ui/src/routes/dashboard/+page.svelte`)

Main orchestration logic for sync operations.

**New State:**
- `syncingRouteId`: Tracks which route is being synced
- `pendingSyncRoute`: Route waiting for confirmation
- `showConfirmDialog`: Whether to show confirmation dialog
- `toasts`: Array of active toast notifications

**New Functions:**
- `handleSyncRequest()`: Handles sync badge clicks
- `handleConfirmSync()`: Confirms re-sync operation
- `handleCancelSync()`: Cancels re-sync operation
- `syncRoute()`: Performs the actual sync operation
- `showToast()`: Displays a toast notification
- `removeToast()`: Removes a toast notification

**Sync Flow:**
1. User clicks sync badge
2. If route is already synced → show confirmation dialog
3. If route is not synced → sync immediately
4. Show "Syncing" badge with spinner
5. Call backend API (`POST /api/{provider}/routes/sync/{id}`)
6. On success:
   - Update local route cache (partial update)
   - Show success toast
7. On error:
   - Show error toast
8. Remove loading state

## Backend Integration

The backend already provides the necessary endpoints:

- `POST /api/komoot/routes/sync/:id` - Sync a Komoot route
- `POST /api/strava/routes/sync/:id` - Sync a Strava route

Both endpoints:
- Download the route from the provider
- Process it through the GPX pipeline
- Upload to Wanderer
- Update the sync status cache via `updateRouteSyncStatus()`

## User Experience

### Syncing a Not-Synced Route
1. User clicks "Not Synced" badge
2. Badge changes to "Syncing" with spinner
3. Backend processes the route
4. Badge updates to "Synced"
5. Success toast appears

### Re-syncing a Synced Route
1. User clicks "Synced" badge
2. Confirmation dialog appears with warning about overwriting changes
3. User confirms or cancels
4. If confirmed → same flow as above
5. If canceled → dialog closes, no sync performed

## Partial Cache Updates

The implementation uses partial cache updates to avoid re-fetching all routes:

```typescript
routes = routes.map(r => 
  r.id === route.id 
    ? { ...r, syncStatus: 'synced' as const }
    : r
);
```

This updates only the synced route's status in the local array, and the reactive stats (`stravaSynced`, `komootSynced`) automatically update.

## Testing Recommendations

1. Test syncing a not-synced route (both Komoot and Strava)
2. Test re-syncing an already synced route (confirmation flow)
3. Test canceling a re-sync
4. Test error handling (e.g., Wanderer not configured)
5. Test multiple simultaneous syncs (should be prevented by `syncingRouteId`)
6. Test toast notifications (success, error, auto-dismiss)
7. Test accessibility (keyboard navigation, screen readers)

## Future Enhancements

Potential improvements for future iterations:

- Batch sync (sync multiple routes at once)
- Sync progress indicator (percentage or step-by-step)
- Sync history/log
- Undo sync functionality
- Sync status persistence (survive page reloads)
- WebSocket for real-time sync status updates
