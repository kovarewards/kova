import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput } from '../components/AppText';
import { KovaLogo } from '../components/KovaLogo';
import { dark } from '../constants/theme';
import { supabase } from '../lib/supabase';

export function AuthScreen() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setMessage(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    const { data, error: authError } =
      mode === 'signIn'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }
    if (mode === 'signUp' && !data.session) {
      setMessage('Check your email to confirm your account, then sign in.');
      setMode('signIn');
    }
    // A session appearing moves the app forward — handled by App.tsx.
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <View style={styles.logoRow}>
            <KovaLogo size={72} mode="dark" />
            <Text style={styles.wordmark}>Kova</Text>
          </View>
          <Text style={styles.h1}>{mode === 'signIn' ? 'Welcome back' : 'Create your account'}</Text>
          <Text style={styles.sub}>
            {mode === 'signIn' ? 'Sign in to see your cards.' : 'Takes about 30 seconds.'}
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={dark.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={dark.muted}
            secureTextEntry
            style={styles.input}
          />

          {error && <Text style={styles.error}>{error}</Text>}
          {message && <Text style={styles.message}>{message}</Text>}

          <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={dark.bg} />
            ) : (
              <Text style={styles.btnText}>{mode === 'signIn' ? 'Sign in' : 'Sign up'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setMode(mode === 'signIn' ? 'signUp' : 'signIn');
              setError(null);
              setMessage(null);
            }}
          >
            <Text style={styles.toggle}>
              {mode === 'signIn' ? 'New here? Create account' : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: dark.bg },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 24, gap: 13 },
  logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8, gap: 14 },
  wordmark: { fontSize: 38, fontWeight: '900', color: dark.text, letterSpacing: -1.2 },
  h1: { fontSize: 26, fontWeight: '900', color: dark.text, letterSpacing: -0.9, textAlign: 'center' },
  sub: { fontSize: 14, color: dark.dim, textAlign: 'center', marginBottom: 8 },
  input: {
    backgroundColor: dark.surf, borderWidth: 1, borderColor: dark.border2,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 16, color: dark.text,
  },
  error: { fontSize: 13, color: dark.red, textAlign: 'center' },
  message: { fontSize: 13, color: dark.green, textAlign: 'center' },
  btn: {
    backgroundColor: dark.accent, borderRadius: 14, alignItems: 'center',
    paddingVertical: 14, marginTop: 4,
  },
  btnText: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3, color: dark.bg },
  toggle: { fontSize: 13, color: dark.accent, textAlign: 'center', marginTop: 8 },
});
