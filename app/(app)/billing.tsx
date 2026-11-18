import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { createCheckout, getPayment, getPayments, getPlans, getSubscription } from "@/account/api";
import { colors } from "@/ui/theme";

export default function BillingScreen() {
  const [error, setError] = useState("");
  const [selectedCheckoutId, setSelectedCheckoutId] = useState("");
  const subscriptionQuery = useQuery({ queryKey: ["account-subscription"], queryFn: getSubscription });
  const plansQuery = useQuery({ queryKey: ["public-plans"], queryFn: getPlans });
  const paymentsQuery = useQuery({ queryKey: ["account-payments"], queryFn: getPayments });
  const paymentQuery = useQuery({
    queryKey: ["account-payment", selectedCheckoutId],
    queryFn: () => getPayment(selectedCheckoutId),
    enabled: Boolean(selectedCheckoutId),
  });

  const checkout = useMutation({
    mutationFn: (plan: "PRO" | "BUSINESS") => createCheckout(plan),
    onSuccess: async (result) => {
      setError("");
      setSelectedCheckoutId(result.checkoutId);
      if (result.checkoutUrl) await Linking.openURL(result.checkoutUrl);
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Checkout could not be started."),
  });

  if (subscriptionQuery.isPending || plansQuery.isPending || paymentsQuery.isPending) {
    return <View style={styles.state}><ActivityIndicator color={colors.green} /><Text style={styles.detailTitle}>Loading billing…</Text></View>;
  }

  const unavailable = subscriptionQuery.isError || plansQuery.isError || paymentsQuery.isError;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}><Text style={styles.kicker}>BILLING</Text><Text style={styles.title}>Plans & payment</Text><Text style={styles.subtitle}>Plan changes and checkout are confirmed by the server.</Text></View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {subscriptionQuery.isError ? <Pressable onPress={() => void subscriptionQuery.refetch()}><Text style={styles.retry}>Retry subscription</Text></Pressable> : null}
      {plansQuery.isError ? <Pressable onPress={() => void plansQuery.refetch()}><Text style={styles.retry}>Retry plans</Text></Pressable> : null}
      {paymentsQuery.isError ? <Pressable onPress={() => void paymentsQuery.refetch()}><Text style={styles.retry}>Retry payments</Text></Pressable> : null}

      {!unavailable ? (
        <>
          <View style={styles.card}><Text style={styles.kicker}>CURRENT PLAN</Text><Text style={styles.planName}>{subscriptionQuery.data?.plan ?? "FREE"}</Text><Text style={styles.meta}>{subscriptionQuery.data?.status ?? "Confirmed subscription status"}</Text></View>
          <View style={styles.plans}>
            <PlanChoice title="Pro" detail="Advanced account and team workflows" onPress={() => checkout.mutate("PRO")} pending={checkout.isPending} />
            <PlanChoice title="Business" detail="Workspace, administration and team tools" onPress={() => checkout.mutate("BUSINESS")} pending={checkout.isPending} />
          </View>
          <View style={styles.card}><Text style={styles.sectionTitle}>Payment status</Text>{selectedCheckoutId ? paymentQuery.isPending ? <Text style={styles.meta}>Checking payment…</Text> : paymentQuery.isError ? <Pressable onPress={() => void paymentQuery.refetch()}><Text style={styles.retry}>Retry payment status</Text></Pressable> : <Text style={styles.meta}>Status: {paymentQuery.data?.status ?? "Unknown"}</Text> : <Text style={styles.meta}>Start or select a payment to reconcile its server-confirmed status.</Text>}</View>
          <View style={styles.card}><Text style={styles.sectionTitle}>Recent payments</Text>{(paymentsQuery.data ?? []).length ? (paymentsQuery.data ?? []).slice(0, 10).map((payment) => <Pressable key={payment.id} onPress={() => setSelectedCheckoutId(payment.checkoutId)} style={styles.paymentRow}><View style={styles.paymentCopy}><Text style={styles.paymentTitle}>{payment.plan} · {payment.status}</Text><Text style={styles.meta}>{payment.currency} {payment.amountMinor} · {new Date(payment.createdAt).toLocaleString()}</Text></View><Text style={styles.retry}>Check ›</Text></Pressable>) : <Text style={styles.meta}>No payments yet.</Text>}</View>
        </>
      ) : null}
    </ScrollView>
  );
}

function PlanChoice({ title, detail, pending, onPress }: { title: string; detail: string; pending: boolean; onPress: () => void }) {
  return <View style={styles.planCard}><Text style={styles.planName}>{title}</Text><Text style={styles.meta}>{detail}</Text><Pressable disabled={pending} onPress={onPress} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{pending ? "Starting…" : "Choose plan"}</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 650, alignSelf: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 36, gap: 12 },
  header: { gap: 4 },
  kicker: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  detailTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  planName: { color: colors.greenDark, fontSize: 20, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 9, lineHeight: 14 },
  card: { gap: 7, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface, padding: 12 },
  plans: { flexDirection: "row", gap: 8 },
  planCard: { flex: 1, gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface, padding: 12 },
  primaryButton: { backgroundColor: colors.green, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  primaryButtonText: { color: colors.surface, fontSize: 10, fontWeight: "800" },
  paymentRow: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 },
  paymentCopy: { flex: 1, gap: 2 },
  paymentTitle: { color: colors.text, fontSize: 10, fontWeight: "800" },
  error: { color: colors.red, backgroundColor: colors.redWash, borderRadius: 10, padding: 9, fontSize: 10 },
  retry: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 9 },
});
