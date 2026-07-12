import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KovaLogo } from './src/components/KovaLogo';
import { dark } from './src/constants/theme';
import { detectNearbyMerchant, DetectedMerchant } from './src/engine/gpsDetection';
import { track, posthog } from './src/lib/analytics';

export default function App() {
  const [result, setResult] = useState<DetectedMerchant | null | undefined>(undefined);
  const [checking, setChecking] = useState(false);
  const [eventSent, setEventSent] = useState(false);

  const onDetect = async () => {
    setChecking(true);
    const merchant = await detectNearbyMerchant();
    setResult(merchant);
    setChecking(false);
  };

  const onTestEvent = async () => {
    track.trialStarted();
    await posthog.flush();
    setEventSent(true);
  };

  return (
    <View style={styles.container}>
      <KovaLogo size={96} mode="dark" />
      <Pressable style={styles.button} onPress={onDetect} disabled={checking}>
        <Text style={styles.buttonText}>{checking ? 'Detecting…' : 'Detect Merchant'}</Text>
      </Pressable>
      {result !== undefined && (
        <Text style={styles.result}>
          {result
            ? `${result.name} (${result.category}) — ${result.distanceM}m`
            : 'No confident match'}
        </Text>
      )}
      <Pressable style={styles.button} onPress={onTestEvent}>
        <Text style={styles.buttonText}>Test Analytics Event</Text>
      </Pressable>
      {eventSent && <Text style={styles.result}>trial_started sent — check PostHog → Activity</Text>}
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dark.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  button: {
    backgroundColor: dark.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    color: dark.bg,
    fontWeight: '600',
  },
  result: {
    color: dark.text,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
});
