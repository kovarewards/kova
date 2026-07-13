import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Text } from '../components/AppText';
import { TabBar, TabKey } from '../components/TabBar';
import { dark } from '../constants/theme';
import { supabase } from '../lib/supabase';

const CATEGORY_LABEL: Record<string, string> = {
  dining: 'Dining', groceries: 'Groceries', gas: 'Gas', ev_charging: 'EV Charging',
  travel: 'Travel', transit: 'Transit', pharmacy: 'Pharmacy', entertainment: 'Entertainment',
  streaming: 'Streaming', shopping: 'Shopping', other: 'Other',
};

const CATEGORY_EMOJI: Record<string, string> = {
  dining: '🍜', groceries: '🛒', gas: '⛽', ev_charging: '🔌',
  travel: '✈️', transit: '🚇', pharmacy: '💊', entertainment: '🎬',
  streaming: '📺', shopping: '🛍️', other: '💳',
};

const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

type Capture = {
  id: string; category: string; cardName: string; colorHex: string | null;
  valueCaptured: number; capturedAt: string;
};

function formatRecentDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return 'today';
  const daysAgo = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (daysAgo < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type Props = { onNavigateTab: (tab: TabKey) => void };

export function LedgerScreen({ onNavigateTab }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const year = new Date().getFullYear();
  const [captures, setCaptures] = useState<Capture[]>([]);
  const shotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year + 1}-01-01`;
    supabase
      .from('user_captures')
      .select('id, category, value_captured, captured_at, cards(name, color_hex)')
      .eq('user_id', userId)
      .gte('captured_at', yearStart)
      .lt('captured_at', yearEnd)
      .order('captured_at', { ascending: false })
      .then(({ data }) => {
        setCaptures(
          (data ?? []).map((r: any) => ({
            id: r.id,
            category: r.category,
            cardName: r.cards?.name ?? 'Card',
            colorHex: r.cards?.color_hex ?? null,
            valueCaptured: Number(r.value_captured),
            capturedAt: r.captured_at,
          }))
        );
      });
  }, [userId, year]);

  const total = captures.reduce((s, c) => s + c.valueCaptured, 0);
  const isCurrentYear = year === new Date().getFullYear();
  const monthsElapsed = isCurrentYear ? new Date().getMonth() + 1 : 12;
  const projectedYearEnd = isCurrentYear && total > 0 ? (total * 12) / monthsElapsed : 0;

  const monthlyTotals = Array.from({ length: monthsElapsed }, (_, i) =>
    captures
      .filter((c) => new Date(c.capturedAt).getMonth() === i)
      .reduce((s, c) => s + c.valueCaptured, 0)
  );
  const maxMonth = Math.max(1, ...monthlyTotals);

  const categoryTotals = Object.entries(
    captures.reduce<Record<string, number>>((acc, c) => {
      acc[c.category] = (acc[c.category] ?? 0) + c.valueCaptured;
      return acc;
    }, {})
  )
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const maxCategory = Math.max(1, ...categoryTotals.map((c) => c.value));

  const recent = captures.slice(0, 8);

  async function handleShare() {
    if (!shotRef.current?.capture || sharing) return;
    setSharing(true);
    try {
      const uri = await shotRef.current.capture();
      const available = await Sharing.isAvailableAsync();
      if (available) await Sharing.shareAsync(uri);
      else Alert.alert('Sharing not available on this device.');
    } catch {
      Alert.alert('Could not create the share image — try again.');
    } finally {
      setSharing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.spread}>
          <Text style={styles.h1}>Ledger</Text>
          <View style={styles.pillAcc}>
            <Text style={styles.pillAccText}>{year}</Text>
          </View>
        </View>

        <ViewShot ref={shotRef} options={{ format: 'png', quality: 0.9 }}>
          <View style={[styles.card, styles.hero]}>
            <Text style={styles.heroLabel}>RECOVERED THIS YEAR</Text>
            <Text style={styles.heroTotal}>${total.toFixed(2)}</Text>
            <Text style={styles.tiny}>
              {captures.length} capture{captures.length === 1 ? '' : 's'}
              {captures.length > 0 && (
                <>
                  {' '}· avg <Text style={styles.heroBold}>${(total / captures.length).toFixed(2)}</Text> each
                </>
              )}
            </Text>

            <View style={styles.barsRow}>
              {monthlyTotals.map((v, i) => {
                const isCurrent = isCurrentYear && i === monthlyTotals.length - 1;
                const frac = v / maxMonth;
                const height = Math.max(4, frac * 48);
                let color: string = dark.surf3;
                if (i >= monthlyTotals.length * 0.7) color = dark.accent;
                else if (i >= monthlyTotals.length * 0.4) color = dark.accent2;
                return (
                  <View
                    key={i}
                    style={[
                      styles.bar,
                      { height, backgroundColor: color, opacity: isCurrent ? 0.45 : 1 },
                    ]}
                  />
                );
              })}
            </View>
            <View style={styles.monthLabels}>
              {monthlyTotals.map((_, i) => (
                <Text key={i} style={[styles.monthLabel, i === monthlyTotals.length - 1 && styles.monthLabelOn]}>
                  {MONTH_LETTERS[i]}
                </Text>
              ))}
            </View>

            {isCurrentYear && projectedYearEnd > 0 && (
              <Text style={styles.paceText}>
                On pace for <Text style={styles.paceBold}>${projectedYearEnd.toFixed(0)}</Text> by December ↗
              </Text>
            )}
          </View>
        </ViewShot>

        {categoryTotals.length > 0 && (
          <View>
            <Text style={[styles.tinyLabel, { marginBottom: 6 }]}>WHERE IT CAME FROM</Text>
            {categoryTotals.map((c, i) => (
              <View key={c.category} style={styles.categoryRow}>
                <Text style={styles.categoryLabel}>
                  {CATEGORY_EMOJI[c.category] ?? '💳'} {CATEGORY_LABEL[c.category] ?? c.category}
                </Text>
                <View style={styles.categoryBarTrack}>
                  <View
                    style={[
                      styles.categoryBarFill,
                      {
                        width: `${Math.max(6, (c.value / maxCategory) * 100)}%`,
                        backgroundColor: i === 0 ? dark.accent : i === 1 ? dark.accent2 : dark.muted,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.categoryValue}>${c.value.toFixed(0)}</Text>
              </View>
            ))}
          </View>
        )}

        {recent.length > 0 && (
          <View>
            <Text style={[styles.tinyLabel, { marginBottom: 5 }]}>RECENT CAPTURES</Text>
            {recent.map((c) => (
              <View key={c.id} style={[styles.card, styles.spread, styles.recentRow]}>
                <View style={styles.rowline}>
                  <View style={[styles.minicard, { backgroundColor: c.colorHex ?? dark.surf3 }]} />
                  <View>
                    <Text style={styles.recentTitle}>
                      {CATEGORY_EMOJI[c.category] ?? '💳'} {CATEGORY_LABEL[c.category] ?? c.category}
                    </Text>
                    <Text style={styles.tiny}>{c.cardName} · {formatRecentDate(c.capturedAt)}</Text>
                  </View>
                </View>
                <Text style={styles.recentValue}>+${c.valueCaptured.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        {captures.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.tiny}>
              No captures logged for {year} yet — tap &quot;Used it&quot; on a recommendation to start your ledger.
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.btnSecondary} onPress={handleShare} disabled={sharing || total === 0}>
          <Text style={styles.btnSecondaryText}>
            {sharing ? 'Preparing…' : `↗  Share my ${year} recap`}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <TabBar active="ledger" onNavigate={onNavigateTab} />
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
  pillAcc: {
    backgroundColor: dark.accentSoft, borderColor: dark.accentBorder, borderWidth: 1,
    borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12,
  },
  pillAccText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3, color: dark.accent },
  hero: {
    borderColor: dark.accentBorder, backgroundColor: dark.accentSoft,
    alignItems: 'center', paddingVertical: 22, paddingHorizontal: 16,
  },
  heroLabel: { fontSize: 12, color: dark.dim, letterSpacing: 2 },
  heroTotal: { fontSize: 44, fontWeight: '900', color: dark.text, letterSpacing: -2, marginVertical: 4 },
  heroBold: { color: dark.text, fontWeight: '700' },
  barsRow: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    gap: 9, marginTop: 16, height: 52,
  },
  bar: { width: 20, borderRadius: 4 },
  monthLabels: { flexDirection: 'row', justifyContent: 'center', gap: 11, marginTop: 5 },
  monthLabel: { fontSize: 12, color: dark.dim },
  monthLabelOn: { color: dark.accent, fontWeight: '700' },
  paceText: { fontSize: 13, color: dark.green, marginTop: 10 },
  paceBold: { fontWeight: '800' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  categoryLabel: { fontSize: 13, color: dark.text, width: 110 },
  categoryBarTrack: {
    flex: 1, height: 6, backgroundColor: dark.surf3, borderRadius: 99, overflow: 'hidden', marginHorizontal: 10,
  },
  categoryBarFill: { height: '100%', borderRadius: 99 },
  categoryValue: { fontSize: 13, fontWeight: '700', color: dark.text, width: 44, textAlign: 'right' },
  recentRow: { paddingVertical: 12, paddingHorizontal: 16, marginBottom: 8 },
  minicard: { width: 46, height: 30, borderRadius: 6 },
  recentTitle: { fontSize: 14, fontWeight: '700', color: dark.text },
  recentValue: { fontSize: 15, fontWeight: '800', color: dark.green },
  btnSecondary: {
    backgroundColor: dark.surf2, borderWidth: 1, borderColor: dark.border2,
    borderRadius: 14, alignItems: 'center', paddingVertical: 13,
  },
  btnSecondaryText: { fontSize: 14, fontWeight: '700', color: dark.text },
});
