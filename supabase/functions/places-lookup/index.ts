import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';

serve(async (req) => {
  const { lat, lng } = await req.json();
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return new Response(JSON.stringify({ error: 'lat/lng required' }), { status: 400 });
  }
  const url =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
    `?location=${lat},${lng}&rankby=distance&type=establishment` +
    `&key=${Deno.env.get('GOOGLE_PLACES_KEY')}`;
  const data = await fetch(url).then((r) => r.json());
  const top = data.results?.[0] ?? null;
  return new Response(
    JSON.stringify(
      top
        ? {
            name: top.name,
            types: top.types,
            placeId: top.place_id,
            lat: top.geometry.location.lat,
            lng: top.geometry.location.lng,
          }
        : null
    ),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
