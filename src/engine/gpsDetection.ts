import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

const PLACES_MAP: Record<string, string> = {
  restaurant: 'dining', food: 'dining', cafe: 'dining', bar: 'dining',
  grocery_or_supermarket: 'groceries', supermarket: 'groceries',
  gas_station: 'gas', airport: 'travel', lodging: 'travel',
  pharmacy: 'pharmacy', drugstore: 'pharmacy',
  movie_theater: 'entertainment', shopping_mall: 'shopping',
};

export type DetectedMerchant = {
  name: string; category: string; placeId: string; distanceM: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_RADIUS_M = 30;
const MAX_CONFIDENT_DISTANCE_M = 60;
const MAX_FIX_UNCERTAINTY_M = 50;

let cache: {
  lat: number; lng: number; at: number; result: DetectedMerchant | null;
} | null = null;

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function detectNearbyMerchant(force = false): Promise<DetectedMerchant | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  const { coords } = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Highest,
  });

  if (
    !force &&
    cache &&
    Date.now() - cache.at < CACHE_TTL_MS &&
    haversineM(coords.latitude, coords.longitude, cache.lat, cache.lng) < CACHE_RADIUS_M
  ) {
    return cache.result;
  }

  // A fix this uncertain can't reliably clear the 60m confidence gate below —
  // stay silent rather than guess against a coordinate that might be 100m off.
  if (coords.accuracy != null && coords.accuracy > MAX_FIX_UNCERTAINTY_M) {
    cache = { lat: coords.latitude, lng: coords.longitude, at: Date.now(), result: null };
    return null;
  }

  const { data: top, error } = await supabase.functions.invoke('places-lookup', {
    body: { lat: coords.latitude, lng: coords.longitude },
  });

  let result: DetectedMerchant | null = null;
  if (!error && top) {
    const d = haversineM(coords.latitude, coords.longitude, top.lat, top.lng);
    if (d <= MAX_CONFIDENT_DISTANCE_M) {
      let category = 'other';
      for (const t of top.types ?? []) {
        if (PLACES_MAP[t]) { category = PLACES_MAP[t]; break; }
      }
      result = { name: top.name, category, placeId: top.placeId, distanceM: Math.round(d) };
    }
  }

  cache = { lat: coords.latitude, lng: coords.longitude, at: Date.now(), result };
  return result;
}
