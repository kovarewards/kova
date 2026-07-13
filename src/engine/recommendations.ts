import { supabase } from '../lib/supabase';

export type CardRecommendation = {
  cardId: string; cardName: string; colorHex: string;
  multiplier: number; pointsType: string;
  valuePerHundred: number; vsWorstSaving: number;
  isRotating: boolean; expiresAt?: string;
  verifiedAt?: string;
};

export async function getRecommendations(
  userId: string,
  merchantCategory: string,
  spendAmount = 100
): Promise<CardRecommendation[]> {
  const { data: userCards } = await supabase
    .from('user_cards')
    .select(`card_id, cards(id, name, color_hex,
      reward_categories(category, multiplier, points_type,
      cpp, start_date, end_date, verified_at))`)
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!userCards?.length) return [];
  const today = new Date().toISOString().split('T')[0];

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
    .gte('captured_at', yearStart);
  const total = (data ?? []).reduce((s, r) => s + Number(r.value_captured), 0);
  return { yearToDate: +total.toFixed(2), captureCount: data?.length ?? 0 };
}
