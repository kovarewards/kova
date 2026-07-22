import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/AppText';
import { KovaLogo } from '../components/KovaLogo';
import { TabBar, TabKey } from '../components/TabBar';
import { dark } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { detectNearbyMerchant, DetectedMerchant } from '../engine/gpsDetection';
import { getRecommendations, getLedgerSummary, CardRecommendation } from '../engine/recommendations';
import { track } from '../lib/analytics';
import { formatDistance } from '../lib/format';
import type { RecommendationTarget } from './Recommendation';

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

function withOpacity(hex: string, opacity: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

type WalletCard = { id: string; name: string; colorHex: string | null };
type RotatingAlert = {
  cardName: string; category: string; multiplier: number; daysLeft: number;
};

type Props = {
  onOpenRecommendation: (target: RecommendationTarget) => void;
  onAddCard: () => void;
  onNavigateTab: (tab: TabKey) => void;
  onOpenProfile: () => void;
};

export function HomeScreen({ onOpenRecommendation, onAddCard, onNavigateTab, onOpenProfile }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [greetingName, setGreetingName] = useState('there');
  const [merchant, setMerchant] = useState<DetectedMerchant | null>(null);
  const [topRec, setTopRec] = useState<CardRecommendation | null>(null);
  const [ledger, setLedger] = useState({ yearToDate: 0, captureCount: 0, projectedYearEnd: 0 });
  const [wallet, setWallet] = useState<WalletCard[]>([]);
  const [alert, setAlert] = useState<RotatingAlert | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      const firstName = data.user?.user_metadata?.first_name;
      if (firstName) setGreetingName(firstName);
      else if (data.user?.email) setGreetingName(data.user.email.split('@')[0]);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    getLedgerSummary(userId).then(setLedger);
    supabase
      .from('user_cards')
      .select('card_id, cards(name, color_hex)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .then(({ data }) => {
        setWallet(
          (data ?? []).map((r: any) => ({
            id: r.card_id,
            name: r.cards?.name ?? 'Card',
            colorHex: r.cards?.color_hex ?? null,
          }))
        );
      });
  }, [userId]);

  async function checkLocation(force = false) {
    setCheckingLocation(true);
    const result = await detectNearbyMerchant(force);
    setMerchant(result);
    setCheckingLocation(false);
  }

  useEffect(() => {
    checkLocation();
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
  const projectedYearEnd = ledger.projectedYearEnd;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.header}>
        <View>
          <Text style={styles.tiny}>{dateLabel}</Text>
          <Text style={styles.greeting}>Hey, {displayName}</Text>
        </View>
        <TouchableOpacity onPress={onOpenProfile}>
          <KovaLogo size={38} mode="dark" />
        </TouchableOpacity>
      </View>

      <View style={styles.refreshRow}>
        <TouchableOpacity onPress={() => checkLocation(true)} disabled={checkingLocation}>
          <Text style={styles.refreshText}>
            {checkingLocation ? 'Checking location…' : '↻  Refresh location'}
          </Text>
        </TouchableOpacity>
        {!merchant && (
          <TouchableOpacity onPress={() => setShowCategoryPicker(true)}>
            <Text style={styles.pickCategoryText}>Can&apos;t find your merchant? Pick a category</Text>
          </TouchableOpacity>
        )}
      </View>

      {merchant && topRec && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onOpenRecommendation({ name: merchant.name, category: merchant.category })}
        >
          <View style={[styles.card, styles.cardHighlight]}>
            <View style={styles.bannerTopRow}>
              <View style={styles.pillAcc}>
                <Text style={styles.pillAccText} numberOfLines={1}>📍 You&apos;re at {merchant.name}</Text>
              </View>
              <Text style={styles.tiny}>{formatDistance(merchant.distanceM)} away</Text>
            </View>
            <View style={[styles.spread, { marginTop: 9 }]}>
              <View style={styles.recInfo}>
                <View style={[styles.minicard, { backgroundColor: topRec.colorHex ?? dark.surf3 }]} />
                <View style={styles.recTextCol}>
                  <Text style={styles.recCardName} numberOfLines={1}>Use {topRec.cardName}</Text>
                  <Text style={styles.tiny} numberOfLines={1}>
                    {CATEGORY_LABEL[merchant.category] ?? merchant.category} · {topRec.multiplier}× {topRec.pointsType}
                  </Text>
                </View>
              </View>
              <View style={styles.recValueCol}>
                <Text style={styles.recValue}>${topRec.valuePerHundred.toFixed(2)}</Text>
                <Text style={styles.tiny}>per $100</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.card}>
        <View style={styles.spread}>
          <Text style={styles.tinyLabel}>RECOVERED THIS YEAR</Text>
          <TouchableOpacity onPress={() => onNavigateTab('ledger')}>
            <Text style={[styles.tiny, { color: dark.accent }]}>View ledger →</Text>
          </TouchableOpacity>
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.walletScroll}
        >
          {wallet.map((w) => (
            <View key={w.id} style={styles.walletItem}>
              <View style={[styles.walletCard, { backgroundColor: w.colorHex ?? dark.surf3 }]} />
              <Text style={styles.walletCardName} numberOfLines={1}>{w.name}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.addCard} onPress={onAddCard}>
            <Text style={{ color: dark.muted }}>＋</Text>
          </TouchableOpacity>
        </ScrollView>
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
      <TabBar active="home" onNavigate={onNavigateTab} />

      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryPicker(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>What are you buying?</Text>
            <Text style={[styles.tiny, { marginBottom: 14 }]}>
              We&apos;ll show your best card for this category, wherever you are.
            </Text>
            <View style={styles.categoryGrid}>
              {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={styles.categoryTile}
                  onPress={() => {
                    setShowCategoryPicker(false);
                    onOpenRecommendation({ name: label, category: key });
                  }}
                >
                  <Text style={styles.categoryEmoji}>{CATEGORY_EMOJI[key]}</Text>
                  <Text style={styles.categoryTileText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: dark.bg },
  screen: { flex: 1 },
  content: { padding: 20, gap: 13, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  refreshRow: { alignSelf: 'flex-start', marginTop: -6, gap: 6 },
  refreshText: { fontSize: 12, fontWeight: '700', color: dark.accent },
  pickCategoryText: { fontSize: 12, fontWeight: '600', color: dark.dim, textDecorationLine: 'underline' },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowline: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  recInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  recTextCol: { flex: 1, minWidth: 0 },
  recValueCol: { alignItems: 'flex-end', flexShrink: 0, marginLeft: 8 },
  tiny: { fontSize: 14, color: dark.dim },
  tinyLabel: { fontSize: 14, color: dark.dim, letterSpacing: 2 },
  greeting: { fontSize: 22, fontWeight: '900', color: dark.text, letterSpacing: -0.6 },
  card: { backgroundColor: dark.surf, borderWidth: 1, borderColor: dark.border, borderRadius: 18, padding: 16 },
  cardHighlight: { borderColor: dark.accentBorder, backgroundColor: dark.accentSoft },
  pillAcc: {
    backgroundColor: dark.accentSoft, borderColor: dark.accentBorder, borderWidth: 1,
    borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12, flexShrink: 1,
  },
  pillAccText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3, color: dark.accent },
  minicard: { width: 58, height: 38, borderRadius: 7 },
  recCardName: { fontSize: 16, fontWeight: '800', color: dark.text },
  recValue: { fontSize: 20, fontWeight: '900', color: dark.green },
  ledgerTotal: { fontSize: 32, fontWeight: '900', color: dark.text, letterSpacing: -1.3, marginVertical: 3 },
  bar: { height: 6, backgroundColor: dark.surf3, borderRadius: 99, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: dark.accent, borderRadius: 99 },
  paceValue: { color: dark.text, fontWeight: '700' },
  walletScroll: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingRight: 4 },
  walletItem: { width: 68 },
  walletCard: { width: 68, height: 44, borderRadius: 7 },
  walletCardName: { fontSize: 10, color: dark.dim, marginTop: 4, textAlign: 'center' },
  addCard: {
    width: 68, height: 44, borderRadius: 7, borderWidth: 2, borderColor: dark.border2,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
  },
  alertCard: { borderLeftWidth: 4, borderLeftColor: dark.gold },
  alertTitle: { fontSize: 14, fontWeight: '700', color: dark.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: dark.surf, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36, borderWidth: 1, borderColor: dark.border, borderBottomWidth: 0,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 99, backgroundColor: dark.border2,
    alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: dark.text, letterSpacing: -0.4 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryTile: {
    width: '31%', backgroundColor: dark.surf2, borderWidth: 1, borderColor: dark.border,
    borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 6,
  },
  categoryEmoji: { fontSize: 20 },
  categoryTileText: { fontSize: 11.5, fontWeight: '700', color: dark.text, textAlign: 'center' },
  pillGold: {
    backgroundColor: withOpacity(dark.gold, 0.1), borderColor: withOpacity(dark.gold, 0.3),
    borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12,
  },
  pillGoldText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3, color: dark.gold },
});
