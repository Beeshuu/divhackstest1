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
import { useCampusState } from "@/lib/use-campus-state";

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
        </main>

        <AnimatePresence initial={false}>
          {state.drawerOpen && (
            <EventDrawer event={state.selectedEvent} onClose={state.closeDrawer} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
