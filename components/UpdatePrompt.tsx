import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { useUpdates } from '@/lib/updates';
import { useTheme } from '@/lib/theme';

export function UpdatePrompt() {
  const { isUpdateAvailable, isChecking, reload } = useUpdates();
  const { colors } = useTheme();

  if (!isUpdateAvailable) return null;

  return (
    <Modal transparent animationType="fade" visible={isUpdateAvailable}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.text }]}>New Update Available!</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            A newer version of the app is ready. Would you like to restart to apply the update?
          </Text>
          
          <Pressable 
            onPress={reload}
            style={({ pressed }) => [
              styles.button, 
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }
            ]}
          >
            <Text style={styles.buttonText}>Restart and Update</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
