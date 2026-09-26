"use client";

import { useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";

import { EventDrawer } from "@/components/events/EventDrawer";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNavbar } from "@/components/layout/TopNavbar";
import {
  CampusMapPlaceholder,
  type MapViewHandle,
} from "@/components/map/CampusMapPlaceholder";
import { CampusStats } from "@/components/map/CampusStats";
import { MapFilters } from "@/components/map/MapFilters";
import { MapToast } from "@/components/map/MapToast";
import { eventPath, useCampusState } from "@/lib/use-campus-state";
import type { CampusEvent } from "@/types/event";

/** Native share sheet when available, otherwise copy the event link. */
async function shareEvent(event: CampusEvent, notify: (message: string) => void) {
  const path = eventPath(event);
  if (!path) {
    notify(
      "Share links arrive once events are saved permanently — this one only exists in your current session.",
    );
    return;
  }
  const url = `${window.location.origin}${path}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: event.title, text: `${event.title} at ${event.locationName}`, url });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    notify("Event link copied to your clipboard.");
  } catch {
    notify(`Share this link: ${url}`);
  }
}

interface CampusAppProps {
  /** Pre-selected event, used by the /events/[id] route. */
  initialEventId?: string;
}

/** The full-screen Campus Connect shell, shared by `/` and `/events/[id]`. */
export function CampusApp({ initialEventId }: CampusAppProps) {
  const state = useCampusState(initialEventId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mapRef = useRef<MapViewHandle>(null);

  return (
    <div className="flex h-screen min-h-screen flex-col overflow-hidden bg-canvas">
      <TopNavbar onOpenSidebar={() => setSidebarOpen(true)} />

      <div className="relative flex min-h-0 flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 top-[72px] z-30 bg-ink/25 tablet:hidden"
          />
        )}

        <main className="relative min-w-0 flex-1" aria-label="Campus map">
          <CampusMapPlaceholder
            viewRef={mapRef}
            events={state.visibleEvents}
            selectedEventId={state.drawerOpen ? state.selectedEvent.id : null}
            onSelectEvent={state.selectEvent}
            onLocate={() => mapRef.current?.reset()}
          />
          <MapFilters />
          <CampusStats />
          <MapToast toast={state.toast} onDismiss={state.dismissToast} />
        </main>

        <AnimatePresence initial={false}>
          {state.drawerOpen && (
            <EventDrawer
              event={state.selectedEvent}
              onClose={state.closeDrawer}
              isGoing={state.going.has(state.selectedEvent.id)}
              onToggleGoing={() => state.toggleGoing(state.selectedEvent.id)}
              isSaved={state.saved.has(state.selectedEvent.id)}
              onToggleSaved={() => state.toggleSaved(state.selectedEvent.id)}
              onShare={() => shareEvent(state.selectedEvent, state.showToast)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
