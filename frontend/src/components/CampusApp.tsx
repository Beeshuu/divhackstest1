"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  campusFromCollege,
  campusMapKey,
  campusMapToGeo,
  eventCampusId,
  geoToCampusMap,
  isLocationOnCampus,
  sharesCampusMap,
} from "@/lib/campuses";
import { filesToEventImages, markPrimary, MAX_EVENT_IMAGES, userLedPrimaryImage } from "@/lib/event-images";
import { communityEventFromApi, communityEventNumericId } from "@/lib/community-events";
import { CATEGORY_STYLE } from "@/lib/constants";
import { useAuth } from "@/lib/auth";
import { useCampusNotices } from "@/lib/use-campus-notices";
import { eventPath, useCampusState } from "@/lib/use-campus-state";
import { useEventHistory } from "@/lib/use-event-history";
import { dateTodayAt } from "@/lib/utils";
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
    images: [],
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
  const { user, authFetch } = useAuth();
  const campus = campusFromCollege(user?.college);
  const state = useCampusState(initialEventId, user?.id, user?.name, campus.spec.id);
  const deliverPhoton = useCallback(
    (title: string, body: string) => {
      if (!user?.photonNotificationsEnabled) return;
      void authFetch("/api/notices/photon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      }).catch(() => undefined);
    },
    [authFetch, user?.photonNotificationsEnabled],
  );
  const notices = useCampusNotices(user?.id, state.events, state.going, deliverPhoton);
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
    const created = state.createEvent(draft, user?.name ?? "You", campus.spec.id);
    if (!created) return;
    setComposer("closed");
    setDraft(emptyDraft());
    mapRef.current?.centerOn({ x: created.mapX, y: created.mapY });
    state.showToast("Your event is on the map. Other students will see it under User Led Events.");

    if (!draft.point) return;
    const start = dateTodayAt(draft.startTime);
    const end = dateTodayAt(draft.endTime);
    if (end <= start) end.setDate(end.getDate() + 1);
    const geo = campusMapToGeo(draft.point, campus.spec.id);
    void authFetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: created.title,
        category: created.category,
        description: created.description,
        locationName: created.locationName,
        address: created.address,
        latitude: geo.lat,
        longitude: geo.lng,
        startsAt: start.toISOString(),
        closesAt: end.toISOString(),
      }),
    }).then(async (response) => {
      if (!response.ok) return;
      const body = (await response.json()) as { id?: number };
      if (body.id != null) {
        for (const [index, image] of (created.images ?? []).entries()) {
          await authFetch(`/api/events/${body.id}/images`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: image.url, primary: Boolean(image.isPrimary) || index === 0 }),
          });
        }
      }
      void state.refreshLiveEvents();
    });
  };

  useEffect(() => {
    if (composer !== "picking") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setComposer("form");
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [composer]);

  // Projected every render so the live pin follows watchPosition updates.
  const campusEvents = state.events.filter((event) =>
    sharesCampusMap(eventCampusId(event), campus.spec.id),
  );
  const userOnMap =
    geo.position && isLocationOnCampus(geo.position, campus.spec.id)
      ? geoToCampusMap(geo.position, campus.spec.id)
      : null;

  useEffect(() => {
    if (!geo.position) return;
    const onCampus = isLocationOnCampus(geo.position, campus.spec.id);
    setOutOfReach(!onCampus);
    if (onCampus) setHideOutOfReach(false);
  }, [campus.spec.id, geo.position]);

  /** Asks for location, then shows the pin only while the user is on campus. */
  const locateUser = async (options?: { quiet?: boolean }): Promise<boolean> => {
    const result = await geo.request();
    if (!result.position) {
      setOutOfReach(false);
      const message = LOCATION_MESSAGES[result.status];
      if (message && !options?.quiet) state.showToast(message);
      return false;
    }
    if (!isLocationOnCampus(result.position, campus.spec.id)) {
      setOutOfReach(true);
      setHideOutOfReach(false);
      if (!options?.quiet) state.showToast(OUT_OF_REACH);
      return false;
    }
    setOutOfReach(false);
    mapRef.current?.centerOn(geoToCampusMap(result.position, campus.spec.id), 1.8);
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
  };

  const handleLocateButton = async () => {
    const located = await locateUser();
    if (!located) mapRef.current?.reset();
  };

  const handlePill = (pill: MapPill) => {
    state.setMapPill(pill);
  };

  return (
    <div className="flex h-screen min-h-screen flex-col overflow-hidden bg-canvas">
      <TopNavbar
        onOpenSidebar={() => setSidebarOpen(true)}
        onAskGemini={openGemini}
        events={state.events}
        notices={notices.notices}
        unreadNotices={notices.unread}
        onNoticesSeen={notices.markSeen}
        query={state.query}
        onQueryChange={state.setQuery}
        results={state.searchResults}
        onSelectResult={(event) => {
          state.selectEvent(event.id);
          mapRef.current?.centerOn({ x: event.mapX, y: event.mapY });
        }}
        onOpenAccount={setAccountView}
        photonEnabled={user?.photonNotificationsEnabled}
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
            const closingPanel =
              (filter === "tbd" ||
                filter === "remote" ||
                filter === "userLed" ||
                filter === "saved") &&
              state.sidebarFilter === filter;
            const next = closingPanel ? "all" : filter;
            state.setSidebarFilter(next);
            if (next === "all") {
              state.setDateFilter("today");
              state.setCategoryFilter("all");
              state.setMapPill("trending");
            }
            setSidebarOpen(false);
          }}
          savedCount={state.saved.size}
          tbdCount={state.tbdCount}
          remoteCount={state.remoteCount}
          userLedCount={state.userLedCount}
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
            key={campusMapKey(campus.spec.id)}
            campus={campus}
            viewRef={mapRef}
            events={
              state.sidebarFilter === "tbd" || state.sidebarFilter === "remote"
                ? []
                : state.visibleEvents.filter(
                    (event) => event.locationKind !== "tbd" && event.locationKind !== "remote",
                  )
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
                ? {
                    ...draft.point,
                    ...CATEGORY_STYLE[draft.category],
                    imageUrl: userLedPrimaryImage({
                      source: "user",
                      images: draft.images,
                      primaryImageUrl: draft.images.find((image) => image.isPrimary)?.url ?? draft.images[0]?.url,
                    }),
                  }
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
            dateFilter={state.dateFilter}
            onDateChange={state.setDateFilter}
            categoryFilter={state.categoryFilter}
            onCategoryChange={state.setCategoryFilter}
          />
          )}
          <CampusStats
            events={campusEvents}
            goingCount={campusEvents.reduce((total, event) => total + event.goingCount, 0) + state.going.size}
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
          {(state.sidebarFilter === "tbd" ||
            state.sidebarFilter === "remote" ||
            state.sidebarFilter === "userLed" ||
            state.sidebarFilter === "saved") && (
            <LocationEventsList
              filter={state.sidebarFilter}
              events={state.visibleEvents}
              onSelect={openEvent}
              onClose={() => {
                state.setSidebarFilter("all");
                state.setDateFilter("today");
                state.setCategoryFilter("all");
                state.setMapPill("trending");
              }}
              goingIds={state.going}
              onAccept={
                state.sidebarFilter === "userLed"
                  ? (event) => {
                      if (state.going.has(event.id)) return;
                      state.toggleGoing(event.id);
                      notices.notifyJoin(event);
                      state.showToast(`You're going to ${event.title}. We'll remind you 30 minutes before it starts.`);
                    }
                  : undefined
              }
              onReject={
                state.sidebarFilter === "userLed"
                  ? (event) => {
                      state.rejectEvent(event.id);
                      if (state.selectedEvent?.id === event.id) state.closeDrawer();
                      state.showToast("This event won’t show on your map unless you search for it.");
                    }
                  : undefined
              }
            />
          )}
          <MapEmptyState
            visible={
              state.sidebarFilter !== "tbd" &&
              state.sidebarFilter !== "remote" &&
              state.sidebarFilter !== "userLed" &&
              state.sidebarFilter !== "saved" &&
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
            events={state.events}
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
              onToggleGoing={() => {
                const joining = !state.going.has(selected.id);
                state.toggleGoing(selected.id);
                if (joining) {
                  notices.notifyJoin(selected);
                  state.showToast(`You're going to ${selected.title}. We'll remind you 30 minutes before it starts.`);
                }
              }}
              isSaved={state.saved.has(selected.id)}
              onToggleSaved={() => state.toggleSaved(selected.id)}
              onShare={() => shareEvent(selected, state.showToast)}
              onDirections={() => setDirectionsEvent(selected)}
              isRejected={state.rejected.has(selected.id)}
              onReject={() => {
                state.rejectEvent(selected.id);
                state.closeDrawer();
                state.showToast("This event won’t show on your map unless you search for it.");
              }}
              onRestore={() => {
                state.restoreEvent(selected.id);
                state.showToast("This event will show on your map again.");
              }}
              onAddPhotos={
                selected.source === "user" && selected.hostedByMe
                  ? async (files) => {
                      const current = selected.images ?? [];
                      const added = (await filesToEventImages(files)).slice(0, MAX_EVENT_IMAGES - current.length);
                      const apiId = communityEventNumericId(selected.id);
                      if (apiId) {
                        let latest = selected.images;
                        for (const [index, image] of added.entries()) {
                          const response = await authFetch(`/api/events/${apiId}/images`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              image: image.url,
                              primary: current.length === 0 && index === 0,
                            }),
                          });
                          if (!response.ok) continue;
                          const row = await response.json();
                          const mapped = communityEventFromApi(row, user?.id);
                          if (mapped) latest = mapped.images;
                        }
                        if (latest) state.updateUserEventImages(selected.id, latest);
                        void state.refreshLiveEvents();
                        return;
                      }
                      const next = [...current, ...added];
                      const primary = next.findIndex((image) => image.isPrimary);
                      state.updateUserEventImages(selected.id, markPrimary(next, primary >= 0 ? primary : 0));
                    }
                  : undefined
              }
              onSetPrimaryPhoto={
                selected.source === "user" && selected.hostedByMe
                  ? (index) => {
                      const next = markPrimary(selected.images ?? [], index);
                      state.updateUserEventImages(selected.id, next);
                      const apiId = communityEventNumericId(selected.id);
                      const imageId = next[index]?.id;
                      if (apiId && imageId != null) {
                        void authFetch(`/api/events/${apiId}/images/${imageId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ primary: true }),
                        }).then((response) => {
                          if (response.ok) void state.refreshLiveEvents();
                        });
                      }
                    }
                  : undefined
              }
              onRemovePhoto={
                selected.source === "user" && selected.hostedByMe
                  ? (index) => {
                      const removed = selected.images?.[index];
                      const next = (selected.images ?? []).filter((_, item) => item !== index);
                      const primary = next.findIndex((image) => image.isPrimary);
                      state.updateUserEventImages(selected.id, markPrimary(next, primary >= 0 ? primary : 0));
                      const apiId = communityEventNumericId(selected.id);
                      if (apiId && removed?.id != null) {
                        void authFetch(`/api/events/${apiId}/images/${removed.id}`, { method: "DELETE" }).then(
                          (response) => {
                            if (response.ok) void state.refreshLiveEvents();
                          },
                        );
                      }
                    }
                  : undefined
              }
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
