import type { BowlingCenter } from './types';

interface OverpassElement {
  id: number;
  type: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  center?: {
    lat?: number;
    lon?: number;
  };
  tags?: Record<string, string>;
}

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_SEARCH_LIMIT = 60;

const searchCache = new Map<string, { at: number; items: BowlingCenter[] }>();

function escapeOverpassRegex(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}

function normalizeCenter(element: OverpassElement): BowlingCenter | null {
  const tags = element.tags || {};
  const name = (tags.name || '').trim();
  if (!name) return null;

  const addressParts = [tags['addr:housenumber'], tags['addr:street']]
    .filter(Boolean)
    .join(' ')
    .trim();
  const city = tags['addr:city'] || tags['is_in:city'] || tags['addr:suburb'] || undefined;
  const state = tags['addr:state'] || undefined;
  const postalCode = tags['addr:postcode'] || undefined;

  const latitude = typeof element.lat === 'number'
    ? element.lat
    : typeof element.center?.lat === 'number'
      ? element.center.lat
      : undefined;
  const longitude = typeof element.lon === 'number'
    ? element.lon
    : typeof element.center?.lon === 'number'
      ? element.center.lon
      : undefined;

  return {
    id: `osm:${element.type}:${element.id}`,
    name,
    address: addressParts || undefined,
    city,
    state,
    postalCode,
    latitude,
    longitude,
  };
}

function dedupeCenters(items: BowlingCenter[]): BowlingCenter[] {
  const seen = new Set<string>();
  const result: BowlingCenter[] = [];

  for (const item of items) {
    const key = [
      item.name.trim().toLowerCase(),
      (item.city || '').trim().toLowerCase(),
      (item.state || '').trim().toLowerCase(),
      (item.address || '').trim().toLowerCase(),
    ].join('|');

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

export function formatBowlingCenterLocation(center: BowlingCenter): string {
  const city = center.city?.trim();
  const state = center.state?.trim();

  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;
  return '';
}

export function formatBowlingCenterLabel(center: BowlingCenter): string {
  const location = formatBowlingCenterLocation(center);
  return location ? `${center.name} (${location})` : center.name;
}

export function summarizeBowlingCenters(centers: BowlingCenter[], maxVisible = 2): string {
  if (!centers.length) return 'Centers: none selected';
  const visible = centers.slice(0, maxVisible).map(center => center.name);
  const remaining = centers.length - visible.length;
  return remaining > 0
    ? `Centers: ${visible.join(', ')} +${remaining} more`
    : `Centers: ${visible.join(', ')}`;
}

export async function searchUsBowlingCenters(query: string, limit = 25): Promise<BowlingCenter[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const safeLimit = Math.max(5, Math.min(limit, MAX_SEARCH_LIMIT));
  const cacheKey = `${trimmed.toLowerCase()}::${safeLimit}`;
  const now = Date.now();
  const cached = searchCache.get(cacheKey);

  if (cached && now - cached.at < CACHE_TTL_MS) {
    return cached.items;
  }

  const escaped = escapeOverpassRegex(trimmed);
  const overpassQuery = `
[out:json][timeout:30];
area["ISO3166-1"="US"][admin_level=2]->.us;
(
  node["leisure"="bowling_alley"]["name"~"${escaped}",i](area.us);
  way["leisure"="bowling_alley"]["name"~"${escaped}",i](area.us);
  relation["leisure"="bowling_alley"]["name"~"${escaped}",i](area.us);
  node["amenity"="bowling_alley"]["name"~"${escaped}",i](area.us);
  way["amenity"="bowling_alley"]["name"~"${escaped}",i](area.us);
  relation["amenity"="bowling_alley"]["name"~"${escaped}",i](area.us);
);
out center tags ${safeLimit};
`.trim();

  const response = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: overpassQuery,
  });

  if (!response.ok) {
    throw new Error('Unable to load bowling centers right now.');
  }

  const payload = await response.json();
  const elements: OverpassElement[] = Array.isArray(payload?.elements) ? payload.elements : [];
  const normalized = dedupeCenters(elements.map(normalizeCenter).filter((item): item is BowlingCenter => !!item));

  const q = trimmed.toLowerCase();
  normalized.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aRank = aName === q ? 0 : aName.startsWith(q) ? 1 : aName.includes(q) ? 2 : 3;
    const bRank = bName === q ? 0 : bName.startsWith(q) ? 1 : bName.includes(q) ? 2 : 3;
    if (aRank !== bRank) return aRank - bRank;
    return a.name.localeCompare(b.name);
  });

  searchCache.set(cacheKey, { at: now, items: normalized });
  return normalized;
}
