import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput } from '../components/AppText';
import { KovaLogo } from '../components/KovaLogo';
import { dark } from '../constants/theme';
import { supabase } from '../lib/supabase';

function withOpacity(hex: string, opacity: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

type CardOption = { id: string; name: string; issuer: string; colorHex: string | null };

type Props = { onContinue: () => void };

export function OnboardingScreen({ onContinue }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [cards, setCards] = useState<CardOption[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    supabase
      .from('cards')
      .select('id, name, issuer, color_hex')
      .order('name')
      .then(({ data }) => {
        setCards(
          (data ?? []).map((c: any) => ({ id: c.id, name: c.name, issuer: c.issuer, colorHex: c.color_hex }))
        );
      });
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('user_cards')
      .select('card_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .then(({ data }) => {
        setAddedIds(new Set((data ?? []).map((r: any) => r.card_id)));
      });
  }, [userId]);

  async function toggleCard(cardId: string) {
    if (!userId) return;
    if (addedIds.has(cardId)) {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
      await supabase.from('user_cards').delete().eq('user_id', userId).eq('card_id', cardId);
    } else {
      setAddedIds((prev) => new Set(prev).add(cardId));
      await supabase.from('user_cards').insert({ user_id: userId, card_id: cardId });
    }
  }

  const q = query.trim().toLowerCase();
  const visibleCards = q
    ? cards.filter((c) => c.name.toLowerCase().includes(q) || c.issuer.toLowerCase().includes(q))
    : cards;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.logoRow}>
          <KovaLogo size={72} mode="dark" />
        </View>

        <View style={styles.headline}>
          <Text style={styles.h1}>Zero effort.{'\n'}Maximum rewards.</Text>
          <Text style={styles.sub}>
            Add your cards. Kova tells you which one{'\n'}to use, everywhere you go.
          </Text>
          <View style={styles.pillGreenWrap}>
            <View style={styles.pillGreen}>
              <Text style={styles.pillGreenText}>🔒 No bank login — ever</Text>
            </View>
          </View>
        </View>

        <View style={styles.input}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={'🔍  Search your cards — "Amex Gold"…'}
            placeholderTextColor={dark.muted}
            style={styles.inputText}
          />
        </View>

        {visibleCards.map((c) => {
          const added = addedIds.has(c.id);
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.card, styles.spread, !added && addedIds.size > 0 && styles.cardDim]}
              onPress={() => toggleCard(c.id)}
              activeOpacity={0.7}
            >
              <View style={styles.rowline}>
                <View style={[styles.minicard, { backgroundColor: c.colorHex ?? dark.surf3 }]} />
                <View>
                  <Text style={styles.cardName}>{c.name}</Text>
                  <Text style={styles.tiny}>{c.issuer}</Text>
                </View>
              </View>
              {added ? (
                <View style={styles.pillAcc}>
                  <Text style={styles.pillAccText}>＋ ADDED</Text>
                </View>
              ) : (
                <Text style={styles.plus}>＋</Text>
              )}
            </TouchableOpacity>
          );
        })}

        <Text style={styles.footerTiny}>
          {addedIds.size} card{addedIds.size === 1 ? '' : 's'} added · most wallets take under 30 seconds
        </Text>

        <TouchableOpacity
          style={[styles.btn, addedIds.size === 0 && styles.btnDisabled]}
          disabled={addedIds.size === 0}
          onPress={onContinue}
        >
          <Text style={styles.btnText}>See my best cards →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: dark.bg },
  screen: { flex: 1 },
  content: { padding: 20, gap: 13, paddingBottom: 30 },
  logoRow: { alignItems: 'center', paddingTop: 10 },
  headline: { alignItems: 'center' },
  h1: {
    fontSize: 26, fontWeight: '900', color: dark.text, letterSpacing: -0.9,
    lineHeight: 30, textAlign: 'center',
  },
  sub: { fontSize: 14, color: dark.dim, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  pillGreenWrap: { marginTop: 12 },
  pillGreen: {
    backgroundColor: withOpacity(dark.green, 0.1), borderColor: withOpacity(dark.green, 0.3),
    borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12,
  },
  pillGreenText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3, color: dark.green },
  input: {
    backgroundColor: dark.surf, borderWidth: 1, borderColor: dark.border2,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 3,
  },
  inputText: { fontSize: 16, color: dark.text, paddingVertical: 10 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowline: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { backgroundColor: dark.surf, borderWidth: 1, borderColor: dark.border, borderRadius: 18, padding: 16 },
  cardDim: { opacity: 0.65 },
  minicard: { width: 58, height: 38, borderRadius: 7 },
  cardName: { fontSize: 15, fontWeight: '700', color: dark.text },
  tiny: { fontSize: 12, color: dark.muted },
  pillAcc: {
    backgroundColor: dark.accentSoft, borderColor: dark.accentBorder, borderWidth: 1,
    borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12,
  },
  pillAccText: { fontSize: 13, fontWeight: '800', letterSpacing: 1.3, color: dark.accent },
  plus: { fontSize: 20, color: dark.muted },
  footerTiny: { fontSize: 12, color: dark.muted, textAlign: 'center', marginTop: 5 },
  btn: {
    backgroundColor: dark.accent, borderRadius: 14, alignItems: 'center',
    paddingVertical: 14, marginBottom: 16,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3, color: dark.bg },
});
