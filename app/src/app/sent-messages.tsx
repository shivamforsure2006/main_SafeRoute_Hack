import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, MessageSquare, RefreshCw, Send, CheckCircle2, Share2 } from 'lucide-react-native';
import { lightColors, darkColors, themeTokens } from '@/theme/tokens';
import { useUserStore } from '@/store';
import { api } from '@/services/api';

export default function SentMessagesScreen() {
  const router = useRouter();
  const isDarkMode = useUserStore((s) => s.isDarkMode);
  const colors = isDarkMode ? darkColors : lightColors;

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    const logs = await api.fetchSentMessages();
    if (logs && logs.length > 0) {
      setMessages(logs);
    } else {
      // Fallback demo message records
      setMessages([
        {
          id: 'msg-1',
          recipient: '+919811122233',
          channel: 'SMS',
          status: 'MOCKED',
          content: 'SafeRoute Alert: Ananya Sharma started a trip to India Gate in Delhi. Follow live: http://localhost:8000/track/demo-trip-token-ig-safe-02',
          created_at: new Date().toISOString(),
        },
        {
          id: 'msg-2',
          recipient: '+919877788899',
          channel: 'WHATSAPP',
          status: 'MOCKED',
          content: 'EMERGENCY ALERT: Ananya Sharma has triggered an SOS alert in Delhi! Last location: (28.6139, 77.2090). Battery: 94%. Live link: http://localhost:8000/track/demo-sos-token - Call 112 if unreachable.',
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ]);
    }
    setLoading(false);
  };

  const handleShareMessage = async (content: string) => {
    try {
      await Share.share({ message: content });
    } catch {}
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.line }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={colors.ink} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.ink }]}>Sent Emergency Alerts</Text>

        <TouchableOpacity onPress={loadMessages} style={styles.refreshBtn}>
          <RefreshCw size={18} color={colors.signal} />
        </TouchableOpacity>
      </View>

      <View style={[styles.banner, { backgroundColor: colors.surfaceSubtle }]}>
        <Text style={[styles.bannerText, { color: colors.muted }]}>
          SafeRoute logs all outgoing SMS, WhatsApp, and push alerts. In demo mode, alerts are mocked and stored here without Twilio charges.
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.signal} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <MessageSquare size={48} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.ink }]}>No Messages Sent Yet</Text>
              <Text style={[styles.emptySub, { color: colors.muted }]}>
                Starting a trip or triggering an emergency SOS will dispatch alerts to your trusted contacts.
              </Text>
            </View>
          ) : (
            messages.map((m) => (
              <View
                key={m.id}
                style={[styles.msgCard, { backgroundColor: colors.surface, borderColor: colors.line }]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.recipientWrap}>
                    <Send size={14} color={colors.signal} />
                    <Text style={[styles.recipientText, { color: colors.ink }]}>{m.recipient}</Text>
                  </View>
                  <View style={styles.badgeRow}>
                    <View style={[styles.channelBadge, { backgroundColor: colors.surfaceSubtle }]}>
                      <Text style={[styles.channelText, { color: colors.ink }]}>{m.channel}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: colors.safeSubtle }]}>
                      <CheckCircle2 size={12} color={colors.safe} />
                      <Text style={[styles.statusText, { color: colors.safe }]}>{m.status}</Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.messageContent, { color: colors.ink }]}>{m.content}</Text>

                <View style={[styles.cardDivider, { backgroundColor: colors.line }]} />

                <View style={styles.cardFooter}>
                  <Text style={[styles.timeText, { color: colors.muted }]}>
                    {new Date(m.created_at).toLocaleString()}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleShareMessage(m.content)}
                    style={styles.shareBtn}
                  >
                    <Share2 size={14} color={colors.signal} />
                    <Text style={[styles.shareText, { color: colors.signal }]}>Share</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  refreshBtn: { padding: 4 },
  banner: { padding: 12, paddingHorizontal: 16 },
  bannerText: { fontSize: 12, lineHeight: 17 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollBody: { padding: 16, paddingBottom: 40 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 40, lineHeight: 18 },
  msgCard: {
    padding: 16,
    borderRadius: themeTokens.radii.card,
    borderWidth: 1,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recipientWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recipientText: { fontSize: 14, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', gap: 6 },
  channelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  channelText: { fontSize: 11, fontWeight: '700' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  messageContent: { fontSize: 13, lineHeight: 19 },
  cardDivider: { height: 1, marginVertical: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeText: { fontSize: 11 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shareText: { fontSize: 12, fontWeight: '600' },
});
