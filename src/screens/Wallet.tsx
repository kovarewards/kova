import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/AppText';
import { TabBar, TabKey } from '../components/TabBar';
import { dark } from '../constants/theme';
import { supabase } from '../lib/supabase';

const CATEGORY_LABEL: Record<string, string> = {
  dining: 'Dining', groceries: 'Groceries', gas: 'Gas', ev_charging: 'EV Charging',
  travel: 'Travel', transit: 'Transit', pharmacy: 'Pharmacy', entertainment: 'Entertainment',
  streaming: 'Streaming', shopping: 'Shopping', other: 'Other',
};

function daysAgo(dateStr?: string | null) {
  if (!dateStr) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
}

type WalletCard = {
  id: string; name: string; colorHex: string | null;
  annualFee: number; verifiedAt: string | null;
};
type RotatingInfo = { category: string; multiplier: number; pointsType: string; daysLeft: number };

type Props = { onAddCard: () => void; onNavigateTab: (tab: TabKey) => void };

export function WalletScreen({ onAddCard, onNavigateTab }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [cards, setCards] = useState<WalletCard[]>([]);
  const [capturedByCard, setCapturedByCard] = useState<Record<string, number>>({});
  const [rotatingByCard, setRotatingByCard] = useState<Record<string, RotatingInfo | null>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('user_cards')
      .select('card_id, cards(id, name, color_hex, annual_fee, verified_at)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .then(({ data }) => {
        setCards(
          (data ?? []).map((r: any) => ({
            id: r.cards.id,
            name: r.cards.name,
            colorHex: r.cards.color_hex,
            annualFee: r.cards.annual_fee ?? 0,
            verifiedAt: r.cards.verified_at,
          }))
        );
      });
  }, [userId]);

  useEffect(() => {
    if (!userId || cards.length === 0) return;
    const yearStart = `${new Date().getFullYear()}-01-01`;
    const today = new Date().toISOString().split('T')[0];

    cards.forEach((card) => {
      if (card.annualFee > 0) {
        supabase
          .from('user_captures')
          .select('value_captured')
          .eq('user_id', userId)
          .eq('card_id', card.id)
          .gte('captured_at', yearStart)
          .then(({ data }) => {
            const total = (data ?? []).reduce((s, r: any) => s + Number(r.value_captured), 0);
            setCapturedByCard((prev) => ({ ...prev, [card.id]: total }));
          });
      } else {
        supabase
          .from('reward_categories')
          .select('category, multiplier, points_type, end_date')
          .eq('card_id', card.id)
          .not('end_date', 'is', null)
          .gte('end_date', today)
          .order('end_date', { ascending: true })
          .limit(1)
          .then(({ data }) => {
            const row: any = data?.[0];
            setRotatingByCard((prev) => ({
              ...prev,
              [card.id]: row
                ? {
                    category: row.category,
                    multiplier: row.multiplier,
                    pointsType: row.points_type,
                    daysLeft: Math.ceil((new Date(row.end_date).getTime() - Date.now()) / 86400000),
                  }
                : null,
            }));
          });
      }
    });
  }, [userId, cards]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.spread}>
          <Text style={styles.h1}>Wallet</Text>
          <TouchableOpacity style={styles.pillAcc} onPress={onAddCard}>
            <Text style={styles.pillAccText}>＋ ADD CARD</Text>
          </TouchableOpacity>
        </View>

        {cards.map((card) => {
          const captured = capturedByCard[card.id];
          const rotating = rotatingByCard[card.id];
          const verifiedDays = daysAgo(card.verifiedAt);
          const hasFee = card.annualFee > 0;
          const pct = hasFee && captured !== undefined ? Math.min(100, (captured / card.annualFee) * 100) : 0;
          const payingForItself = hasFee && captured !== undefined && captured >= card.annualFee;

          return (
            <View key={card.id} style={styles.card}>
              <View style={styles.spread}>
                <View style={styles.rowline}>
                  <View style={[styles.minicard, { backgroundColor: card.colorHex ?? dark.surf3 }]} />
                  <View>
                    <Text style={styles.cardName}>{card.name}</Text>
                    <Text style={styles.tiny}>{hasFee ? `$${card.annualFee} annual fee` : 'No annual fee'}</Text>
                  </View>
                </View>
                {verifiedDays !== null && (
                  <Text style={styles.vbadge}>
                    ✓ <Text style={styles.vbadgeBold}>{verifiedDays}d</Text>
                  </Text>
                )}
              </View>

              {hasFee && captured !== undefined && (
                <>
                  <View style={[styles.spread, { marginTop: 8 }]}>
                    <Text style={styles.tinyLabel}>FEE vs VALUE EARNED</Text>
                    <Text style={[styles.feeValueText, payingForItself && styles.feeValueGood]}>
                      ${captured.toFixed(0)} / ${card.annualFee}
                      {payingForItself ? ' ✓ paying for itself' : ` · ${pct.toFixed(0)}%`}
                    </Text>
                  </View>
                  <View style={[styles.bar, { marginTop: 4 }]}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${pct}%`, backgroundColor: payingForItself ? dark.green : dark.gold },
                      ]}
                    />
                  </View>
                </>
              )}

              {!hasFee && rotating && (
                <View style={styles.rotatingBox}>
                  <Text style={styles.rotatingText} numberOfLines={1}>
                    Rotating · {rotating.multiplier}× {CATEGORY_LABEL[rotating.category] ?? rotating.category}
                  </Text>
                  <Text style={styles.rotatingDays}>⏳ {rotating.daysLeft}d left</Text>
                </View>
              )}
            </View>
          );
        })}

        {cards.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.tiny}>No cards yet — tap &quot;＋ ADD CARD&quot; to build your wallet.</Text>
          </View>
        )}
      </ScrollView>

      <TabBar active="wallet" onNavigate={onNavigateTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: dark.bg },
  screen: { flex: 1 },
  content: { padding: 20, gap: 13, paddingBottom: 30 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowline: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  h1: { fontSize: 22, fontWeight: '900', color: dark.text, letterSpacing: -0.6 },
  tiny: { fontSize: 14, color: dark.dim },
  tinyLabel: { fontSize: 12, color: dark.dim, letterSpacing: 1.3 },
  card: { backgroundColor: dark.surf, borderWidth: 1, borderColor: dark.border, borderRadius: 18, padding: 16 },
  minicard: { width: 58, height: 38, borderRadius: 7 },
  cardName: { fontSize: 16, fontWeight: '800', color: dark.text },
  vbadge: { fontSize: 12, color: dark.muted },
  vbadgeBold: { color: dark.green, fontWeight: '700' },
  pillAcc: {
    backgroundColor: dark.accentSoft, borderColor: dark.accentBorder, borderWidth: 1,
    borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12,
  },
  pillAccText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3, color: dark.accent },
  feeValueText: { fontSize: 12, fontWeight: '700', color: dark.gold },
  feeValueGood: { color: dark.green },
  bar: { height: 6, backgroundColor: dark.surf3, borderRadius: 99, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 99 },
  rotatingBox: {
    marginTop: 8, backgroundColor: dark.accentSoft, borderColor: dark.accentBorder, borderWidth: 1,
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  },
  rotatingText: { fontSize: 12, fontWeight: '700', color: dark.accent, flexShrink: 1 },
  rotatingDays: { fontSize: 12, fontWeight: '700', color: dark.gold, flexShrink: 0 },
});
