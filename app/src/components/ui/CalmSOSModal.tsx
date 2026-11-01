import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking } from 'react-native';
import { ShieldCheck, PhoneCall, CheckCircle2, Lock } from 'lucide-react-native';
import { lightColors, darkColors, themeTokens } from '@/theme/tokens';
import { useTripStore, useUserStore } from '@/store';

export function CalmSOSModal() {
  const status = useTripStore((s) => s.status);
  const cancelSOS = useTripStore((s) => s.cancelSOS);
  const trackingUrl = useTripStore((s) => s.trackingUrl);
  const isDarkMode = useUserStore((s) => s.isDarkMode);
  const colors = isDarkMode ? darkColors : lightColors;

  const [enteredPin, setEnteredPin] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [errorText, setErrorText] = useState('');

  const isVisible = status === 'SOS_ACTIVE';

  const handleCall112 = () => {
    Linking.openURL('tel:112');
  };

  const handleKeyPress = (num: string) => {
    if (enteredPin.length < 4) {
      const nextPin = enteredPin + num;
      setEnteredPin(nextPin);
      if (nextPin.length === 4) {
        verifyCancel(nextPin);
      }
    }
  };

  const verifyCancel = async (pin: string) => {
    const success = await cancelSOS(pin);
    if (success) {
      setEnteredPin('');
      setShowPinInput(false);
      setErrorText('');
    } else {
      setErrorText('Incorrect PIN. Emergency alert remains active.');
      setEnteredPin('');
    }
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} animationType="slide" transparent={false}>
      <View style={[styles.container, { backgroundColor: colors.paper }]}>
        <View style={styles.content}>
          {/* Calm Protective Shield */}
          <View style={[styles.iconCircle, { backgroundColor: colors.safeSubtle, borderColor: colors.safe }]}>
            <ShieldCheck size={56} color={colors.safe} />
          </View>

          <Text style={[styles.mainHeading, { color: colors.ink }]}>Help is on the way.</Text>
          <Text style={[styles.description, { color: colors.muted }]}>
            Your emergency alert has been broadcast. Your trusted contacts and nearby verified volunteers in Delhi have received your live location and tracking link.
          </Text>

          {/* Status Badges */}
          <View style={[styles.statusBox, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={styles.statusRow}>
              <CheckCircle2 size={18} color={colors.safe} />
              <Text style={[styles.statusText, { color: colors.ink }]}>Emergency contacts alerted via SMS</Text>
            </View>
            <View style={styles.statusRow}>
              <CheckCircle2 size={18} color={colors.safe} />
              <Text style={[styles.statusText, { color: colors.ink }]}>Nearby community volunteers notified</Text>
            </View>
            <View style={styles.statusRow}>
              <CheckCircle2 size={18} color={colors.signal} />
              <Text style={[styles.statusText, { color: colors.signal }]} numberOfLines={1}>
                Live link: {trackingUrl || 'Active on Delhi radar'}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            onPress={handleCall112}
            style={[styles.call112Btn, { backgroundColor: colors.danger }]}
            accessibilityRole="button"
            accessibilityLabel="Call 112 Delhi Police"
          >
            <PhoneCall size={22} color="#ffffff" />
            <Text style={styles.call112Text}>Call 112 (Delhi Police)</Text>
          </TouchableOpacity>

          {!showPinInput ? (
            <TouchableOpacity
              onPress={() => setShowPinInput(true)}
              style={[styles.safeCancelBtn, { borderColor: colors.line, backgroundColor: colors.surface }]}
              accessibilityRole="button"
              accessibilityLabel="I am safe. Enter PIN to cancel alert"
            >
              <Lock size={18} color={colors.ink} />
              <Text style={[styles.safeCancelText, { color: colors.ink }]}>I'm safe (Enter PIN to cancel)</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.pinSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.pinHeading, { color: colors.ink }]}>Enter normal PIN to resolve alert</Text>
              
              <View style={styles.pinDisplayRow}>
                {[0, 1, 2, 3].map((idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.pinDot,
                      {
                        backgroundColor: idx < enteredPin.length ? colors.signal : colors.line,
                        borderColor: colors.line,
                      },
                    ]}
                  />
                ))}
              </View>

              {errorText ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>{errorText}</Text>
              ) : null}

              {/* Compact Keypad */}
              <View style={styles.keypad}>
                {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', '⌫']].map(
                  (row, rowIdx) => (
                    <View key={rowIdx} style={styles.keypadRow}>
                      {row.map((btn, colIdx) => {
                        if (btn === '') return <View key={colIdx} style={styles.keypadBtnPlaceholder} />;
                        if (btn === '⌫') {
                          return (
                            <TouchableOpacity
                              key={colIdx}
                              onPress={() => setEnteredPin(enteredPin.slice(0, -1))}
                              style={[styles.keypadBtn, { backgroundColor: colors.surfaceSubtle }]}
                            >
                              <Text style={[styles.keypadBtnText, { color: colors.ink }]}>⌫</Text>
                            </TouchableOpacity>
                          );
                        }
                        return (
                          <TouchableOpacity
                            key={colIdx}
                            onPress={() => handleKeyPress(btn)}
                            style={[styles.keypadBtn, { backgroundColor: colors.surfaceSubtle }]}
                          >
                            <Text style={[styles.keypadBtnText, { color: colors.ink }]}>{btn}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  mainHeading: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  statusBox: {
    width: '100%',
    padding: 16,
    borderRadius: themeTokens.radii.card,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  call112Btn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: themeTokens.radii.button,
    marginBottom: 14,
  },
  call112Text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  safeCancelBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: themeTokens.radii.button,
    borderWidth: 1,
  },
  safeCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pinSection: {
    width: '100%',
    padding: 16,
    borderRadius: themeTokens.radii.card,
    alignItems: 'center',
  },
  pinHeading: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  pinDisplayRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  keypad: {
    width: '100%',
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  keypadBtn: {
    width: 60,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadBtnPlaceholder: {
    width: 60,
    height: 44,
  },
  keypadBtnText: {
    fontSize: 18,
    fontWeight: '700',
  },
});
