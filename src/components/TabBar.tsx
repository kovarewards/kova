import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from './AppText';
import { dark } from '../constants/theme';

export type TabKey = 'home' | 'wallet' | 'ledger' | 'alerts';

function BellIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: 'home', icon: '◈', label: 'HOME' },
  { key: 'wallet', icon: '▤', label: 'WALLET' },
  { key: 'ledger', icon: '✓', label: 'LEDGER' },
  { key: 'alerts', icon: '', label: 'ALERTS' },
];

type Props = { active: TabKey; onNavigate: (tab: TabKey) => void };

export function TabBar({ active, onNavigate }: Props) {
  return (
    <View style={styles.tabbar}>
      {TABS.map((t) => {
        const on = t.key === active;
        const color = on ? dark.accent : dark.muted;
        return (
          <TouchableOpacity key={t.key} style={styles.tab} onPress={() => onNavigate(t.key)}>
            {t.key === 'alerts' ? (
              <View style={styles.bellWrap}>
                <BellIcon color={color} size={17} />
              </View>
            ) : (
              <Text style={[styles.tabIcon, on && styles.tabOn]}>{t.icon}</Text>
            )}
            <Text style={[styles.tabLabel, on && styles.tabOn]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
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
  bellWrap: { height: 19, justifyContent: 'center', marginBottom: 3 },
  tabLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.3, color: dark.muted },
  tabOn: { color: dark.accent },
});
