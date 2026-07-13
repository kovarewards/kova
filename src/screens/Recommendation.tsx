import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput } from '../components/AppText';
import { TabBar, TabKey } from '../components/TabBar';
import { dark } from '../constants/theme';
import { supabase } from '../lib/supabase';
import {
  getRecommendations, logCapture, getWalletGapCard,
  CardRecommendation, WalletGapCard,
} from '../engine/recommendations';
import { track } from '../lib/analytics';

const CATEGORY_LABEL: Record<string, string> = {
  dining: 'Dining', groceries: 'Groceries', gas: 'Gas', ev_charging: 'EV Charging',
  travel: 'Travel', transit: 'Transit', pharmacy: 'Pharmacy', entertainment: 'Entertainment',
  streaming: 'Streaming', shopping: 'Shopping', other: 'Other',
};

function daysAgo(dateStr?: string) {
  if (!dateStr) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
}

export type RecommendationTarget = { name: string; category: string };

type Props = { target: RecommendationTarget; onBack: () => void; onNavigateTab: (tab: TabKey) => void };

export function RecommendationScreen({ target, onBack, onNavigateTab }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [spendInput, setSpendInput] = useState('100');
  const [spendAmount, setSpendAmount] = useState(100);
  const [recs, setRecs] = useState<CardRecommendation[]>([]);
  const [gapCard, setGapCard] = useState<WalletGapCard | null>(null);
  const [usedCardId, setUsedCardId] = useState<string | null>(null);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    const parsed = parseFloat(spendInput);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const id = setTimeout(() => setSpendAmount(parsed), 400);
    return () => clearTimeout(id);
  }, [spendInput]);

  useEffect(() => {
    if (!userId) return;
    getRecommendations(userId, target.category, spendAmount).then(setRecs);
  }, [userId, target.category, spendAmount]);

  useEffect(() => {
    if (!userId || recs.length === 0) {
      setGapCard(null);
      return;
    }
    getWalletGapCard(target.category, spendAmount, recs.map((r) => r.cardId), recs[0].valuePerHundred).then(
      setGapCard
    );
  }, [userId, recs, target.category, spendAmount]);

  async function handleUsedIt(rec: CardRecommendation) {
    if (!userId || logging) return;
    setLogging(true);
    const { error } = await logCapture(userId, rec, target.category, spendAmount);
    setLogging(false);
    if (!error) {
      setUsedCardId(rec.cardId);
      track.recUsed(target.category, rec.vsWorstSaving);
    }
  }

  const best = recs[0];
  const rest = recs.slice(1);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.tiny}>← BACK</Text>
        </TouchableOpacity>

        <View style={[styles.spread, { marginTop: 5 }]}>
          <View style={styles.recTextCol}>
            <Text style={styles.h1} numberOfLines={1}>{target.name}</Text>
            <View style={styles.spendRow}>
              <Text style={styles.sub}>{CATEGORY_LABEL[target.category] ?? target.category} · est. $</Text>
              <TextInput
                value={spendInput}
                onChangeText={setSpendInput}
                keyboardType="decimal-pad"
                selectTextOnFocus
                style={styles.spendInput}
              />
              <Text style={styles.sub}> spend</Text>
            </View>
          </View>
          <View style={styles.pillAcc}>
            <Text style={styles.pillAccText}>{recs.length} CARDS RANKED</Text>
          </View>
        </View>

        {best && (
          <View style={[styles.card, styles.cardHighlight]}>
            <View style={styles.spread}>
              <View style={styles.pillAcc}>
                <Text style={styles.pillAccText}>★ BEST CARD</Text>
              </View>
              {daysAgo(best.verifiedAt) !== null && (
                <Text style={styles.vbadge}>
                  ✓ <Text style={styles.vbadgeBold}>Verified {daysAgo(best.verifiedAt)}d ago</Text>
                </Text>
              )}
            </View>
            <View style={[styles.spread, { marginTop: 8 }]}>
              <View style={styles.recInfo}>
                <View style={[styles.minicard, { backgroundColor: best.colorHex ?? dark.surf3 }]} />
                <View style={styles.recTextCol}>
                  <Text style={styles.bestCardName} numberOfLines={1}>{best.cardName}</Text>
                  <Text style={styles.tiny} numberOfLines={1}>{best.multiplier}× {best.pointsType}</Text>
                </View>
              </View>
              <View style={styles.recValueCol}>
                <Text style={styles.bestValue}>${best.valuePerHundred.toFixed(2)}</Text>
                <Text style={styles.tiny}>on ${spendAmount} spend</Text>
              </View>
            </View>
            {rest.length > 0 && best.vsWorstSaving > 0 && (
              <Text style={styles.deltaText}>+${best.vsWorstSaving.toFixed(2)} vs your worst card here</Text>
            )}
            <TouchableOpacity
              style={[styles.btn, usedCardId === best.cardId && styles.btnUsed]}
              onPress={() => handleUsedIt(best)}
              disabled={logging || usedCardId === best.cardId}
            >
              <Text style={[styles.btnText, usedCardId === best.cardId && styles.btnTextUsed]}>
                {usedCardId === best.cardId
                  ? `✓ Logged $${best.vsWorstSaving.toFixed(2)} recovered`
                  : `✓  Used it — log $${best.vsWorstSaving.toFixed(2)} recovered`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {rest.map((r) => (
          <View key={r.cardId} style={[styles.card, styles.spread]}>
            <View style={styles.recInfo}>
              <View style={[styles.minicard, { backgroundColor: r.colorHex ?? dark.surf3 }]} />
              <View style={styles.recTextCol}>
                <Text style={styles.cardName} numberOfLines={1}>{r.cardName}</Text>
                <Text style={styles.tiny} numberOfLines={1}>
                  {r.multiplier}× {r.pointsType}
                  {daysAgo(r.verifiedAt) !== null ? ` · ✓ verified ${daysAgo(r.verifiedAt)}d` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.recValueCol}>
              <Text style={styles.restValue}>${r.valuePerHundred.toFixed(2)}</Text>
              <Text style={styles.tiny}>on ${spendAmount} spend</Text>
            </View>
          </View>
        ))}

        {!best && (
          <View style={styles.card}>
            <Text style={styles.tiny}>
              None of your cards earn bonus rewards for {CATEGORY_LABEL[target.category] ?? target.category} yet.
            </Text>
          </View>
        )}

        {gapCard && (
          <TouchableOpacity
            style={styles.gapCard}
            onPress={() => track.cardApplicationStarted(gapCard.cardName)}
          >
            <Text style={styles.gapText}>
              Missing ${(gapCard.valuePerHundred - (best?.valuePerHundred ?? 0)).toFixed(2)} on ${spendAmount} spend in{' '}
              {CATEGORY_LABEL[target.category] ?? target.category}?{' '}
              <Text style={styles.gapCta}>{gapCard.cardName} fills this gap →</Text>
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <TabBar active="home" onNavigate={onNavigateTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: dark.bg },
  screen: { flex: 1 },
  content: { padding: 20, gap: 13, paddingBottom: 30 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tiny: { fontSize: 14, color: dark.dim },
  h1: { fontSize: 22, fontWeight: '900', color: dark.text, letterSpacing: -0.6 },
  sub: { fontSize: 14, color: dark.dim, marginTop: 3 },
  spendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  spendInput: {
    fontSize: 14, lineHeight: 18, height: 20, color: dark.text,
    borderBottomWidth: 1, borderBottomColor: dark.border2,
    padding: 0, margin: 0, minWidth: 36,
    includeFontPadding: false, textAlignVertical: 'center',
  },
  card: { backgroundColor: dark.surf, borderWidth: 1, borderColor: dark.border, borderRadius: 18, padding: 16 },
  cardHighlight: { borderColor: dark.accentBorder, backgroundColor: dark.accentSoft },
  pillAcc: {
    backgroundColor: dark.accentSoft, borderColor: dark.accentBorder, borderWidth: 1,
    borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12, flexShrink: 0,
  },
  pillAccText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3, color: dark.accent },
  vbadge: { fontSize: 12, color: dark.muted },
  vbadgeBold: { color: dark.green, fontWeight: '700' },
  recInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  recTextCol: { flex: 1, minWidth: 0 },
  recValueCol: { alignItems: 'flex-end', flexShrink: 0, marginLeft: 8 },
  minicard: { width: 58, height: 38, borderRadius: 7 },
  bestCardName: { fontSize: 17, fontWeight: '800', color: dark.text },
  bestValue: { fontSize: 22, fontWeight: '900', color: dark.green },
  cardName: { fontSize: 15, fontWeight: '700', color: dark.text },
  restValue: { fontSize: 15, fontWeight: '800', color: dark.dim },
  deltaText: { fontSize: 13, color: dark.green, marginTop: 7, marginBottom: 8 },
  btn: { backgroundColor: dark.accent, borderRadius: 14, alignItems: 'center', paddingVertical: 14 },
  btnUsed: { backgroundColor: dark.surf3 },
  btnText: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2, color: dark.bg },
  btnTextUsed: { color: dark.green },
  gapCard: {
    borderWidth: 1, borderColor: dark.border2, borderStyle: 'dashed', borderRadius: 18,
    padding: 16, alignItems: 'center',
  },
  gapText: { fontSize: 13, color: dark.dim, textAlign: 'center' },
  gapCta: { color: dark.accent, fontWeight: '700' },
});
