import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CampusApp } from "@/components/CampusApp";
import { RequireAuth } from "@/components/RequireAuth";
import { MOCK_EVENTS } from "@/data/mock-events";

interface EventPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Deep link for built-in events. Events created in the browser have no route:
 * they only exist in that session until server persistence is added.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return MOCK_EVENTS.map((event) => ({ id: event.id }));
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = MOCK_EVENTS.find((e) => e.id === id);
  if (!event) return {};
  return {
    title: `${event.title} at ${event.locationName} — Campus Connect`,
    description: event.description,
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  if (!MOCK_EVENTS.some((event) => event.id === id)) notFound();
  return (
    <RequireAuth>
      <CampusApp initialEventId={id} />
    </RequireAuth>
  );
}
