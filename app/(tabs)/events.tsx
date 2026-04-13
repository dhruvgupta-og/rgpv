import {
  StyleSheet, Text, View, FlatList, Platform, TouchableOpacity, Modal,
  ScrollView, TextInput, Alert, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/lib/theme";
import { apiRequest } from "@/lib/query-client";

type RegField = { label: string; type: string; required: boolean };

type Event = {
  id: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  location?: string;
  type?: string;
  registrationOpen?: boolean;
  maxRegistrations?: number;
  registrationCount?: number;
  registrationFields?: RegField[];
};

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const queryClient = useQueryClient();

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const registerMutation = useMutation({
    mutationFn: async ({ eventId, fields }: { eventId: string; fields: Record<string, string> }) => {
      // find the first email/phone field as identifier
      const event = events.find(e => e.id === eventId);
      const identifierField = event?.registrationFields?.find(f => f.type === 'email' || f.type === 'phone');
      const identifier = identifierField ? fields[identifierField.label] : '';
      const res = await apiRequest("POST", `/api/events/${eventId}/register`, { fields, identifier });
      return res.json();
    },
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
    onError: (e: any) => {
      Alert.alert("Registration Failed", e.message || "Please try again");
    },
  });

  const typeColor = (type?: string) => {
    if (type === 'Deadline') return colors.danger;
    if (type === 'Hackathon' || type === 'Workshop') return colors.accent;
    return colors.primary;
  };

  const openModal = (event: Event) => {
    setSelectedEvent(event);
    setFormValues({});
    setSuccess(false);
    setRegistering(false);
  };

  const closeModal = () => { setSelectedEvent(null); setSuccess(false); };

  const handleRegister = () => {
    if (!selectedEvent) return;
    const fields = selectedEvent.registrationFields || [];
    for (const f of fields) {
      if (f.required && !formValues[f.label]?.trim()) {
        Alert.alert("Required", `${f.label} is required`);
        return;
      }
    }
    registerMutation.mutate({ eventId: selectedEvent.id, fields: formValues });
  };

  const formatDate = (date: string, endDate?: string) => {
    const d = new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!endDate) return d;
    const e = new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return `${d} – ${e}`;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 12 }]}>
        <Text style={styles.headerTitle}>Events</Text>
      </View>

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 }]}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => openModal(item)}
            >
              <View style={styles.cardTop}>
                <Text style={styles.title}>{item.title}</Text>
                <View style={[styles.tag, { backgroundColor: typeColor(item.type) + '20' }]}>
                  <Text style={[styles.tagText, { color: typeColor(item.type) }]}>{item.type || 'Event'}</Text>
                </View>
              </View>
              {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.metaText}>{formatDate(item.date, item.endDate)}</Text>
                </View>
                {item.location ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                    <Text style={styles.metaText}>{item.location}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.cardFooter}>
                <Text style={[
                  styles.regStatus,
                  { color: item.registrationOpen === false ? colors.textMuted : colors.accent }
                ]}>
                  {item.registrationOpen === false ? 'Registration Closed' : 'Registration Open'}
                </Text>
                {item.maxRegistrations ? (
                  <Text style={styles.metaText}>
                    {item.registrationCount || 0}/{item.maxRegistrations} registered
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No events scheduled</Text>
              <Text style={styles.emptySubtext}>Upcoming college events will appear here</Text>
            </View>
          }
        />
      )}

      {/* Registration Modal */}
      {selectedEvent && (
        <Modal visible transparent animationType="slide" onRequestClose={closeModal}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{selectedEvent.title}</Text>
                <TouchableOpacity onPress={closeModal}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                {success ? (
                  <View style={styles.successBox}>
                    <Ionicons name="checkmark-circle" size={48} color={colors.accent} />
                    <Text style={[styles.emptyTitle, { color: colors.accent, marginTop: 12 }]}>Registered!</Text>
                    <Text style={styles.emptySubtext}>You are successfully registered for this event.</Text>
                    <TouchableOpacity style={[styles.btn, { marginTop: 20 }]} onPress={closeModal}>
                      <Text style={styles.btnText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {selectedEvent.description ? (
                      <Text style={[styles.desc, { marginBottom: 16 }]}>{selectedEvent.description}</Text>
                    ) : null}
                    <View style={styles.infoRow}>
                      <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
                      <Text style={styles.infoText}>{formatDate(selectedEvent.date, selectedEvent.endDate)}</Text>
                    </View>
                    {selectedEvent.location ? (
                      <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={15} color={colors.textMuted} />
                        <Text style={styles.infoText}>{selectedEvent.location}</Text>
                      </View>
                    ) : null}

                    {selectedEvent.registrationOpen === false ? (
                      <View style={[styles.infoRow, { marginTop: 20 }]}>
                        <Text style={{ color: colors.textMuted, textAlign: 'center', flex: 1 }}>
                          Registration for this event is closed.
                        </Text>
                      </View>
                    ) : (
                      <>
                        {(selectedEvent.registrationFields || []).length > 0 ? (
                          <>
                            <Text style={[styles.sectionHead, { marginTop: 20 }]}>Register</Text>
                            {selectedEvent.registrationFields!.map((f) => (
                              <View key={f.label} style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>{f.label}{f.required ? ' *' : ''}</Text>
                                <TextInput
                                  style={styles.input}
                                  placeholder={f.label}
                                  placeholderTextColor={colors.textMuted}
                                  keyboardType={
                                    f.type === 'email' ? 'email-address' :
                                    f.type === 'phone' ? 'phone-pad' :
                                    f.type === 'number' ? 'numeric' : 'default'
                                  }
                                  value={formValues[f.label] || ''}
                                  onChangeText={(v) => setFormValues(prev => ({ ...prev, [f.label]: v }))}
                                />
                              </View>
                            ))}
                            <TouchableOpacity
                              style={[styles.btn, registerMutation.isPending && { opacity: 0.7 }]}
                              onPress={handleRegister}
                              disabled={registerMutation.isPending}
                            >
                              {registerMutation.isPending
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.btnText}>Register Now</Text>}
                            </TouchableOpacity>
                          </>
                        ) : (
                          <TouchableOpacity
                            style={[styles.btn, { marginTop: 20 }, registerMutation.isPending && { opacity: 0.7 }]}
                            onPress={handleRegister}
                            disabled={registerMutation.isPending}
                          >
                            {registerMutation.isPending
                              ? <ActivityIndicator color="#fff" />
                              : <Text style={styles.btnText}>Register</Text>}
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
    headerTitle: { fontFamily: "Inter_700Bold", fontSize: 26, color: colors.text },
    listContent: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
    card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, gap: 8 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
    title: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.text, flex: 1 },
    desc: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
    tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    tagText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
    cardMeta: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontFamily: "Inter_400Regular", fontSize: 12, color: colors.textMuted },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    regStatus: { fontFamily: 'Inter_500Medium', fontSize: 12 },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
    emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.textSecondary },
    emptySubtext: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: 'center', color: colors.textMuted },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
    sheetTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: colors.text, flex: 1, marginRight: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    infoText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary },
    sectionHead: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.text, marginBottom: 12 },
    inputGroup: { marginBottom: 14 },
    inputLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
    input: { backgroundColor: colors.backgroundLight, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, padding: 12, color: colors.text, fontFamily: 'Inter_400Regular', fontSize: 14 },
    btn: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
    btnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' },
    successBox: { alignItems: 'center', paddingVertical: 40 },
  });
}
