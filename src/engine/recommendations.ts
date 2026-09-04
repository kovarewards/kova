import { supabase } from '../lib/supabase';

export type CardRecommendation = {
  cardId: string; cardName: string; colorHex: string;
  multiplier: number; pointsType: string;
  valuePerHundred: number; vsWorstSaving: number;
  isRotating: boolean; expiresAt?: string;
  verifiedAt?: string; annualFee: number; pooledVia?: string;
};

// Chase Ultimate Rewards: these three cards unlock full transfer-partner value for
// UR points pooled in from ANY other Chase UR-earning card in the same wallet — e.g.
// Freedom Unlimited's own points are worth 1 cent (cash-out only) UNTIL combined
// into an owned Sapphire Preferred/Reserve or Ink Business Preferred account, at
// which point the pooled points are worth that card's transfer rate instead.
// Verified against chase.com's combine-points policy, 2026-09-03.
const CHASE_UR_PREMIUM_UNLOCKERS = new Set([
  'Chase Sapphire Preferred', 'Chase Sapphire Reserve', 'Chase Ink Business Preferred',
]);

export async function getRecommendations(
  userId: string,
  merchantCategory: string,
  spendAmount = 100
): Promise<CardRecommendation[]> {
  const { data: userCards } = await supabase
    .from('user_cards')
    .select(`card_id, cards(id, name, color_hex, annual_fee,
      reward_categories(category, multiplier, points_type,
      cpp, start_date, end_date, verified_at))`)
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!userCards?.length) return [];
  const today = new Date().toISOString().split('T')[0];

  // Highest cpp among owned premium UR unlockers, if any — this is what pooled-in
  // UR points from other owned Chase cards would actually redeem for.
  const ownedPremiumUrCpp = Math.max(
    0,
    ...userCards
      .map((uc) => uc.cards as any)
      .filter((card) => CHASE_UR_PREMIUM_UNLOCKERS.has(card.name))
      .flatMap((card) => (card.reward_categories || []).map((c: any) => c.cpp ?? 0))
  );

  const scored: CardRecommendation[] = userCards.flatMap((uc) => {
    const card = uc.cards as any;
    const cats: any[] = card.reward_categories || [];
    const match =
      cats.find(
        (c) =>
          c.category === merchantCategory &&
          (!c.start_date || c.start_date <= today) &&
          (!c.end_date || c.end_date >= today)
      ) || cats.find((c) => c.category === 'other');
    if (!match) return [];
    let cpp = match.cpp ?? 0.01;
    let pooledVia: string | undefined;
    if (
      match.points_type === 'UR' &&
      !CHASE_UR_PREMIUM_UNLOCKERS.has(card.name) &&
      ownedPremiumUrCpp > cpp
    ) {
      cpp = ownedPremiumUrCpp;
      pooledVia = [...CHASE_UR_PREMIUM_UNLOCKERS].find((name) =>
        userCards.some((uc2) => (uc2.cards as any).name === name)
      );
    }
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
      annualFee: card.annual_fee ?? 0,
      pooledVia,
    }];
  });

  // On an exact tie, prefer the card with the higher annual fee — nudges
  // customers toward using the card whose fee most needs offsetting.
  scored.sort((a, b) => b.valuePerHundred - a.valuePerHundred || b.annualFee - a.annualFee);
  const worst = scored.at(-1)?.valuePerHundred ?? 0;
  scored.forEach((r) => {
    r.vsWorstSaving = +(r.valuePerHundred - worst).toFixed(2);
  });
  return scored;
}

export async function logCapture(
  userId: string,
  rec: CardRecommendation,
  category: string,
  spendEstimate: number
) {
  return supabase.from('user_captures').insert({
    user_id: userId,
    card_id: rec.cardId,
    category,
    spend_estimate: spendEstimate,
    value_captured: rec.valuePerHundred,
  });
}

export type WalletGapCard = { cardName: string; colorHex: string; valuePerHundred: number };

export async function getWalletGapCard(
  category: string,
  spendAmount: number,
  ownedCardIds: string[],
  currentBestValue: number
): Promise<WalletGapCard | null> {
  const { data } = await supabase
    .from('reward_categories')
    .select('multiplier, cpp, card_id, cards(name, color_hex)')
    .eq('category', category)
    .not('cpp', 'is', null);

  const candidates: WalletGapCard[] = (data ?? [])
    .filter((r: any) => !ownedCardIds.includes(r.card_id))
    .map((r: any) => ({
      cardName: r.cards.name,
      colorHex: r.cards.color_hex,
      valuePerHundred: r.multiplier * spendAmount * r.cpp,
    }))
    .sort((a, b) => b.valuePerHundred - a.valuePerHundred);

  const best = candidates[0];
  return best && best.valuePerHundred > currentBestValue ? best : null;
}

export async function getLedgerSummary(userId: string) {
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const { data } = await supabase
    .from('user_captures')
    .select('value_captured, captured_at')
    .eq('user_id', userId)
    .gte('captured_at', yearStart)
    .order('captured_at', { ascending: true });
  const total = (data ?? []).reduce((s, r) => s + Number(r.value_captured), 0);

  // Run rate since the first capture this year, not since Jan 1 — otherwise a
  // brand-new user's pace looks far too low (a $1.70 capture today shouldn't
  // read as "on pace for $3" just because 7 calendar months have passed).
  let projectedYearEnd = 0;
  if (data && data.length > 0) {
    const daysSinceFirst = Math.max(1, (Date.now() - new Date(data[0].captured_at).getTime()) / 86400000);
    projectedYearEnd = (total / daysSinceFirst) * 365;
  }

  return { yearToDate: +total.toFixed(2), captureCount: data?.length ?? 0, projectedYearEnd: +projectedYearEnd.toFixed(2) };
}
