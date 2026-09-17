import { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from './AppText';
import { ThemeContext, ThemeContextValue, ThemeTokens } from '../lib/theme';
import { dark as fallbackTheme } from '../constants/theme';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  static contextType = ThemeContext;

  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Kova crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const ctx = this.context as ThemeContextValue | null;
      const theme = ctx?.theme ?? fallbackTheme;
      const styles = makeStyles(theme);
      return (
        <View style={styles.safe}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            Kova hit an unexpected error. Try again below — if it keeps happening, email{' '}
            support@kovarewards.com and we'll take a look.
          </Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => this.setState({ error: null })}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.btnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const makeStyles = (dark: ThemeTokens) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: dark.bg, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  title: { fontSize: 20, fontWeight: '900', color: dark.text, textAlign: 'center' },
  body: { fontSize: 14, color: dark.dim, textAlign: 'center', lineHeight: 20 },
  btn: { backgroundColor: dark.accent, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 26, marginTop: 8 },
  btnText: { fontSize: 14, fontWeight: '800', color: dark.bg },
});
