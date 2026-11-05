import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AlertTriangle, AlertCircle, ShieldAlert, Check, Phone } from 'lucide-react-native';
import { lightColors, darkColors } from '@/theme/tokens';
import { useTripStore, useUserStore } from '@/store';
import { stopEmergencyVibration } from '@/services/alert';

export function CheckInModal() {
  const status = useTripStore((s) => s.status);
  const anomalyReason = useTripStore((s) => s.anomalyReason);
  const countdown = useTripStore((s) => s.checkInCountdown);
  const decrementCountdown = useTripStore((s) => s.decrementCountdown);
  const resolveCheckIn = useTripStore((s) => s.resolveCheckIn);
  const triggerSOS = useTripStore((s) => s.triggerSOS);

  const isDarkMode = useUserStore((s) => s.isDarkMode);
  const contacts = useUserStore((s) => s.contacts);
  const colors = isDarkMode ? darkColors : lightColors;

  const [enteredPin, setEnteredPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const isVisible = status === 'CHECK_IN';

  useEffect(() => {
    let timer: any;
    if (isVisible) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch (_) {}
      timer = setInterval(() => {
        decrementCountdown();
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isVisible, decrementCountdown]);

  const handleKeyPress = (num: string) => {
    if (enteredPin.length < 4) {
      const nextPin = enteredPin + num;
      setEnteredPin(nextPin);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setEnteredPin(enteredPin.slice(0, -1));
    setErrorMessage('');
  };

  const verifyPin = (pin: string) => {
    const result = resolveCheckIn(pin);
    if (result.success) {
      stopEmergencyVibration();
      if (result.isDuress) {
        setToastMessage('Check-in confirmed.');
      }
      setEnteredPin('');
      setErrorMessage('');
    } else {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      setErrorMessage('Incorrect Safety Code. Please re-enter.');
      setEnteredPin('');
    }
  };

  if (!isVisible && !toastMessage) return null;

  // Format contacts summary string
  const contactNames = contacts.map((c) => c.name).slice(0, 3).join(', ');
  const moreCount = contacts.length > 3 ? ` +${contacts.length - 3} more` : '';

  return (
    <Modal visible={isVisible} animationType="fade" transparent={true}>
      <View style={styles.backdrop}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.headerBadge, { backgroundColor: colors.dangerSubtle }]}>
            <AlertTriangle size={22} color={colors.danger} />
            <Text style={[styles.badgeText, { color: colors.danger }]}>ANOMALY DETECTED</Text>
          </View>

          <Text style={[styles.title, { color: colors.ink }]}>Safety Check-In Required</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {anomalyReason || 'Route deviation or unusual stationary stop detected.'}
          </Text>

          {/* Prominent Emergency Warning Notice */}
          <View style={[styles.warningNoticeBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.line }]}>
            <ShieldAlert size={18} color={colors.danger} style={{ marginTop: 2 }} />
            <Text style={[styles.warningNoticeText, { color: colors.ink }]}>
              An emergency SOS message will be automatically sent to your trusted contacts (
              <Text style={{ fontWeight: '700', color: colors.signal }}>
                {contactNames}
                {moreCount}
              </Text>
              ) via <Text style={{ fontWeight: '700' }}>Email & SMS</Text> in{' '}
              <Text style={{ fontWeight: '800', color: colors.danger }}>{countdown}s</Text> if you do not enter your Safety Code!
            </Text>
          </View>

          {/* Deliberate Countdown Ring */}
          <View style={styles.countdownRingContainer}>
            <View
              style={[
                styles.countdownRing,
                {
                  borderColor: countdown <= 15 ? colors.danger : colors.caution,
                  backgroundColor: isDarkMode ? colors.surfaceSubtle : '#fffaf0',
                },
              ]}
            >
              <Text
                style={[
                  styles.countdownNumber,
                  { color: countdown <= 15 ? colors.danger : colors.caution },
                ]}
              >
                {countdown}
              </Text>
              <Text style={[styles.countdownLabel, { color: colors.muted }]}>sec remaining</Text>
            </View>
          </View>

          {/* PIN Digits Display */}
          <View style={styles.pinDisplayRow}>
            {[0, 1, 2, 3].map((idx) => (
              <View
                key={idx}
                style={[
                  styles.pinDot,
                  {
                    backgroundColor:
                      idx < enteredPin.length
                        ? colors.signal
                        : isDarkMode
                        ? colors.surfaceSubtle
                        : colors.line,
                    borderColor: colors.line,
                  },
                ]}
              />
            ))}
          </View>

          {errorMessage ? (
            <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
          ) : (
            <Text style={[styles.pinInstruction, { color: colors.muted }]}>
              Enter your 4-digit Safety Code to confirm you are safe
            </Text>
          )}

          {/* Numeric Keypad */}
          <View style={styles.keypad}>
            {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', '⌫']].map(
              (row, rowIdx) => (
                <View key={rowIdx} style={styles.keypadRow}>
                  {row.map((btn, colIdx) => {
                    if (btn === '') {
                      return <View key={colIdx} style={styles.keypadBtnPlaceholder} />;
                    }
                    if (btn === '⌫') {
                      return (
                        <TouchableOpacity
                          key={colIdx}
                          onPress={handleBackspace}
                          style={[styles.keypadBtn, { backgroundColor: colors.surfaceSubtle }]}
                          accessibilityLabel="Delete digit"
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
                        accessibilityLabel={`Digit ${btn}`}
                      >
                        <Text style={[styles.keypadBtnText, { color: colors.ink }]}>{btn}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )
            )}
          </View>

          {/* Immediate SOS Button */}
          <TouchableOpacity
            onPress={() => triggerSOS('CHECK_IN_IMMEDIATE_HELP')}
            style={[styles.emergencyHelpBtn, { backgroundColor: colors.danger }]}
            accessibilityRole="button"
            accessibilityLabel="I need help now. Triggers emergency SOS immediately."
          >
            <AlertCircle size={20} color="#ffffff" />
            <Text style={styles.emergencyHelpText}>I need help now (Send SOS Immediately)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(27, 31, 59, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  warningNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    width: '100%',
  },
  warningNoticeText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  countdownRingContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },
  countdownRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownNumber: {
    fontSize: 28,
    fontWeight: '900',
  },
  countdownLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pinDisplayRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  pinInstruction: {
    fontSize: 12,
    marginBottom: 8,
  },
  keypad: {
    width: '100%',
    gap: 8,
    marginBottom: 14,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  keypadBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadBtnPlaceholder: {
    flex: 1,
  },
  keypadBtnText: {
    fontSize: 20,
    fontWeight: '700',
  },
  emergencyHelpBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emergencyHelpText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
