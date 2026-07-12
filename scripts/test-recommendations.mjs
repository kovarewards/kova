// One-off integration test for src/engine/recommendations.ts.
//
// recommendations.ts can only run inside the Expo/React Native runtime — its
// Supabase client (src/lib/supabase.ts) is backed by expo-secure-store, a
// native module with no Node equivalent. This script mirrors the same
// queries and ranking logic against the real database using the service_role
// key (required because `cards`/`reward_categories` have no insert policy
// for anon), inserts temporary fixtures, exercises getRecommendations,
// logCapture, and getLedgerSummary, prints the results, then deletes
// everything it inserted.
//
// Run this yourself in a separate PowerShell window so the key never enters
// the chat:
//
//   $env:SUPABASE_SERVICE_ROLE_KEY = "paste_your_service_role_key_here"
//   node scripts/test-recommendations.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

function loadEnvUrl() {
  if (process.env.EXPO_PUBLIC_SUPABASE_URL) return process.env.EXPO_PUBLIC_SUPABASE_URL;
  const line = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .find((l) => l.startsWith('EXPO_PUBLIC_SUPABASE_URL='));
  return line?.split('=')[1]?.trim();
}

const SUPABASE_URL = loadEnvUrl();
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL (checked .env) or SUPABASE_SERVICE_ROLE_KEY (checked shell env).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const TEST_USER_ID = '00000000-0000-4000-8000-000000000001';

function scoreForCategory(userCards, category, spendAmount = 100) {
  const today = new Date().toISOString().split('T')[0];
  const scored = userCards.flatMap((uc) => {
    const card = uc.cards;
    const cats = card.reward_categories || [];
    const match =
      cats.find(
        (c) =>
          c.category === category &&
          (!c.start_date || c.start_date <= today) &&
          (!c.end_date || c.end_date >= today)
      ) || cats.find((c) => c.category === 'other');
    if (!match) return [];
    const cpp = match.cpp ?? 0.01;
    return [{
      cardId: card.id,
      cardName: card.name,
      colorHex: card.color_hex,
      multiplier: match.multiplier,
      pointsType: match.points_type,
      valuePerHundred: match.multiplier * spendAmount * cpp,
      vsWorstSaving: 0,
      isRotating: !!(match.start_date && match.end_date),
      expiresAt: match.end_date ?? undefined,
      verifiedAt: match.verified_at ?? undefined,
    }];
  });
  scored.sort((a, b) => b.valuePerHundred - a.valuePerHundred);
  const worst = scored.at(-1)?.valuePerHundred ?? 0;
  scored.forEach((r) => { r.vsWorstSaving = +(r.valuePerHundred - worst).toFixed(2); });
  return scored;
}

let insertedCardIds = [];

async function main() {
  console.log('Inserting temporary test cards...\n');

  const { data: cards, error: cardErr } = await supabase
    .from('cards')
    .insert([
      { name: 'TEST — Amex Gold', issuer: 'American Express', network: 'Amex', annual_fee: 325, color_hex: '#D4AF37' },
      { name: 'TEST — Chase Sapphire Preferred', issuer: 'Chase', network: 'Visa', annual_fee: 95, color_hex: '#1A3C6E' },
      { name: 'TEST — Chase Freedom Unlimited', issuer: 'Chase', network: 'Visa', annual_fee: 0, color_hex: '#7C8FFF' },
    ])
    .select();
  if (cardErr) throw cardErr;
  insertedCardIds = cards.map((c) => c.id);
  const [gold, csp, freedom] = cards;

  const { error: catErr } = await supabase.from('reward_categories').insert([
    { card_id: gold.id, category: 'dining', multiplier: 4, points_type: 'MR', cpp: 0.02 },
    { card_id: gold.id, category: 'other', multiplier: 1, points_type: 'MR', cpp: 0.02 },
    { card_id: csp.id, category: 'dining', multiplier: 3, points_type: 'UR', cpp: 0.0205 },
    { card_id: csp.id, category: 'other', multiplier: 1, points_type: 'UR', cpp: 0.0205 },
    { card_id: freedom.id, category: 'dining', multiplier: 1.5, points_type: 'UR', cpp: 0.0205 },
    { card_id: freedom.id, category: 'other', multiplier: 1.5, points_type: 'UR', cpp: 0.0205 },
  ]);
  if (catErr) throw catErr;

  const { error: ucErr } = await supabase
    .from('user_cards')
    .insert(cards.map((c) => ({ user_id: TEST_USER_ID, card_id: c.id, is_active: true })));
  if (ucErr) throw ucErr;

  const { data: userCards, error: fetchErr } = await supabase
    .from('user_cards')
    .select(`card_id, cards(id, name, color_hex,
      reward_categories(category, multiplier, points_type,
      cpp, start_date, end_date, verified_at))`)
    .eq('user_id', TEST_USER_ID)
    .eq('is_active', true);
  if (fetchErr) throw fetchErr;

  console.log('getRecommendations("dining") — ranked output:\n');
  const ranked = scoreForCategory(userCards, 'dining');
  console.table(
    ranked.map((r) => ({
      Card: r.cardName,
      Multiplier: `${r.multiplier}x`,
      'Value / $100': `$${r.valuePerHundred.toFixed(2)}`,
      'vs Worst': `+$${r.vsWorstSaving.toFixed(2)}`,
    }))
  );

  console.log('\nlogCapture() — logging the top pick as "used"...');
  const top = ranked[0];
  const { error: captureErr } = await supabase.from('user_captures').insert({
    user_id: TEST_USER_ID,
    card_id: top.cardId,
    category: 'dining',
    spend_estimate: 100,
    value_captured: top.vsWorstSaving,
  });
  if (captureErr) throw captureErr;
  console.log(`Logged: ${top.cardName} — $${top.vsWorstSaving.toFixed(2)} captured.`);

  console.log('\ngetLedgerSummary() — year-to-date total:');
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const { data: captures, error: ledgerErr } = await supabase
    .from('user_captures')
    .select('value_captured, captured_at')
    .eq('user_id', TEST_USER_ID)
    .gte('captured_at', yearStart);
  if (ledgerErr) throw ledgerErr;
  const yearToDate = +(captures ?? []).reduce((s, r) => s + Number(r.value_captured), 0).toFixed(2);
  console.log({ yearToDate, captureCount: captures?.length ?? 0 });
}

main()
  .catch((e) => {
    console.error('\nTest failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    console.log('\nCleaning up test data...');
    await supabase.from('user_captures').delete().eq('user_id', TEST_USER_ID);
    await supabase.from('user_cards').delete().eq('user_id', TEST_USER_ID);
    if (insertedCardIds.length) {
      await supabase.from('cards').delete().in('id', insertedCardIds);
    }
    console.log('Done — database restored to its prior state.');
  });
