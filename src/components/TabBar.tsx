import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from './AppText';
import { dark } from '../constants/theme';

export type TabKey = 'home' | 'wallet' | 'ledger' | 'alerts';

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: 'home', icon: '◈', label: 'HOME' },
  { key: 'wallet', icon: '▤', label: 'WALLET' },
  { key: 'ledger', icon: '✓', label: 'LEDGER' },
  { key: 'alerts', icon: '◔', label: 'ALERTS' },
];

type Props = { active: TabKey; onNavigate: (tab: TabKey) => void };

export function TabBar({ active, onNavigate }: Props) {
  return (
    <View style={styles.tabbar}>
      {TABS.map((t) => (
        <TouchableOpacity key={t.key} style={styles.tab} onPress={() => onNavigate(t.key)}>
          <Text style={[styles.tabIcon, t.key === active && styles.tabOn]}>{t.icon}</Text>
          <Text style={[styles.tabLabel, t.key === active && styles.tabOn]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tabbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', height: 68,
    borderTopWidth: 1, borderTopColor: dark.border, backgroundColor: dark.surf,
    marginTop: 10, paddingBottom: 10,
  },
  tab: { alignItems: 'center' },
  tabIcon: { fontSize: 19, color: dark.muted, marginBottom: 3 },
  tabLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.3, color: dark.muted },
  tabOn: { color: dark.accent },
});
