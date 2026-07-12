import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { KovaLogo } from './src/components/KovaLogo';
import { dark } from './src/constants/theme';

export default function App() {
  return (
    <View style={styles.container}>
      <KovaLogo size={96} mode="dark" />
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
  },
});
