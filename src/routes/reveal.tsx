import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, m } from "framer-motion";
import { Gift } from "lucide-react";
import { useState } from "react";

import { Button } from "../components/ui/button";
import { EASE_OUT } from "../lib/motion";
import { decodeReveal } from "../lib/reveal-link";
import { pageHead } from "../lib/seo";

export const Route = createFileRoute("/reveal")({
  component: RevealPage,
  validateSearch: (search: Record<string, unknown>): { d?: string } => ({
    d: typeof search.d === "string" ? search.d : undefined,
  }),
  head: () => pageHead({ noindex: true, title: "Your Secret Santa match" }),
});

/** One person's match, from a printed card's QR code or a texted link. */
function RevealPage() {
  const { d } = Route.useSearch();
  const card = decodeReveal(d);
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="bg-background flex min-h-dvh items-center justify-center px-4 py-12">
      <main className="mx-auto w-full max-w-md space-y-8 text-center">
        <img
          src="/gift.svg"
          alt=""
          draggable={false}
          className="animate-pop-in mx-auto size-20 select-none sm:size-24"
        />
        {card ? (
          <>
            <div className="animate-reveal reveal-order-1 space-y-3">
              <p className="text-primary font-serif text-2xl italic">
                {card.partyName ?? "Secret Santa"}
              </p>
              <h1 className="text-foreground text-4xl leading-tight font-normal tracking-tight break-words sm:text-5xl">
                Hi {card.giver}!
              </h1>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              {revealed ? (
                <m.div
                  key="match"
                  initial={{ filter: "blur(6px)", opacity: 0, scale: 0.96 }}
                  animate={{ filter: "blur(0px)", opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                  className="bg-card space-y-2 rounded-2xl border px-6 py-10 shadow-sm"
                  aria-live="polite"
                >
                  <p className="text-muted-foreground text-lg font-light tracking-wide">
                    You’re buying a gift for
                  </p>
                  <p className="text-primary font-serif text-5xl break-words sm:text-6xl">
                    {card.receiver}
                  </p>
                  {card.budget && (
                    <p className="text-foreground/80 pt-2 text-lg font-light tracking-wide">
                      Budget: {card.budget}
                    </p>
                  )}
                  <p className="text-muted-foreground pt-4 text-sm font-light tracking-wide">
                    Shh, keep it a secret!
                  </p>
                </m.div>
              ) : (
                <m.div
                  key="ask"
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="animate-reveal reveal-order-2 space-y-6"
                >
                  <p className="text-muted-foreground text-lg font-light tracking-wide">
                    Ready to see who you’re buying for? Make sure no one’s
                    peeking.
                  </p>
                  <Button
                    size="cta"
                    onClick={() => {
                      setRevealed(true);
                    }}
                  >
                    <Gift data-icon="inline-start" />
                    Show my match
                  </Button>
                </m.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="animate-reveal reveal-order-1 space-y-3">
            <h1 className="text-foreground text-3xl font-normal tracking-tight">
              This link doesn’t look right
            </h1>
            <p className="text-muted-foreground font-light tracking-wide">
              Scan the card again, or ask your organizer for a new link.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
