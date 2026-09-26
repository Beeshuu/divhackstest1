"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";

import { EventDrawer } from "@/components/events/EventDrawer";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { CampusMapPlaceholder } from "@/components/map/CampusMapPlaceholder";
import { CampusStats } from "@/components/map/CampusStats";
import { MapFilters } from "@/components/map/MapFilters";
import { FEATURED_EVENT_ID, MOCK_EVENTS } from "@/data/mock-events";

const FEATURED_EVENT =
  MOCK_EVENTS.find((event) => event.id === FEATURED_EVENT_ID) ?? MOCK_EVENTS[0];

export default function HomePage() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
            events={MOCK_EVENTS}
            selectedEventId={drawerOpen ? FEATURED_EVENT.id : null}
            onSelectEvent={(eventId) => {
              if (eventId === FEATURED_EVENT.id) setDrawerOpen(true);
            }}
          />
          <MapFilters />
          <CampusStats />
        </main>

        <AnimatePresence initial={false}>
          {drawerOpen && (
            <EventDrawer event={FEATURED_EVENT} onClose={() => setDrawerOpen(false)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
