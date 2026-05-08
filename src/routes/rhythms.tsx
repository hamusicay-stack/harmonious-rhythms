import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { SmartRhythmsProvider, useSmartRhythms } from "@/components/rhythm/SmartRhythmsContext";
import { KeyboardModelSelector } from "@/components/rhythm/KeyboardModelSelector";
import { VisualOrganInterface } from "@/components/rhythm/VisualOrganInterface";

export const Route = createFileRoute("/rhythms")({
  head: () => ({
    meta: [
      { title: "חנות המקצבים — Smart Rhythms" },
      { name: "description", content: "חנות מקצבים חכמים לאורגנים מקצועיים — בחר דגם, האזן וקנה ערכות מקצב." },
      { property: "og:title", content: "חנות המקצבים — Smart Rhythms" },
      { property: "og:description", content: "חנות מקצבים חכמים לאורגנים מקצועיים." },
    ],
  }),
  component: RhythmsPage,
});

function RhythmsPage() {
  return (
    <SiteLayout>
      <SmartRhythmsProvider>
        <RhythmsFlow />
      </SmartRhythmsProvider>
    </SiteLayout>
  );
}

function RhythmsFlow() {
  const { selectedModel, setSelectedModel } = useSmartRhythms();
  const [step, setStep] = useState<"select" | "organ">("select");

  if (step === "select" || !selectedModel) {
    return (
      <KeyboardModelSelector
        onSelected={() => setStep("organ")}
      />
    );
  }
  return (
    <VisualOrganInterface
      onBack={() => {
        setSelectedModel(null);
        setStep("select");
      }}
    />
  );
}
