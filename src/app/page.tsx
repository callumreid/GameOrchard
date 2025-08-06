import React, { Suspense } from "react";
import { TranscriptProvider } from "@/app/contexts/TranscriptContext";
import { EventProvider } from "@/app/contexts/EventContext";
import { GameSessionProvider } from "@/app/providers/GameSessionProvider";
import Games from "@/app/components/Games";
import DebugApp from "@/app/components/DebugApp";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TranscriptProvider>
        <EventProvider>
          <PageContent />
        </EventProvider>
      </TranscriptProvider>
    </Suspense>
  );
}

function PageContent() {
  // Check for debug mode
  const isDebugMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debug") === "1";

  if (isDebugMode) {
    return <DebugApp />;
  }

  return (
    <GameSessionProvider>
      <Games />
    </GameSessionProvider>
  );
}
