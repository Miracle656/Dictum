"use client";

import { useEffect, useState } from "react";
import { Corners } from "./Corners";

const PHASES = [
  { statusLabel: "Written", statusColor: "#9dccee", executed: "—", outcomeNote: "Awaiting execution", outcomeBg: "transparent", outcomeInk: "#5f7aa6", outcomeInk2: "#9dccee", progress: "0%", progressDur: "0s" },
  { statusLabel: "Executing", statusColor: "#12aaff", executed: "· · ·", outcomeNote: "Swap in flight", outcomeBg: "transparent", outcomeInk: "#9dccee", outcomeInk2: "#9dccee", progress: "100%", progressDur: "2.4s" },
  { statusLabel: "Kept", statusColor: "#12f3ff", executed: "1,559.84", outcomeNote: "₦1.36 per $ under promise", outcomeBg: "#12f3ff", outcomeInk: "#04163c", outcomeInk2: "#04163c", progress: "100%", progressDur: "0s" },
] as const;
const PHASE_MS = [2600, 2400, 4200];
const COUNTDOWN_FROM = 252;

const line = "1px solid rgba(242,242,242,.18)";

/** The animated hero card: a dictum moving from written, to executing, to kept. */
export function HeroDictum() {
  const [phase, setPhase] = useState(0);
  const [secs, setSecs] = useState(COUNTDOWN_FROM);

  useEffect(() => {
    const t = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : COUNTDOWN_FROM)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setPhase((p) => (p + 1) % 3), PHASE_MS[phase]);
    return () => clearTimeout(t);
  }, [phase]);

  const P = PHASES[phase]!;
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <div className="blueprint" style={{ background: "rgba(4,22,60,.72)", backdropFilter: "blur(6px)", borderColor: "rgba(242,242,242,.22)" }}>
      <Corners />
      <div className="cap" style={{ display: "flex", flexWrap: "wrap", borderBottom: line }}>
        <span style={{ flex: 1, minWidth: "14ch", padding: "12px 18px" }}>Dictum Nº 0142 · example</span>
        <span style={{ padding: "12px 18px", borderLeft: line, color: "#9dccee" }}>Arbitrum One</span>
        <span style={{ padding: "12px 18px", borderLeft: line, display: "flex", alignItems: "center", gap: 8 }} aria-live="polite">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: P.statusColor, transition: "background .4s" }} />
          {P.statusLabel}
        </span>
      </div>
      <div style={{ padding: "22px 18px 8px", display: "grid", gridTemplateColumns: "auto 1fr", gap: "14px 24px", fontSize: 14, alignItems: "baseline" }}>
        <span style={{ color: "#9dccee" }}>Pay</span>
        <span style={{ textAlign: "right" }}>
          <strong style={{ fontWeight: 600 }}>$25,000.00</strong> to a supplier in Shenzhen
        </span>
        <span style={{ color: "#9dccee" }}>Route</span>
        <span style={{ textAlign: "right" }}>Uniswap v3 → exchange off-ramp</span>
        <span style={{ color: "#9dccee" }}>Quote set</span>
        <span className="mono" style={{ textAlign: "right", fontSize: 12.5 }}>0x7a3f…c21e · 6 venues</span>
        <span style={{ color: "#9dccee" }}>Deadline</span>
        <span className="mono" style={{ textAlign: "right", fontSize: 12.5 }}>T − 00:{mm}:{ss}</span>
        <span style={{ color: "#9dccee" }}>Bond at stake</span>
        <span style={{ textAlign: "right" }}>2,500 USDC</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginTop: 14, borderTop: line }}>
        <div style={{ padding: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "#9dccee", fontWeight: 600 }}>Promised · ₦ per $</div>
          <div className="tnum" style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "clamp(40px,4vw,56px)", lineHeight: 1, marginTop: 10 }}>1,561.20</div>
          <div style={{ fontSize: 12, color: "#9dccee", marginTop: 8 }}>Written before execution</div>
        </div>
        <div style={{ padding: 18, borderLeft: line, background: P.outcomeBg, transition: "background .6s" }}>
          <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: P.outcomeInk2, fontWeight: 600, transition: "color .6s" }}>Executed · ₦ per $</div>
          <div className="tnum" style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "clamp(40px,4vw,56px)", lineHeight: 1, marginTop: 10, color: P.outcomeInk, transition: "color .6s" }}>
            {P.executed}
          </div>
          <div style={{ fontSize: 12, marginTop: 8, color: P.outcomeInk2, transition: "color .6s" }}>{P.outcomeNote}</div>
        </div>
      </div>
      <div style={{ height: 3, background: "rgba(242,242,242,.12)" }}>
        <div style={{ height: "100%", width: P.progress, background: "#12f3ff", transition: `width ${P.progressDur} linear` }} />
      </div>
    </div>
  );
}
