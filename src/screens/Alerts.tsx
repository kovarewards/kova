import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput } from '../components/AppText';
import { TabBar, TabKey } from '../components/TabBar';
import { dark } from '../constants/theme';
import { supabase } from '../lib/supabase';

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

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function periodEndDate(period: string): Date | null {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  if (period === 'monthly') return new Date(y, m + 1, 0);
  if (period === 'quarterly') return new Date(y, Math.floor(m / 3) * 3 + 3, 0);
  if (period === 'annual') return new Date(y, 11, 31);
  return null;
}

type ActivationAlert = {
  key: string; cardName: string; colorHex: string | null;
  category: string; multiplier: number; daysLeft: number; sourceUrl: string | null;
};
type ExpiringAlert = {
  key: string; cardName: string; colorHex: string | null; title: string; daysLeft: number;
};
type BonusTracker = {
  id: string; cardName: string; colorHex: string | null;
  bonusPoints: number; pointsType: string;
  spendRequired: number; spendLogged: number; deadline: string;
};
type WalletCardOption = { id: string; name: string; colorHex: string | null; pointsType: string };

type Props = { onNavigateTab: (tab: TabKey) => void };

export function AlertsScreen({ onNavigateTab }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [walletCardIds, setWalletCardIds] = useState<string[]>([]);
  const [walletOptions, setWalletOptions] = useState<WalletCardOption[]>([]);
  const [activationAlerts, setActivationAlerts] = useState<ActivationAlert[]>([]);
  const [expiringAlerts, setExpiringAlerts] = useState<ExpiringAlert[]>([]);
  const [trackers, setTrackers] = useState<BonusTracker[]>([]);

  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [logAmount, setLogAmount] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [newCardId, setNewCardId] = useState<string | null>(null);
  const [newBonusPoints, setNewBonusPoints] = useState('');
  const [newSpendRequired, setNewSpendRequired] = useState('');
  const [newDays, setNewDays] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('user_cards')
      .select('card_id, cards(id, name, color_hex, source_url, reward_categories(points_type))')
      .eq('user_id', userId)
      .eq('is_active', true)
      .then(({ data }) => {
        const ids = (data ?? []).map((r: any) => r.cards.id);
        setWalletCardIds(ids);
        setWalletOptions(
          (data ?? []).map((r: any) => ({
            id: r.cards.id,
            name: r.cards.name,
            colorHex: r.cards.color_hex,
            pointsType: r.cards.reward_categories?.[0]?.points_type ?? 'points',
          }))
        );
      });
  }, [userId]);

  useEffect(() => {
    if (walletCardIds.length === 0) return;
    const today = new Date().toISOString().split('T')[0];

    supabase
      .from('reward_categories')
      .select('category, multiplier, end_date, card_id, cards(name, color_hex, source_url)')
      .in('card_id', walletCardIds)
      .not('end_date', 'is', null)
      .gte('end_date', today)
      .order('end_date', { ascending: true })
      .then(({ data }) => {
        setActivationAlerts(
          (data ?? []).map((r: any) => ({
            key: `${r.card_id}-${r.category}`,
            cardName: r.cards.name,
            colorHex: r.cards.color_hex,
            category: r.category,
            multiplier: r.multiplier,
            daysLeft: daysUntil(r.end_date),
            sourceUrl: r.cards.source_url,
          }))
        );
      });

    supabase
      .from('annual_benefits')
      .select('id, title, period, card_id, cards(name, color_hex)')
      .in('card_id', walletCardIds)
      .then(({ data }) => {
        const alerts: ExpiringAlert[] = [];
        (data ?? []).forEach((r: any) => {
          const end = periodEndDate(r.period);
          if (!end) return;
          const daysLeft = Math.ceil((end.getTime() - Date.now()) / 86400000);
          if (daysLeft >= 0 && daysLeft <= 30) {
            alerts.push({ key: r.id, cardName: r.cards.name, colorHex: r.cards.color_hex, title: r.title, daysLeft });
          }
        });
        setExpiringAlerts(alerts);
      });
  }, [walletCardIds]);

  function loadTrackers() {
    if (!userId) return;
    supabase
      .from('user_bonus_trackers')
      .select('id, bonus_points, points_type, spend_required, spend_logged, deadline, cards(name, color_hex)')
      .eq('user_id', userId)
      .order('deadline', { ascending: true })
      .then(({ data }) => {
        setTrackers(
          (data ?? []).map((r: any) => ({
            id: r.id,
            cardName: r.cards.name,
            colorHex: r.cards.color_hex,
            bonusPoints: r.bonus_points,
            pointsType: r.points_type,
            spendRequired: Number(r.spend_required),
            spendLogged: Number(r.spend_logged),
            deadline: r.deadline,
          }))
        );
      });
  }

  useEffect(loadTrackers, [userId]);

  async function submitLogSpend(tracker: BonusTracker) {
    const amount = parseFloat(logAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const newTotal = tracker.spendLogged + amount;
    const { error } = await supabase
      .from('user_bonus_trackers')
      .update({ spend_logged: newTotal })
      .eq('id', tracker.id);
    if (error) {
      setCreateError(error.message);
      return;
    }
    setTrackers((prev) => prev.map((t) => (t.id === tracker.id ? { ...t, spendLogged: newTotal } : t)));
    setLoggingId(null);
    setLogAmount('');
  }

  async function submitNewTracker() {
    setCreateError(null);
    if (!newCardId) {
      setCreateError('Pick which card this bonus is for.');
      return;
    }
    const bonusPoints = parseInt(newBonusPoints, 10);
    const spendRequired = parseFloat(newSpendRequired);
    const days = parseInt(newDays, 10);
    if (!bonusPoints || !spendRequired || !days) {
      setCreateError('Fill in bonus points, spend required, and days — all greater than zero.');
      return;
    }
    if (!userId) return;
    setCreating(true);
    const card = walletOptions.find((c) => c.id === newCardId);
    const deadline = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
    const { error } = await supabase.from('user_bonus_trackers').insert({
      user_id: userId, card_id: newCardId, bonus_points: bonusPoints,
      points_type: card?.pointsType ?? 'points', spend_required: spendRequired, deadline,
    });
    setCreating(false);
    if (error) {
      setCreateError(error.message);
      return;
    }
    setShowCreate(false);
    setNewCardId(null);
    setNewBonusPoints('');
    setNewSpendRequired('');
    setNewDays('');
    loadTrackers();
  }

  const activeCount = activationAlerts.length + expiringAlerts.length + trackers.length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.spread}>
          <Text style={styles.h1}>Alerts</Text>
          <View style={styles.pillAcc}>
            <Text style={styles.pillAccText}>{activeCount} ACTIVE</Text>
          </View>
        </View>

        {activationAlerts.map((a) => (
          <View key={a.key} style={[styles.card, styles.goldBorder]}>
            <View style={styles.spread}>
              <View style={styles.pillGold}>
                <Text style={styles.pillGoldText}>ACTION NEEDED</Text>
              </View>
              <Text style={styles.tiny}>{a.daysLeft} days</Text>
            </View>
            <Text style={styles.alertTitle}>
              Activate {a.cardName} — {a.multiplier}× {CATEGORY_LABEL[a.category] ?? a.category}
            </Text>
            <Text style={styles.alertBody}>Rotating categories must be activated to earn the bonus rate.</Text>
            {a.sourceUrl && (
              <TouchableOpacity style={styles.btnSecondary} onPress={() => Linking.openURL(a.sourceUrl!)}>
                <Text style={styles.btnSecondaryText}>Open activation page →</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {expiringAlerts.map((a) => (
          <View key={a.key} style={[styles.card, styles.redBorder]}>
            <View style={styles.spread}>
              <View style={styles.pillRed}>
                <Text style={styles.pillRedText}>EXPIRING</Text>
              </View>
              <Text style={styles.tiny}>{a.daysLeft} days</Text>
            </View>
            <Text style={styles.alertTitle}>{a.cardName} {a.title}</Text>
            <Text style={styles.alertBody}>
              Resets in {a.daysLeft} days. Check your card&apos;s app to see if you&apos;ve used it — Kova doesn&apos;t track transactions.
            </Text>
          </View>
        ))}

        {trackers.map((t) => {
          const pct = Math.min(100, (t.spendLogged / t.spendRequired) * 100);
          const daysLeft = daysUntil(t.deadline);
          return (
            <View key={t.id} style={styles.card}>
              <View style={styles.spread}>
                <View style={styles.pillAcc}>
                  <Text style={styles.pillAccText}>BONUS TRACKER</Text>
                </View>
                <Text style={styles.mutedTiny}>manual · optional</Text>
              </View>
              <Text style={styles.alertTitle}>
                {t.cardName} — {(t.bonusPoints / 1000).toFixed(0)}K {t.pointsType} bonus
              </Text>
              <View style={[styles.spread, { marginTop: 6, marginBottom: 4 }]}>
                <Text style={styles.tiny}>${t.spendLogged.toFixed(0)} of ${t.spendRequired.toFixed(0)} spend</Text>
                <Text style={styles.pctText}>{pct.toFixed(0)}% · {daysLeft} days left</Text>
              </View>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${pct}%` }]} />
              </View>

              {loggingId === t.id ? (
                <View style={styles.logRow}>
                  <TextInput
                    value={logAmount}
                    onChangeText={setLogAmount}
                    keyboardType="decimal-pad"
                    placeholder="$ amount"
                    placeholderTextColor={dark.muted}
                    style={styles.logInput}
                    autoFocus
                  />
                  <TouchableOpacity style={styles.logAddBtn} onPress={() => submitLogSpend(t)}>
                    <Text style={styles.logAddBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => { setLoggingId(t.id); setLogAmount(''); }}>
                  <Text style={styles.logSpendLink}>＋ Log spend</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.dashedCard}
          onPress={() => {
            setShowCreate((v) => !v);
            setCreateError(null);
          }}
        >
          <Text style={styles.dashedText}>
            {showCreate ? 'Cancel' : '＋ Track a new bonus'}
          </Text>
        </TouchableOpacity>

        {showCreate && (
          <View style={styles.card}>
            <Text style={styles.tinyLabel}>WHICH CARD</Text>
            <View style={[styles.rowline, { marginTop: 8, marginBottom: 12, flexWrap: 'wrap' }]}>
              {walletOptions.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setNewCardId(c.id)}
                  style={[
                    styles.cardChip,
                    { backgroundColor: c.colorHex ?? dark.surf3 },
                    newCardId === c.id && styles.cardChipSelected,
                  ]}
                />
              ))}
            </View>
            <TextInput
              value={newBonusPoints}
              onChangeText={setNewBonusPoints}
              keyboardType="number-pad"
              placeholder="Bonus points (e.g. 60000)"
              placeholderTextColor={dark.muted}
              style={styles.formInput}
            />
            <TextInput
              value={newSpendRequired}
              onChangeText={setNewSpendRequired}
              keyboardType="decimal-pad"
              placeholder="Spend required ($)"
              placeholderTextColor={dark.muted}
              style={styles.formInput}
            />
            <TextInput
              value={newDays}
              onChangeText={setNewDays}
              keyboardType="number-pad"
              placeholder="Days to complete"
              placeholderTextColor={dark.muted}
              style={styles.formInput}
            />
            {createError && <Text style={styles.errorText}>{createError}</Text>}
            <TouchableOpacity style={styles.btn} onPress={submitNewTracker} disabled={creating}>
              <Text style={styles.btnText}>{creating ? 'Starting…' : 'Start tracking'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.footerNote}>
          Alerts are computed locally from your wallet + the benefits DB.{'\n'}No transaction data — that&apos;s the point.
        </Text>
      </ScrollView>

      <TabBar active="alerts" onNavigate={onNavigateTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: dark.bg },
  screen: { flex: 1 },
  content: { padding: 20, gap: 13, paddingBottom: 30 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  h1: { fontSize: 22, fontWeight: '900', color: dark.text, letterSpacing: -0.6 },
  tiny: { fontSize: 14, color: dark.dim },
  tinyLabel: { fontSize: 12, color: dark.dim, letterSpacing: 1.3 },
  mutedTiny: { fontSize: 12, color: dark.muted },
  card: { backgroundColor: dark.surf, borderWidth: 1, borderColor: dark.border, borderRadius: 18, padding: 16 },
  goldBorder: { borderLeftWidth: 4, borderLeftColor: dark.gold },
  redBorder: { borderLeftWidth: 4, borderLeftColor: dark.red },
  pillAcc: {
    backgroundColor: dark.accentSoft, borderColor: dark.accentBorder, borderWidth: 1,
    borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12,
  },
  pillAccText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3, color: dark.accent },
  pillGold: {
    backgroundColor: withOpacity(dark.gold, 0.1), borderColor: withOpacity(dark.gold, 0.3),
    borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12,
  },
  pillGoldText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3, color: dark.gold },
  pillRed: {
    backgroundColor: withOpacity(dark.red, 0.1), borderColor: withOpacity(dark.red, 0.3),
    borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12,
  },
  pillRedText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3, color: dark.red },
  alertTitle: { fontSize: 15, fontWeight: '800', color: dark.text, marginTop: 8 },
  alertBody: { fontSize: 13, color: dark.dim, marginTop: 4, marginBottom: 10, lineHeight: 18 },
  btnSecondary: {
    backgroundColor: dark.surf2, borderWidth: 1, borderColor: dark.border2,
    borderRadius: 11, alignItems: 'center', paddingVertical: 10,
  },
  btnSecondaryText: { fontSize: 13, fontWeight: '700', color: dark.text },
  pctText: { fontSize: 12, fontWeight: '700', color: dark.accent },
  bar: { height: 6, backgroundColor: dark.surf3, borderRadius: 99, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: dark.accent, borderRadius: 99 },
  logSpendLink: { fontSize: 13, fontWeight: '700', color: dark.accent, marginTop: 9 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
  logInput: {
    flex: 1, fontSize: 14, color: dark.text, backgroundColor: dark.surf2,
    borderWidth: 1, borderColor: dark.border2, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
  },
  logAddBtn: { backgroundColor: dark.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  logAddBtnText: { fontSize: 13, fontWeight: '800', color: dark.bg },
  dashedCard: {
    borderWidth: 1, borderColor: dark.border2, borderStyle: 'dashed', borderRadius: 18,
    padding: 16, alignItems: 'center',
  },
  dashedText: { fontSize: 13, fontWeight: '700', color: dark.accent },
  cardChip: { width: 44, height: 29, borderRadius: 6, borderWidth: 2, borderColor: 'transparent' },
  cardChipSelected: { borderColor: dark.accent },
  formInput: {
    fontSize: 14, color: dark.text, backgroundColor: dark.surf2,
    borderWidth: 1, borderColor: dark.border2, borderRadius: 11,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  btn: { backgroundColor: dark.accent, borderRadius: 14, alignItems: 'center', paddingVertical: 13 },
  btnText: { fontSize: 14, fontWeight: '800', color: dark.bg },
  errorText: { fontSize: 12, color: dark.red, marginBottom: 10 },
  footerNote: { fontSize: 11, color: dark.muted, textAlign: 'center', lineHeight: 16 },
});
