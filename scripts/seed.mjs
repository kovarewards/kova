import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Service role key: NEVER ship this in the app or paste into prompts.
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const cards = JSON.parse(readFileSync('./seed/cards.json', 'utf8'));

let inserted = 0;
let updated = 0;
let skipped = 0;

for (const c of cards) {
  const { categories, notes, ...card } = c;

  if (notes && /UNVERIFIED/i.test(notes)) {
    console.warn('⚠ SKIPPED (unverified):', card.name);
    skipped++;
    continue;
  }

  const { data: existing } = await db
    .from('cards')
    .select('id')
    .eq('name', card.name)
    .maybeSingle();

  if (existing) {
    const { error: updateErr } = await db
      .from('cards')
      .update({ ...card, verified_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (updateErr) { console.error(card.name, updateErr.message); continue; }

    await db.from('reward_categories').delete().eq('card_id', existing.id);
    await db.from('reward_categories').insert(
      categories.map((cat) => ({
        ...cat, card_id: existing.id,
        verified_at: new Date().toISOString(), source_url: card.source_url,
      }))
    );
    await db.from('benefit_changelog').insert({
      table_name: 'cards', record_id: existing.id, change_note: 'Updated via reseed',
    });
    console.log('↻', card.name, '(updated)');
    updated++;
    continue;
  }

  const { data, error } = await db
    .from('cards')
    .insert({ ...card, verified_at: new Date().toISOString() })
    .select()
    .single();
  if (error) { console.error(card.name, error.message); continue; }
  await db.from('reward_categories').insert(
    categories.map((cat) => ({
      ...cat, card_id: data.id,
      verified_at: new Date().toISOString(), source_url: card.source_url,
    }))
  );
  await db.from('benefit_changelog').insert({
    table_name: 'cards', record_id: data.id, change_note: 'Initial seed',
  });
  console.log('✓', card.name, '(inserted)');
  inserted++;
}

console.log(`\n${inserted} inserted, ${updated} updated, ${skipped} skipped as unverified.`);
