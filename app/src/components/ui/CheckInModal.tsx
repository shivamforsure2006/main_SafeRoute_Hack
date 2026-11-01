import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AlertTriangle, AlertCircle } from 'lucide-react-native';
import { lightColors, darkColors, themeTokens } from '@/theme/tokens';
import { useTripStore, useUserStore } from '@/store';

export function CheckInModal() {
  const status = useTripStore((s) => s.status);
  const anomalyReason = useTripStore((s) => s.anomalyReason);
  const countdown = useTripStore((s) => s.checkInCountdown);
  const decrementCountdown = useTripStore((s) => s.decrementCountdown);
  const resolveCheckIn = useTripStore((s) => s.resolveCheckIn);
  const triggerSOS = useTripStore((s) => s.triggerSOS);

  const isDarkMode = useUserStore((s) => s.isDarkMode);
  const colors = isDarkMode ? darkColors : lightColors;

  const [enteredPin, setEnteredPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const isVisible = status === 'CHECK_IN';

  useEffect(() => {
    let timer: any;
    if (isVisible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
      if (result.isDuress) {
        setToastMessage('Check-in confirmed.');
      }
      setEnteredPin('');
      setErrorMessage('');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage('Incorrect PIN. Please re-enter.');
      setEnteredPin('');
    }
  };

  if (!isVisible && !toastMessage) return null;

  return (
    <Modal visible={isVisible} animationType="fade" transparent={true}>
      <View style={styles.backdrop}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.headerBadge, { backgroundColor: colors.cautionSubtle }]}>
            <AlertTriangle size={24} color={colors.caution} />
            <Text style={[styles.badgeText, { color: colors.caution }]}>Safety Check-In</Text>
          </View>

          <Text style={[styles.title, { color: colors.ink }]}>Are you okay?</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {anomalyReason || 'Route deviation or unusual stop detected.'}
          </Text>

          {/* Deliberate Countdown Ring */}
          <View style={styles.countdownRingContainer}>
            <View
              style={[
                styles.countdownRing,
                {
                  borderColor: countdown <= 10 ? colors.danger : colors.caution,
                  backgroundColor: isDarkMode ? colors.surfaceSubtle : '#fffaf0',
                },
              ]}
            >
              <Text
                style={[
                  styles.countdownNumber,
                  { color: countdown <= 10 ? colors.danger : colors.caution },
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
              Enter 4-digit PIN to dismiss check-in
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
            <Text style={styles.emergencyHelpText}>I need help now (Trigger SOS)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(27, 31, 59, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: themeTokens.radii.sheet,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  countdownRingContainer: {
    marginVertical: 10,
  },
  countdownRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNumber: {
    fontSize: 32,
    fontWeight: '800',
  },
  countdownLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: -2,
  },
  pinDisplayRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  pinInstruction: {
    fontSize: 12,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 14,
  },
  keypad: {
    width: '100%',
    marginBottom: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  keypadBtn: {
    width: 68,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadBtnPlaceholder: {
    width: 68,
    height: 52,
  },
  keypadBtnText: {
    fontSize: 22,
    fontWeight: '700',
  },
  emergencyHelpBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: themeTokens.radii.button,
  },
  emergencyHelpText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
