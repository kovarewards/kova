import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput } from '../components/AppText';
import { dark } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { containsProfanity } from '../lib/profanity';

type Props = { onBack: () => void };

export function ProfileScreen({ onBack }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [nameStatus, setNameStatus] = useState<{ error?: string; message?: string }>({});
  const [emailStatus, setEmailStatus] = useState<{ error?: string; message?: string }>({});
  const [passwordStatus, setPasswordStatus] = useState<{ error?: string; message?: string }>({});
  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setFirstName(data.user?.user_metadata?.first_name ?? '');
      setLastName(data.user?.user_metadata?.last_name ?? '');
      setEmail(data.user?.email ?? '');
    });
  }, []);

  async function saveName() {
    setNameStatus({});
    if (!firstName.trim()) {
      setNameStatus({ error: 'First name is required.' });
      return;
    }
    if (containsProfanity(firstName) || containsProfanity(lastName)) {
      setNameStatus({ error: 'Please use an appropriate first and last name.' });
      return;
    }
    setSavingName(true);
    const { error } = await supabase.auth.updateUser({
      data: { first_name: firstName.trim(), last_name: lastName.trim() },
    });
    setSavingName(false);
    setNameStatus(error ? { error: error.message } : { message: 'Name updated.' });
  }

  async function saveEmail() {
    setEmailStatus({});
    if (!email.trim()) {
      setEmailStatus({ error: 'Enter an email address.' });
      return;
    }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setSavingEmail(false);
    setEmailStatus(
      error
        ? { error: error.message }
        : { message: 'Check your new email inbox to confirm the change.' }
    );
  }

  async function savePassword() {
    setPasswordStatus({});
    if (newPassword.length < 6) {
      setPasswordStatus({ error: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ error: 'Passwords don’t match.' });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setPasswordStatus({ error: error.message });
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    setPasswordStatus({ message: 'Password updated.' });
  }

  async function handleLogOut() {
    await supabase.auth.signOut();
    // Session going away routes back to Auth — handled by App.tsx.
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account, your cards, and your reward history. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDeleteAccount },
      ]
    );
  }

  async function handleDeleteAccount() {
    setDeleteError(null);
    setDeleting(true);
    const { error } = await supabase.rpc('delete_own_account');
    if (error) {
      setDeleting(false);
      setDeleteError(error.message);
      return;
    }
    await supabase.auth.signOut();
    // Session going away routes back to Auth — handled by App.tsx.
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.tiny}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.h1}>Profile</Text>

        <View style={styles.card}>
          <Text style={styles.tinyLabel}>NAME</Text>
          <View style={styles.nameRow}>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={dark.muted}
              style={[styles.input, styles.nameInput]}
            />
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name (optional)"
              placeholderTextColor={dark.muted}
              style={[styles.input, styles.nameInput]}
            />
          </View>
          {nameStatus.error && <Text style={styles.error}>{nameStatus.error}</Text>}
          {nameStatus.message && <Text style={styles.message}>{nameStatus.message}</Text>}
          <TouchableOpacity style={styles.btn} onPress={saveName} disabled={savingName}>
            <Text style={styles.btnText}>{savingName ? 'Saving…' : 'Save name'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.tinyLabel}>EMAIL</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={dark.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={[styles.input, { marginTop: 8 }]}
          />
          {emailStatus.error && <Text style={styles.error}>{emailStatus.error}</Text>}
          {emailStatus.message && <Text style={styles.message}>{emailStatus.message}</Text>}
          <TouchableOpacity style={styles.btn} onPress={saveEmail} disabled={savingEmail}>
            <Text style={styles.btnText}>{savingEmail ? 'Saving…' : 'Update email'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.tinyLabel}>PASSWORD</Text>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password"
            placeholderTextColor={dark.muted}
            secureTextEntry
            style={[styles.input, { marginTop: 8 }]}
          />
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor={dark.muted}
            secureTextEntry
            style={[styles.input, { marginTop: 8 }]}
          />
          {passwordStatus.error && <Text style={styles.error}>{passwordStatus.error}</Text>}
          {passwordStatus.message && <Text style={styles.message}>{passwordStatus.message}</Text>}
          <TouchableOpacity style={styles.btn} onPress={savePassword} disabled={savingPassword}>
            <Text style={styles.btnText}>{savingPassword ? 'Saving…' : 'Update password'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logOutBtn} onPress={handleLogOut}>
          <Text style={styles.logOutText}>Log out</Text>
        </TouchableOpacity>

        {deleteError && <Text style={[styles.error, { textAlign: 'center' }]}>{deleteError}</Text>}
        <TouchableOpacity onPress={confirmDeleteAccount} disabled={deleting}>
          <Text style={styles.deleteText}>{deleting ? 'Deleting…' : 'Delete my account'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: dark.bg },
  screen: { flex: 1 },
  content: { padding: 20, gap: 13, paddingBottom: 30 },
  tiny: { fontSize: 14, color: dark.dim },
  tinyLabel: { fontSize: 12, color: dark.dim, letterSpacing: 1.3 },
  h1: { fontSize: 22, fontWeight: '900', color: dark.text, letterSpacing: -0.6, marginTop: 5 },
  card: { backgroundColor: dark.surf, borderWidth: 1, borderColor: dark.border, borderRadius: 18, padding: 16 },
  nameRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  nameInput: { flex: 1 },
  input: {
    backgroundColor: dark.surf2, borderWidth: 1, borderColor: dark.border2,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: dark.text,
  },
  error: { fontSize: 12, color: dark.red, marginTop: 8 },
  message: { fontSize: 12, color: dark.green, marginTop: 8 },
  btn: { backgroundColor: dark.accent, borderRadius: 12, alignItems: 'center', paddingVertical: 12, marginTop: 10 },
  btnText: { fontSize: 14, fontWeight: '800', color: dark.bg },
  logOutBtn: {
    borderWidth: 1, borderColor: dark.red, borderRadius: 14,
    alignItems: 'center', paddingVertical: 13,
  },
  logOutText: { fontSize: 14, fontWeight: '800', color: dark.red },
  deleteText: {
    fontSize: 12, fontWeight: '700', color: dark.muted, textAlign: 'center',
    marginTop: 2, textDecorationLine: 'underline',
  },
});
