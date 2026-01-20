import type { Itinerary } from '../types';

/** Normalize saved or generated itinerary items while preserving plan detail content. */
export function normalizeItineraryItems(items: Itinerary[]): Itinerary[] {
  return items.map((item, index) => ({
    ...item,
    day: item.day ?? index + 1,
    title: item.title ?? '',
    details: item.details ?? ''
  }));
}
