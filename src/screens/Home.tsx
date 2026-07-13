import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KovaLogo } from '../components/KovaLogo';
import { dark } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { detectNearbyMerchant, DetectedMerchant } from '../engine/gpsDetection';
import { getRecommendations, getLedgerSummary, CardRecommendation } from '../engine/recommendations';
import { track } from '../lib/analytics';

const CATEGORY_LABEL: Record<string, string> = {
  dining: 'Dining', groceries: 'Groceries', gas: 'Gas', ev_charging: 'EV Charging',
  travel: 'Travel', transit: 'Transit', pharmacy: 'Pharmacy', entertainment: 'Entertainment',
  streaming: 'Streaming', shopping: 'Shopping', other: 'Other',
};

function withOpacity(hex: string, opacity: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

type WalletCard = { id: string; colorHex: string | null };
type RotatingAlert = {
  cardName: string; category: string; multiplier: number; daysLeft: number;
};

export function HomeScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [greetingName, setGreetingName] = useState('there');
  const [merchant, setMerchant] = useState<DetectedMerchant | null>(null);
  const [topRec, setTopRec] = useState<CardRecommendation | null>(null);
  const [ledger, setLedger] = useState({ yearToDate: 0, captureCount: 0 });
  const [wallet, setWallet] = useState<WalletCard[]>([]);
  const [alert, setAlert] = useState<RotatingAlert | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      if (data.user?.email) setGreetingName(data.user.email.split('@')[0]);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    getLedgerSummary(userId).then(setLedger);
    supabase
      .from('user_cards')
      .select('card_id, cards(color_hex)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .then(({ data }) => {
        setWallet(
          (data ?? []).map((r: any) => ({ id: r.card_id, colorHex: r.cards?.color_hex ?? null }))
        );
      });
  }, [userId]);

  useEffect(() => {
    detectNearbyMerchant().then(setMerchant);
  }, []);

  useEffect(() => {
    if (!userId || !merchant) {
      setTopRec(null);
      return;
    }
    getRecommendations(userId, merchant.category).then((recs) => {
      const best = recs[0] ?? null;
      setTopRec(best);
      if (best) track.recViewed(merchant.category, 'gps');
    });
  }, [userId, merchant]);

  useEffect(() => {
    if (!userId || wallet.length === 0) {
      setAlert(null);
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('reward_categories')
      .select('category, multiplier, end_date, cards(name)')
      .in('card_id', wallet.map((w) => w.id))
      .not('end_date', 'is', null)
      .gte('end_date', today)
      .order('end_date', { ascending: true })
      .limit(1)
      .then(({ data }) => {
        const row: any = data?.[0];
        if (!row) {
          setAlert(null);
          return;
        }
        const daysLeft = Math.ceil((new Date(row.end_date).getTime() - Date.now()) / 86400000);
        setAlert({ cardName: row.cards.name, category: row.category, multiplier: row.multiplier, daysLeft });
      });
  }, [userId, wallet]);

  const today = new Date();
  const dateLabel = today
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    .toUpperCase();
  const displayName = greetingName.charAt(0).toUpperCase() + greetingName.slice(1);
  const monthsElapsed = today.getMonth() + 1;
  const projectedYearEnd = ledger.yearToDate > 0 ? (ledger.yearToDate * 12) / monthsElapsed : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.header}>
        <View>
          <Text style={styles.tiny}>{dateLabel}</Text>
          <Text style={styles.greeting}>Hey, {displayName}</Text>
        </View>
        <KovaLogo size={30} mode="dark" />
      </View>

      {merchant && topRec && (
        <View style={[styles.card, styles.cardHighlight]}>
          <View style={styles.spread}>
            <View style={styles.pillAcc}>
              <Text style={styles.pillAccText}>📍 You&apos;re at {merchant.name}</Text>
            </View>
            <Text style={styles.tiny}>{merchant.distanceM}m away</Text>
          </View>
          <View style={[styles.spread, { marginTop: 9 }]}>
            <View style={styles.rowline}>
              <View style={[styles.minicard, { backgroundColor: topRec.colorHex ?? dark.surf3 }]} />
              <View>
                <Text style={styles.recCardName}>Use {topRec.cardName}</Text>
                <Text style={styles.tiny}>
                  {CATEGORY_LABEL[merchant.category] ?? merchant.category} · {topRec.multiplier}× {topRec.pointsType}
                </Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.recValue}>${topRec.valuePerHundred.toFixed(2)}</Text>
              <Text style={styles.tiny}>per $100</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.spread}>
          <Text style={styles.tinyLabel}>RECOVERED THIS YEAR</Text>
          <Text style={[styles.tiny, { color: dark.accent }]}>View ledger →</Text>
        </View>
        <Text style={styles.ledgerTotal}>${ledger.yearToDate.toFixed(2)}</Text>
        <View style={styles.bar}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.min(100, projectedYearEnd > 0 ? (ledger.yearToDate / projectedYearEnd) * 100 : 0)}%` },
            ]}
          />
        </View>
        <Text style={[styles.tiny, { marginTop: 5 }]}>
          {ledger.captureCount} captures
          {projectedYearEnd > 0 && (
            <>
              {' '}· on pace for <Text style={styles.paceValue}>${projectedYearEnd.toFixed(0)}</Text> by December
            </>
          )}
        </Text>
      </View>

      <View>
        <Text style={[styles.tinyLabel, { marginBottom: 6 }]}>YOUR WALLET</Text>
        <View style={styles.rowline}>
          {wallet.map((w) => (
            <View key={w.id} style={[styles.walletCard, { backgroundColor: w.colorHex ?? dark.surf3 }]} />
          ))}
          <View style={styles.addCard}>
            <Text style={{ color: dark.muted }}>＋</Text>
          </View>
        </View>
      </View>

      {alert && (
        <View style={[styles.card, styles.spread, styles.alertCard]}>
          <View>
            <Text style={styles.alertTitle}>
              {alert.cardName} · {alert.multiplier}× {CATEGORY_LABEL[alert.category] ?? alert.category}
            </Text>
            <Text style={styles.tiny}>Activation required — ends in {alert.daysLeft} days</Text>
          </View>
          <View style={styles.pillGold}>
            <Text style={styles.pillGoldText}>ACTIVATE</Text>
          </View>
        </View>
      )}
    </ScrollView>
      <View style={styles.tabbar}>
        <View style={styles.tab}>
          <Text style={[styles.tabIcon, styles.tabOn]}>◈</Text>
          <Text style={[styles.tabLabel, styles.tabOn]}>HOME</Text>
        </View>
        <View style={styles.tab}>
          <Text style={styles.tabIcon}>▤</Text>
          <Text style={styles.tabLabel}>WALLET</Text>
        </View>
        <View style={styles.tab}>
          <Text style={styles.tabIcon}>✓</Text>
          <Text style={styles.tabLabel}>LEDGER</Text>
        </View>
        <View style={styles.tab}>
          <Text style={styles.tabIcon}>◔</Text>
          <Text style={styles.tabLabel}>ALERTS</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: dark.bg },
  screen: { flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowline: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  tiny: { fontSize: 10.5, color: dark.dim },
  tinyLabel: { fontSize: 10.5, color: dark.dim, letterSpacing: 1.5 },
  greeting: { fontSize: 17, fontWeight: '900', color: dark.text, letterSpacing: -0.5 },
  card: { backgroundColor: dark.surf, borderWidth: 1, borderColor: dark.border, borderRadius: 14, padding: 12 },
  cardHighlight: { borderColor: dark.accentBorder, backgroundColor: dark.accentSoft },
  pillAcc: {
    backgroundColor: dark.accentSoft, borderColor: dark.accentBorder, borderWidth: 1,
    borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9,
  },
  pillAccText: { fontSize: 8.5, fontWeight: '800', letterSpacing: 1, color: dark.accent },
  minicard: { width: 44, height: 29, borderRadius: 5 },
  recCardName: { fontSize: 12.5, fontWeight: '800', color: dark.text },
  recValue: { fontSize: 15, fontWeight: '900', color: dark.green },
  ledgerTotal: { fontSize: 25, fontWeight: '900', color: dark.text, letterSpacing: -1, marginVertical: 2 },
  bar: { height: 5, backgroundColor: dark.surf3, borderRadius: 99, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: dark.accent, borderRadius: 99 },
  paceValue: { color: dark.text, fontWeight: '700' },
  walletCard: { width: 52, height: 34, borderRadius: 5 },
  addCard: {
    width: 52, height: 34, borderRadius: 5, borderWidth: 1.5, borderColor: dark.border2,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
  },
  alertCard: { borderLeftWidth: 3, borderLeftColor: dark.gold },
  alertTitle: { fontSize: 11, fontWeight: '700', color: dark.text },
  pillGold: {
    backgroundColor: withOpacity(dark.gold, 0.1), borderColor: withOpacity(dark.gold, 0.3),
    borderWidth: 1, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9,
  },
  pillGoldText: { fontSize: 8.5, fontWeight: '800', letterSpacing: 1, color: dark.gold },
  tabbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', height: 54,
    borderTopWidth: 1, borderTopColor: dark.border, backgroundColor: dark.surf,
    marginTop: 8, paddingBottom: 8,
  },
  tab: { alignItems: 'center' },
  tabIcon: { fontSize: 15, color: dark.muted, marginBottom: 2 },
  tabLabel: { fontSize: 8.5, fontWeight: '700', letterSpacing: 1, color: dark.muted },
  tabOn: { color: dark.accent },
});
