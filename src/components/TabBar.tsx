import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from './AppText';
import { useTheme, type ThemeTokens } from '../lib/theme';

export type TabKey = 'home' | 'wallet' | 'ledger' | 'alerts';

type IconProps = { color: string; size: number };

function HomeIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function WalletIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path d="M15.5 12h2.5" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

function LedgerIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 20v-7" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 20V8" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M19 20V4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function BellIcon({ color, size }: IconProps) {
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

const TABS: { key: TabKey; Icon: (p: IconProps) => ReactElement; label: string }[] = [
  { key: 'home', Icon: HomeIcon, label: 'HOME' },
  { key: 'wallet', Icon: WalletIcon, label: 'WALLET' },
  { key: 'ledger', Icon: LedgerIcon, label: 'LEDGER' },
  { key: 'alerts', Icon: BellIcon, label: 'ALERTS' },
];

type Props = { active: TabKey; onNavigate: (tab: TabKey) => void };

export function TabBar({ active, onNavigate }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.tabbar}>
      {TABS.map((t) => {
        const on = t.key === active;
        const color = on ? theme.accent : theme.muted;
        return (
          <TouchableOpacity
            key={t.key}
            style={styles.tab}
            onPress={() => onNavigate(t.key)}
            accessibilityRole="tab"
            accessibilityLabel={t.label.charAt(0) + t.label.slice(1).toLowerCase()}
            accessibilityState={{ selected: on }}
          >
            <View style={styles.iconWrap}>
              <t.Icon color={color} size={19} />
            </View>
            <Text style={[styles.tabLabel, on && styles.tabOn]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (dark: ThemeTokens) => StyleSheet.create({
  tabbar: {
    flexDirection: 'row', alignItems: 'stretch', height: 68,
    borderTopWidth: 1, borderTopColor: dark.border, backgroundColor: dark.surf,
    marginTop: 10, paddingBottom: 10,
  },
  // flex:1 + stretch gives each tab a ~58×~100pt touch target (well past the 44pt
  // iOS minimum) instead of shrink-wrapping tightly around the icon+label content.
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { height: 19, justifyContent: 'center', marginBottom: 3 },
  tabLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.3, color: dark.muted },
  tabOn: { color: dark.accent },
});
