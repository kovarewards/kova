import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { dark } from '../constants/theme';

// A brief, consistent stand-in while a screen's primary data is in flight —
// avoids every screen flashing its own zero/empty state before real data lands.
export function ScreenLoader() {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={dark.accent} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
