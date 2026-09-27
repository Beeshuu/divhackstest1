"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";

import { AccountPanel, type AccountView } from "@/components/account/AccountPanel";
import { CreateEventModal } from "@/components/events/CreateEventModal";
import { EventDrawer } from "@/components/events/EventDrawer";
import { AskGeminiFab } from "@/components/gemini/AskGeminiFab";
import { AskGeminiPanel } from "@/components/gemini/AskGeminiPanel";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNavbar } from "@/components/layout/TopNavbar";
import {
  CampusMapPlaceholder,
  type MapViewHandle,
} from "@/components/map/CampusMapPlaceholder";
import { CampusStats } from "@/components/map/CampusStats";
import { DirectionsPrompt } from "@/components/map/DirectionsPrompt";
import { LocationEventsList } from "@/components/map/LocationEventsList";
import { MapEmptyState } from "@/components/map/MapEmptyState";
import { MapFilters } from "@/components/map/MapFilters";
import { MapToast } from "@/components/map/MapToast";
import { OutOfReachBanner } from "@/components/map/OutOfReachBanner";
import { PickLocationBanner } from "@/components/map/PickLocationBanner";
import { CATEGORY_STYLE } from "@/lib/constants";
import { geoToMap, isOnMap } from "@/lib/geo";
import { useAuth } from "@/lib/auth";
import { eventPath, useCampusState } from "@/lib/use-campus-state";
import { useEventHistory } from "@/lib/use-event-history";
import { useGeolocation, type GeoStatus } from "@/lib/use-geolocation";
import { useMediaQuery } from "@/lib/use-media-query";
import type { CampusEvent, EventDraft, MapPill } from "@/types/event";

const pad = (n: number) => String(n).padStart(2, "0");

/** Fresh form: starts at the next half hour, runs for an hour. */
function emptyDraft(now = new Date()): EventDraft {
  const start = new Date(now);
  start.setMinutes(now.getMinutes() < 30 ? 30 : 60, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const endTime = end.getDate() !== start.getDate() ? "23:59" : `${pad(end.getHours())}:${pad(end.getMinutes())}`;
  return {
    title: "",
    description: "",
    category: "Social",
    locationName: "",
    startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    endTime,
    point: null,
  };
}

const LOCATION_MESSAGES: Partial<Record<GeoStatus, string>> = {
  denied:
    "Location access is required to show your live marker. You can allow it in your browser settings.",
  unavailable: "Your location isn't available right now, so your live marker can't be shown.",
};

const OUT_OF_REACH = "You're out of reach — your live location is outside the campus map.";

/** Native share sheet when available, otherwise copy the event link. */
async function shareEvent(event: CampusEvent, notify: (message: string) => void) {
  const path = eventPath(event);
  if (!path) {
    notify(
      "Share links arrive once events are saved permanently — this one only exists in your current session.",
    );
    return;
  }
  const url = path.startsWith("http") ? path : `${window.location.origin}${path}`;
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
  const { user } = useAuth();
  const state = useCampusState(initialEventId);
  const history = useEventHistory(user?.id, state.events, state.going);
  const [accountView, setAccountView] = useState<AccountView | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mapRef = useRef<MapViewHandle>(null);
  const geo = useGeolocation();
  const [composer, setComposer] = useState<"closed" | "form" | "picking">("closed");
  const [draft, setDraft] = useState<EventDraft>(() => emptyDraft());
  const [outOfReach, setOutOfReach] = useState(false);
  const [hideOutOfReach, setHideOutOfReach] = useState(false);
  const [directionsEvent, setDirectionsEvent] = useState<CampusEvent | null>(null);
  const [geminiOpen, setGeminiOpen] = useState(false);
  // The mobile bottom sheet would cover the map while choosing a spot.
  const isSheet = useMediaQuery("(max-width: 899px)");
  const selected = state.selectedEvent;
  const showDrawer = Boolean(selected) && state.drawerOpen && !(isSheet && composer === "picking");

  const openComposer = () => {
    setSidebarOpen(false);
    if (!draft.title && !draft.point) setDraft(emptyDraft());
    setComposer("form");
  };

  const openGemini = () => {
    setSidebarOpen(false);
    setGeminiOpen(true);
  };

  const submitDraft = () => {
    const created = state.createEvent(draft);
    if (!created) return;
    setComposer("closed");
    setDraft(emptyDraft());
    mapRef.current?.centerOn({ x: created.mapX, y: created.mapY });
    state.showToast("Your event is on the map for this session. It will disappear when you refresh.");
  };

  useEffect(() => {
    if (composer !== "picking") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setComposer("form");
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [composer]);

  // Projected every render so the live pin follows watchPosition updates.
  const userPoint = geo.position ? geoToMap(geo.position) : null;
  const userOnMap = userPoint && isOnMap(userPoint) ? userPoint : null;

  useEffect(() => {
    if (!geo.position) return;
    const onCampus = isOnMap(geoToMap(geo.position));
    setOutOfReach(!onCampus);
    if (onCampus) setHideOutOfReach(false);
  }, [geo.position]);

  /** Asks for location, then shows the pin only while the user is on campus. */
  const locateUser = async (options?: { quiet?: boolean }): Promise<boolean> => {
    const result = await geo.request();
    if (!result.position) {
      setOutOfReach(false);
      const message = LOCATION_MESSAGES[result.status];
      if (message && !options?.quiet) state.showToast(message);
      return false;
    }
    const point = geoToMap(result.position);
    if (!isOnMap(point)) {
      setOutOfReach(true);
      setHideOutOfReach(false);
      if (!options?.quiet) state.showToast(OUT_OF_REACH);
      return false;
    }
    setOutOfReach(false);
    mapRef.current?.centerOn(point, 1.8);
    return true;
  };

  // Start watching as soon as the map is open so the live pin can appear.
  useEffect(() => {
    void locateUser({ quiet: true });
    // First visit only — later updates come from watchPosition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEvent = (event: CampusEvent) => {
    state.selectEvent(event.id);
    mapRef.current?.centerOn({ x: event.mapX, y: event.mapY });
    setDirectionsEvent(event);
  };

  const handleLocateButton = async () => {
    const located = await locateUser();
    if (!located) mapRef.current?.reset();
  };

  const handlePill = async (pill: MapPill) => {
    if (pill === "nearMe") {
      if (await locateUser()) state.setMapPill("nearMe");
      return;
    }
    state.setMapPill(pill === state.mapPill && pill !== "trending" ? "trending" : pill);
  };

  return (
    <div className="flex h-screen min-h-screen flex-col overflow-hidden bg-canvas">
      <TopNavbar
        onOpenSidebar={() => setSidebarOpen(true)}
        onAskGemini={openGemini}
        events={state.events}
        query={state.query}
        onQueryChange={state.setQuery}
        results={state.visibleEvents}
        onSelectResult={(event) => {
          state.selectEvent(event.id);
          mapRef.current?.centerOn({ x: event.mapX, y: event.mapY });
        }}
        onOpenAccount={setAccountView}
        onNotificationAction={(action) => {
          if (action === "freeFood") {
            state.setSidebarFilter("all");
            state.setMapPill("trending");
            state.setCategoryFilter("Free Food");
            state.setDateFilter("any");
            return;
          }
          state.setSidebarFilter("all");
          state.setMapPill("trending");
          state.setCategoryFilter("all");
          state.setDateFilter("today");
        }}
      />

      <div className="relative flex min-h-0 flex-1">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          selected={state.sidebarFilter}
          onSelect={(filter) => {
            state.setSidebarFilter(filter);
            setSidebarOpen(false);
          }}
          savedCount={state.saved.size}
          tbdCount={state.tbdCount}
          remoteCount={state.remoteCount}
          onPostEvent={openComposer}
          onAskGemini={openGemini}
        />

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 top-[72px] z-[55] bg-ink/25 tablet:hidden"
          />
        )}

        <main className="relative min-w-0 flex-1" aria-label="Campus map">
          <CampusMapPlaceholder
            viewRef={mapRef}
            events={
              state.sidebarFilter === "tbd" || state.sidebarFilter === "remote"
                ? []
                : state.visibleEvents
            }
            selectedEventId={state.drawerOpen && state.selectedEvent ? state.selectedEvent.id : null}
            onSelectEvent={(id) => {
              const event = state.events.find((item) => item.id === id);
              if (event) openEvent(event);
            }}
            userPoint={userOnMap}
            onLocate={handleLocateButton}
            locating={geo.status === "requesting"}
            located={Boolean(userOnMap)}
            onPickPoint={
              composer === "picking"
                ? (point) => {
                    setDraft((d) => ({ ...d, point }));
                    setComposer("form");
                  }
                : undefined
            }
            draftPin={
              composer !== "closed" && draft.point
                ? { ...draft.point, ...CATEGORY_STYLE[draft.category] }
                : null
            }
          />
          <PickLocationBanner visible={composer === "picking"} onCancel={() => setComposer("form")} />
          <OutOfReachBanner
            visible={outOfReach && !hideOutOfReach && composer !== "picking"}
            onDismiss={() => setHideOutOfReach(true)}
          />
          {composer !== "picking" && (
          <MapFilters
            activePill={state.mapPill}
            onPillClick={handlePill}
            locating={geo.status === "requesting"}
            dateFilter={state.dateFilter}
            onDateChange={state.setDateFilter}
            categoryFilter={state.categoryFilter}
            onCategoryChange={state.setCategoryFilter}
          />
          )}
          <CampusStats
            events={state.events}
            goingCount={state.events.reduce((total, event) => total + event.goingCount, 0) + state.going.size}
            active={
              state.categoryFilter === "Free Food"
                ? "freeFood"
                : state.dateFilter === "any" && state.sidebarFilter === "all"
                  ? "active"
                  : state.dateFilter === "today" && state.sidebarFilter === "all"
                    ? "happening"
                    : null
            }
            onSelect={(id) => {
              if (id === "freeFood") {
                state.setSidebarFilter("all");
                state.setMapPill("trending");
                state.setCategoryFilter("Free Food");
                state.setDateFilter("any");
                return;
              }
              if (id === "active") {
                state.setSidebarFilter("all");
                state.setMapPill("trending");
                state.setCategoryFilter("all");
                state.setDateFilter("any");
                void locateUser({ quiet: true });
                return;
              }
              state.setSidebarFilter("all");
              state.setMapPill("trending");
              state.setCategoryFilter("all");
              state.setDateFilter("today");
            }}
          />
          {(state.sidebarFilter === "tbd" || state.sidebarFilter === "remote") && (
            <LocationEventsList
              filter={state.sidebarFilter}
              events={state.visibleEvents}
              onSelect={openEvent}
            />
          )}
          <MapEmptyState
            visible={
              state.sidebarFilter !== "tbd" &&
              state.sidebarFilter !== "remote" &&
              state.events.length > 0 &&
              state.visibleEvents.length === 0
            }
            message={
              state.sidebarFilter === "saved" && !state.query
                ? "You haven't saved any events yet — use the bookmark on an event."
                : "No events match your search and filters."
            }
            onReset={state.clearFilters}
          />
          <MapToast toast={state.toast} onDismiss={state.dismissToast} />
          {!geminiOpen && !sidebarOpen && <AskGeminiFab onClick={openGemini} />}
          <AskGeminiPanel
            open={geminiOpen}
            onClose={() => setGeminiOpen(false)}
            events={state.visibleEvents.length > 0 ? state.visibleEvents : state.events}
            selectedEvent={selected ?? null}
            onSelectEvent={(event) => {
              setGeminiOpen(false);
              openEvent(event);
            }}
          />
        </main>

        <AccountPanel
          open={accountView !== null}
          view={accountView ?? "profile"}
          onViewChange={setAccountView}
          onClose={() => setAccountView(null)}
          history={history}
          onSelectEvent={(event) => {
            const live = state.events.find((item) => item.id === event.id);
            setAccountView(null);
            if (live) openEvent(live);
          }}
        />

        <CreateEventModal
          open={composer === "form"}
          draft={draft}
          onChange={setDraft}
          onClose={() => setComposer("closed")}
          onChooseOnMap={() => setComposer("picking")}
          onSubmit={submitDraft}
        />

        <AnimatePresence initial={false}>
          {showDrawer && selected && (
            <EventDrawer
              event={selected}
              onClose={state.closeDrawer}
              isGoing={state.going.has(selected.id)}
              onToggleGoing={() => state.toggleGoing(selected.id)}
              isSaved={state.saved.has(selected.id)}
              onToggleSaved={() => state.toggleSaved(selected.id)}
              onShare={() => shareEvent(selected, state.showToast)}
              onDirections={() => setDirectionsEvent(selected)}
            />
          )}
        </AnimatePresence>
      </div>

      <DirectionsPrompt
        event={directionsEvent}
        origin={geo.position}
        onClose={() => setDirectionsEvent(null)}
      />
    </div>
  );
}
