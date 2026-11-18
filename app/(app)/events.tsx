import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getWebBaseUrl } from "@/config";
import { createEvent, deleteEvent, getEvents, getOwnerEventMedia, getOwnerEventMediaDownloadUrl, rotateEventTokens, type EventItem } from "@/events/api";
import { downloadAuthenticatedFile } from "@/files/download";
import * as Sharing from "expo-sharing";
import { colors } from "@/ui/theme";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

export default function EventsScreen() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [gallerySetting, setGallerySetting] = useState<"PRIVATE" | "LINK_PUBLIC" | "PASSCODE">("LINK_PUBLIC");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  const eventsQuery = useQuery({ queryKey: ["events"], queryFn: getEvents });
  const ownerMediaQuery = useQuery({
    queryKey: ["event-owner-media", selected?.id],
    queryFn: () => getOwnerEventMedia(selected!.id),
    enabled: Boolean(selected?.id),
  });

  const create = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error("Add an event name.");
      const eventDate = date ? new Date(date) : null;
      if (!eventDate || Number.isNaN(eventDate.getTime())) throw new Error("Enter a valid event date.");
      if (gallerySetting === "PASSCODE" && passcode.length < 8) throw new Error("A gallery passcode must be at least 8 characters.");
      return createEvent({ name: name.trim(), date: eventDate.toISOString(), ...(description.trim() ? { description: description.trim() } : {}), gallerySetting, ...(gallerySetting === "PASSCODE" ? { passcode } : {}) });
    },
    onSuccess: async (created) => {
      setOpen(false); setName(""); setDate(""); setDescription(""); setPasscode(""); setError(""); setSelected(created);
      await queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The event could not be created."),
  });

  const remove = useMutation({
    mutationFn: (eventId: string) => deleteEvent(eventId),
    onSuccess: async () => { setSelected(null); await queryClient.invalidateQueries({ queryKey: ["events"] }); },
  });

  const rotate = useMutation({
    mutationFn: (eventId: string) => rotateEventTokens(eventId),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });

  if (eventsQuery.isPending) return <State title="Loading events…" />;
  if (eventsQuery.isError) return <State title="Events couldn’t load" detail={message(eventsQuery.error)} retry={() => void eventsQuery.refetch()} />;
  const events = eventsQuery.data ?? [];

  async function downloadOwnerMedia(media: { id: string; name: string; mimeType: string }) {
    if (!selected) return;
    setError("");
    try {
      const path = getOwnerEventMediaDownloadUrl(selected.id, media.id);
      const localFile = await downloadAuthenticatedFile(path, { id: media.id, name: media.name, mimeType: media.mimeType });
      if (!(await Sharing.isAvailableAsync())) throw new Error("File sharing is not available on this device.");
      await Sharing.shareAsync(localFile.uri, { mimeType: media.mimeType, dialogTitle: media.name });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Media could not be downloaded.");
    }
  }

  function confirmDelete(event: EventItem) {
    Alert.alert("Delete this event?", `${event.name} and its capture/gallery access will be removed.`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => remove.mutate(event.id) }]);
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.kicker}>EVENT GALLERIES</Text><Text style={styles.title}>Events</Text><Text style={styles.subtitle}>Create capture and gallery links for real events.</Text></View><Pressable onPress={() => { setError(""); setOpen(true); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>＋ New</Text></Pressable></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!events.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>No events yet</Text><Text style={styles.subtitle}>Create an event to generate capture and gallery links.</Text></View> : events.map((event) => (
        <Pressable key={event.id} onPress={() => setSelected(event)} style={[styles.eventCard, selected?.id === event.id ? styles.selected : null]}><View style={styles.eventCopy}><Text style={styles.eventTitle}>{event.name}</Text><Text style={styles.meta}>{dateFormat.format(new Date(event.date))} · {event.gallerySetting.toLowerCase().replaceAll("_", " ")}</Text>{event.description ? <Text numberOfLines={2} style={styles.description}>{event.description}</Text> : null}</View><Text style={styles.status}>{event.status.toLowerCase()}</Text></Pressable>
      ))}
      {selected ? <View style={styles.detailCard}><Text style={styles.kicker}>SELECTED EVENT</Text><Text style={styles.detailTitle}>{selected.name}</Text><Text style={styles.meta}>{dateFormat.format(new Date(selected.date))}</Text><View style={styles.linkCard}><Text style={styles.label}>Capture link</Text><Text selectable style={styles.linkText}>{`${getWebBaseUrl()}/capture/${encodeURIComponent(selected.captureToken)}`}</Text><Text style={styles.label}>Gallery link</Text><Text selectable style={styles.linkText}>{`${getWebBaseUrl()}/gallery/${encodeURIComponent(selected.galleryToken)}`}</Text></View><View style={styles.ownerMediaSection}><Text style={styles.sectionTitle}>Owner media</Text>{ownerMediaQuery.isPending ? <Text style={styles.meta}>Loading media…</Text> : ownerMediaQuery.isError ? <Pressable onPress={() => void ownerMediaQuery.refetch()}><Text style={styles.retry}>Retry media</Text></Pressable> : (ownerMediaQuery.data ?? []).length ? (ownerMediaQuery.data ?? []).map((media) => <View key={media.id} style={styles.ownerMediaRow}><View style={styles.ownerMediaCopy}><Text numberOfLines={1} style={styles.ownerMediaName}>{media.name}</Text><Text style={styles.meta}>{media.mimeType} · {formatBytes(media.sizeBytes)}</Text></View><Pressable onPress={() => void downloadOwnerMedia(media)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Open</Text></Pressable></View>) : <Text style={styles.meta}>No uploaded media yet.</Text>}</View><View style={styles.actions}><Pressable disabled={rotate.isPending} onPress={() => rotate.mutate(selected.id)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{rotate.isPending ? "Rotating…" : "Rotate links"}</Text></Pressable><Pressable onPress={() => confirmDelete(selected)} style={styles.cancelButton}><Text style={styles.cancelText}>Delete</Text></Pressable></View></View> : null}

      <Modal animationType="slide" transparent onRequestClose={() => setOpen(false)} visible={open}><View style={styles.modalBackdrop}><View style={styles.sheet}><View style={styles.grabber} /><ScrollView contentContainerStyle={styles.sheetContent}><Text style={styles.kicker}>NEW EVENT</Text><Text style={styles.sheetTitle}>Create event</Text><Text style={styles.label}>Event name</Text><TextInput maxLength={160} value={name} onChangeText={setName} placeholder="Event name" placeholderTextColor={colors.muted} style={styles.input} /><Text style={styles.label}>Date · YYYY-MM-DD</Text><TextInput autoCapitalize="none" value={date} onChangeText={setDate} placeholder="2026-12-01" placeholderTextColor={colors.muted} style={styles.input} /><Text style={styles.label}>Description · optional</Text><TextInput multiline maxLength={4000} value={description} onChangeText={setDescription} placeholder="What is the event for?" placeholderTextColor={colors.muted} style={[styles.input, styles.textarea]} /><Text style={styles.label}>Gallery access</Text><View style={styles.choiceRow}>{(["PRIVATE", "LINK_PUBLIC", "PASSCODE"] as const).map((item) => <Pressable key={item} onPress={() => setGallerySetting(item)} style={[styles.choice, gallerySetting === item ? styles.choiceSelected : null]}><Text style={[styles.choiceText, gallerySetting === item ? styles.choiceTextSelected : null]}>{item.toLowerCase().replaceAll("_", " ")}</Text></Pressable>)}</View>{gallerySetting === "PASSCODE" ? <><Text style={styles.label}>Gallery passcode · at least 8 characters</Text><TextInput secureTextEntry value={passcode} onChangeText={setPasscode} placeholder="Passcode" placeholderTextColor={colors.muted} style={styles.input} /></> : null}{error ? <Text style={styles.error}>{error}</Text> : null}<View style={styles.actions}><Pressable onPress={() => setOpen(false)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Cancel</Text></Pressable><Pressable disabled={create.isPending} onPress={() => { setError(""); create.mutate(); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{create.isPending ? "Creating…" : "Create event"}</Text></Pressable></View></ScrollView></View></View></Modal>
    </ScrollView>
  );
}

function State({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) { return <View style={styles.state}>{!detail ? <ActivityIndicator color={colors.green} /> : null}<Text style={styles.eventTitle}>{title}</Text>{detail ? <Text style={styles.subtitle}>{detail}</Text> : null}{retry ? <Pressable onPress={retry}><Text style={styles.retry}>Try again</Text></Pressable> : null}</View>; }
function formatBytes(value: string): string { const bytes = Number(value); if (!Number.isFinite(bytes) || bytes < 0) return "—"; if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / 1024 ** 2).toFixed(1)} MB`; }
function message(error: unknown): string { return error instanceof Error ? error.message : "Please try again."; }

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 650, alignSelf: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 36, gap: 12 }, header: { flexDirection: "row", alignItems: "center", gap: 10 }, headerCopy: { flex: 1, gap: 4 }, kicker: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: "700" }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 16 }, primaryButton: { backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center" }, primaryButtonText: { color: colors.surface, fontSize: 10, fontWeight: "800" }, secondaryButton: { backgroundColor: colors.greenWash, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 8, alignItems: "center" }, secondaryButtonText: { color: colors.greenDark, fontSize: 9, fontWeight: "800" }, cancelButton: { backgroundColor: colors.redWash, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 8 }, cancelText: { color: colors.red, fontSize: 9, fontWeight: "800" },
  eventCard: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surface, padding: 11 }, selected: { borderColor: colors.green, backgroundColor: colors.greenWash }, eventCopy: { flex: 1, gap: 3 }, eventTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" }, meta: { color: colors.muted, fontSize: 8, lineHeight: 13 }, description: { color: colors.text, fontSize: 10, lineHeight: 15 }, status: { color: colors.greenDark, backgroundColor: colors.greenWash, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 5, fontSize: 8, fontWeight: "800" }, empty: { alignItems: "center", gap: 7, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface, padding: 20 }, emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" }, detailCard: { gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface, padding: 12 }, detailTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" }, linkCard: { gap: 5, borderRadius: 10, backgroundColor: colors.background, padding: 9 }, label: { color: colors.ink, fontSize: 9, fontWeight: "800" }, linkText: { color: colors.greenDark, fontSize: 9, lineHeight: 14 }, actions: { flexDirection: "row", gap: 7 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(12,31,24,.42)" }, sheet: { maxHeight: "90%", backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 9, paddingBottom: 22 }, grabber: { width: 40, height: 4, borderRadius: 3, backgroundColor: colors.line, alignSelf: "center", marginBottom: 12 }, sheetContent: { gap: 9, paddingBottom: 10 }, sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: "800" }, input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.surface, color: colors.ink, paddingHorizontal: 11, paddingVertical: 10, fontSize: 12 }, textarea: { minHeight: 90, textAlignVertical: "top" }, choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, choice: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 7 }, choiceSelected: { backgroundColor: colors.greenWash, borderColor: colors.green }, choiceText: { color: colors.muted, fontSize: 8, fontWeight: "700" }, choiceTextSelected: { color: colors.greenDark }, error: { color: colors.red, backgroundColor: colors.redWash, borderRadius: 9, padding: 8, fontSize: 10 }, retry: { color: colors.greenDark, fontSize: 10, fontWeight: "800" }, state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 9, padding: 24 },
  sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  ownerMediaSection: { gap: 7, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 9 },
  ownerMediaRow: { flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 7 },
  ownerMediaCopy: { flex: 1, gap: 2 },
  ownerMediaName: { color: colors.text, fontSize: 10, fontWeight: "700" },});
