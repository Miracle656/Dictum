import { Corners } from "./Corners";
import { HeroDictum } from "./HeroDictum";

const REPO = "https://github.com/Miracle656/Dictum";

type Row = { name: string; quote: string; fee: string; gas: string; time: string; allin: string; tag?: string; chosen?: boolean; excluded?: boolean };

// Illustrative quotes for one $25,000 payment. Rail names are generic: these are not live integrations.
const ROUTES: Row[] = [
  { name: "Uniswap v3 → exchange off-ramp", quote: "1,552.40", fee: "0.35%", gas: "₦2,140", time: "4 min", allin: "1,559.60", tag: "Chosen", chosen: true },
  { name: "Stablecoin payout rail", quote: "1,556.00", fee: "0.40%", gas: "—", time: "20 min", allin: "1,562.31" },
  { name: "Cross-border fintech", quote: "1,558.50", fee: "0.30%", gas: "—", time: "2 h", allin: "1,563.60" },
  { name: "Card-network remittance", quote: "1,549.00", fee: "0.90%", gas: "—", time: "1 day", allin: "1,566.85" },
  { name: "Bank wire", quote: "1,575.00", fee: "1.50%", gas: "—", time: "2 days", allin: "1,599.10" },
  { name: "P2P desk", quote: "1,547.00", fee: "—", gas: "—", time: "—", allin: "Excluded", tag: "Stale quote", excluded: true },
];

const STEPS = [
  { n: "01", contract: "PaymentIntent", title: "Fund the intent", body: "The business funds an escrow for the payment. If the agent misses its deadline, the escrow refunds itself." },
  { n: "02", contract: "Scorer", title: "Quote every route", body: "Venue adapters pull live quotes from Uniswap v3 on Arbitrum and off-ramp desks. The scorer ranks them on all-in cost." },
  { n: "03", contract: "DictumRegistry", title: "Write the dictum", body: "Before any trade: payment id, quote-set hash, chosen venue, promised rate and deadline, stored onchain.", dark: true },
  { n: "04", contract: "Outcome", title: "Execute and record", body: "The swap runs, the outcome is written beside the promise and the escrow releases to the supplier." },
];

const PROOFS = [
  {
    kind: "Dictum · promise", when: "Block 284,113,902", color: "#9dccee", big: "₦1,561.20",
    rows: [["tx", "0x7a3f9e…b04c21e"], ["paymentId", "0142"], ["quoteSetHash", "0x5d1c…e8a0"], ["venue", "UNIV3_OFFRAMP"], ["deadline", "14:32:10 WAT"]],
  },
  {
    kind: "Outcome · result", when: "Block 284,114,377", color: "#12f3ff", big: "₦1,559.84",
    rows: [["tx", "0x91b02d…7f144de"], ["paymentId", "0142"], ["delivered", "$25,000.00"], ["vsPromise", "−₦1.36 / $ (kept)"], ["bondClaim", "none"]],
  },
];

const GUARDS = [
  ["01", "Max slippage vs dictum", "0.25%"],
  ["02", "Per-payment cap", "$50,000"],
  ["03", "Venue allowlist", "6 venues"],
  ["04", "Bond staked", "25,000 USDC"],
  ["05", "Kill switch", "Armed"],
];

const divLight = "1px solid rgba(4,22,60,.16)";
const divDark = "1px solid rgba(242,242,242,.18)";

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="kicker">{children}</div>
      <div className="rule" />
    </>
  );
}

export default function Landing() {
  return (
    <main style={{ overflowX: "hidden" }}>
      {/* 01 Hero */}
      <section className="dark">
        <div className="layer" style={{ background: "repeating-conic-gradient(from 212deg at 108% 118%,#04163c 0deg 2.2deg,#016eee 2.2deg 3.1deg,#04163c 3.1deg 4.6deg,#0059c5 4.6deg 5.2deg)", opacity: 0.9 }} />
        <div className="layer" style={{ background: "linear-gradient(100deg,#04163c 34%,rgba(4,22,60,.55) 62%,rgba(4,22,60,0) 100%)" }} />
        <div className="layer grid-lines" />

        <nav className="wrap" style={{ position: "relative", display: "flex", alignItems: "center", gap: 24, paddingTop: 20, paddingBottom: 20, flexWrap: "wrap" }}>
          <a href="#" style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none", color: "#f2f2f2", marginRight: "auto" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 28, letterSpacing: ".04em", lineHeight: 1 }}>DICTUM</span>
            <span style={{ width: 1, height: 26, background: "rgba(242,242,242,.3)" }} />
            <img src="/arb-logo-white.png" alt="Arbitrum" style={{ height: 44, margin: "-8px -16px" }} />
          </a>
          <div style={{ display: "flex", gap: 28, fontSize: 14, fontWeight: 500, flexWrap: "wrap" }}>
            <a href="#hunt" className="navlink">Routes</a>
            <a href="#how" className="navlink">How it works</a>
            <a href="#bond" className="navlink">Bond</a>
            <a href="#chains" className="navlink">Chains</a>
          </div>
          <a href={REPO} className="btn btn-cyan btn-md blueprint">View the code<Corners /></a>
        </nav>

        <div className="wrap" style={{ position: "relative", paddingTop: "clamp(40px,8vw,112px)", paddingBottom: "clamp(56px,8vw,120px)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,480px),1fr))", gap: "clamp(40px,6vw,88px)", alignItems: "center" }}>
          <div>
            <h1 style={{ fontWeight: 800, textTransform: "uppercase", fontSize: "clamp(60px,9.4vw,148px)", lineHeight: 0.86, letterSpacing: "-.01em", margin: "0 0 0 -.04em" }}>
              <span style={{ display: "block" }}>Say the rate.</span>
              <span style={{ display: "block", color: "#12f3ff" }}>Then hit it.</span>
            </h1>
            <p style={{ fontSize: "clamp(17px,1.4vw,20px)", lineHeight: 1.5, maxWidth: "40ch", margin: "32px 0 0", color: "#dbe4f3" }}>
              Dictum routes naira-to-dollar supplier payments across every rail, writes the rate it will achieve onchain before it trades, and stakes a bond on keeping its word.
            </p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 36 }}>
              <a href={REPO} className="btn btn-cyan btn-lg blueprint">Follow the build<Corners /></a>
              <a href="#how" className="btn btn-ghost-light btn-lg">See how a dictum works</a>
            </div>
          </div>
          <HeroDictum />
        </div>
      </section>

      {/* 02 Routes */}
      <section id="hunt" className="wrap section">
        <Kicker>01 · The routes</Kicker>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: "24px 64px", alignItems: "end", marginBottom: 48 }}>
          <h2 className="h2">Six rails.<br />One cheapest route.</h2>
          <p className="lede" style={{ maxWidth: "52ch" }}>
            A Lagos importer paying a supplier abroad hunts for a rate across banks, bureaux de change and P2P desks while the rate moves. Each rail moves money down one fixed corridor. Dictum sits above them: it quotes every route, picks the cheapest, and executes it.
          </p>
        </div>

        <div className="blueprint" style={{ overflowX: "auto" }}>
          <Corners />
          <div className="cap" style={{ display: "flex", flexWrap: "wrap", borderBottom: divLight, minWidth: 760 }}>
            <span style={{ flex: 1, padding: "12px 20px" }}>Quote set · $25,000.00 USD to CNY supplier</span>
            <span style={{ padding: "12px 20px", borderLeft: divLight, color: "#024290" }}>Scored 14:28:02 WAT</span>
          </div>
          <table className="table" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th style={{ padding: "12px 20px" }}>Route</th><th>Quoted ₦/$</th><th>Fees</th><th>Gas + bridge</th><th>Settles</th>
                <th style={{ textAlign: "right", paddingRight: 20 }}>All-in ₦/$</th>
              </tr>
            </thead>
            <tbody>
              {ROUTES.map((r) => (
                <tr key={r.name} style={{ background: r.chosen ? "#04163c" : "transparent", color: r.chosen ? "#f2f2f2" : r.excluded ? "#6b7896" : "#04163c" }}>
                  <td style={{ padding: "16px 20px", fontWeight: 600 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      {r.name}
                      {r.tag && (
                        <span className="tag" style={{ background: r.chosen ? "#12f3ff" : "#e3eefd", color: r.chosen ? "#04163c" : "#03306b" }}>{r.tag}</span>
                      )}
                    </span>
                  </td>
                  <td className="tnum">{r.quote}</td>
                  <td className="tnum">{r.fee}</td>
                  <td className="tnum">{r.gas}</td>
                  <td>{r.time}</td>
                  <td className="tnum" style={{ textAlign: "right", paddingRight: 20, fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 22 }}>{r.allin}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ margin: 0, padding: "14px 20px", borderTop: divLight, fontSize: 13, color: "#3d4b6a", minWidth: 760 }}>
            Illustrative quotes. Ranking is deterministic, unit-tested TypeScript over rate, fees, gas, bridge cost and a time penalty. The language model explains the choice; it never does the arithmetic.
          </p>
        </div>
      </section>

      {/* 03 How it works */}
      <section id="how" className="wrap section-tail">
        <Kicker>02 · One payment, one dictum</Kicker>
        <h2 className="h2" style={{ margin: "0 0 56px", maxWidth: "16ch" }}>The promise goes onchain first.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 40 }}>
          {STEPS.map((s) => {
            const ink = s.dark ? "#f2f2f2" : "#04163c";
            return (
              <div key={s.n} className="blueprint" style={{ padding: "28px 24px 30px", display: "flex", flexDirection: "column", gap: 16, background: s.dark ? "#04163c" : "transparent", color: ink, ["--color-text" as string]: ink }}>
                <Corners />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 56, lineHeight: 1, color: s.dark ? "#12f3ff" : "#016eee" }}>{s.n}</span>
                  <span className="mono" style={{ fontSize: 12, opacity: 0.75 }}>{s.contract}</span>
                </div>
                <h3 style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 26, lineHeight: 1.05, margin: "8px 0 0" }}>{s.title}</h3>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, opacity: 0.85 }}>{s.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 04 Promise and proof */}
      <section className="dark">
        <div className="layer grid-lines" style={{ opacity: 0.85 }} />
        <div className="wrap section" style={{ position: "relative" }}>
          <Kicker>03 · Promise and proof</Kicker>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: "24px 64px", alignItems: "end", marginBottom: 56 }}>
            <h2 className="h2">Two transactions. Read them side by side.</h2>
            <p className="lede" style={{ maxWidth: "50ch" }}>
              Every payment writes a dictum before execution and an outcome record after. Open both on Arbiscan and compare the rate the agent promised with the rate it delivered.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: 40 }}>
            {PROOFS.map((p) => (
              <div key={p.kind} className="blueprint mono" style={{ fontSize: 13, background: "rgba(242,242,242,.03)" }}>
                <Corners />
                <div className="cap" style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "14px 20px", borderBottom: divDark, fontFamily: "var(--font-body)" }}>
                  <span style={{ color: p.color }}>{p.kind}</span>
                  <span style={{ color: "#9dccee" }}>{p.when}</span>
                </div>
                <div style={{ padding: "18px 20px", display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px 20px" }}>
                  {p.rows.map(([k, v]) => (
                    <div key={k} style={{ display: "contents" }}>
                      <span style={{ color: "#9dccee" }}>{k}</span>
                      <span style={{ textAlign: "right", overflowWrap: "anywhere" }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "18px 20px", borderTop: divDark, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 48, lineHeight: 1, color: p.color }}>{p.big}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#9dccee" }}>Example record · Arbiscan link after the testnet run</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 05 Bond */}
      <section id="bond" className="wrap section">
        <Kicker>04 · The bond</Kicker>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: "56px 80px" }}>
          <div>
            <h2 className="h2">An agent with something to lose.</h2>
            <p className="lede" style={{ margin: "28px 0 0", maxWidth: "46ch" }}>
              The agent stakes USDC in AgentBond before it can route. If the executed rate misses the dictum, the business claims the shortfall from the bond. Repeated misses get the agent slashed.
            </p>
            <p className="lede" style={{ margin: "16px 0 0", maxWidth: "46ch" }}>
              Its ERC-8004 identity carries a public reputation, updated after every outcome.
            </p>
          </div>
          <div className="blueprint">
            <Corners />
            <div className="cap" style={{ display: "flex", flexWrap: "wrap", borderBottom: divLight }}>
              <span style={{ flex: 1, padding: "12px 20px" }}>Policy guards</span>
              <span style={{ padding: "12px 20px", borderLeft: divLight, color: "#024290" }}>Enforced before execution</span>
            </div>
            {GUARDS.map(([n, k, v]) => (
              <div key={n} style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 16, alignItems: "baseline", padding: "16px 20px", borderBottom: "1px solid rgba(4,22,60,.08)" }}>
                <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".08em", color: "#024290" }}>{n}</span>
                <span style={{ fontSize: 15 }}>{k}</span>
                <span className="tnum" style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 22 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 06 Chains */}
      <section id="chains" className="wrap section-tail">
        <Kicker>05 · Two chains</Kicker>
        <h2 className="h2" style={{ margin: "0 0 56px", maxWidth: "18ch" }}>Dollars wait on one. The record lives on the other.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 40, alignItems: "stretch" }}>
          <div className="blueprint" style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
            <Corners />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="cap" style={{ color: "#024290" }}>Treasury</span>
              <span className="mono" style={{ fontSize: 12, color: "#3d4b6a" }}>chain 4663</span>
            </div>
            <h3 style={{ fontWeight: 800, textTransform: "uppercase", fontSize: 34, lineHeight: 1, margin: 0 }}>Robinhood Chain</h3>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "#2b3a5c" }}>
              The business holds USDG in TreasuryVault between payments. Idle balance parks in a lending market until the agent pulls it back to fund the next payment.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 14, padding: "12px 0" }}>
            <Arrow label="USDG →" />
            <div className="blueprint" style={{ padding: "14px 22px", textAlign: "center" }}>
              <Corners />
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 26, textTransform: "uppercase" }}>Bridge adapter</div>
              <div style={{ fontSize: 13, color: "#3d4b6a" }}>Across first · CCIP and Relay behind one interface</div>
            </div>
            <Arrow label="← Refunds" />
          </div>
          <div className="blueprint" style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: 18, background: "#04163c", color: "#f2f2f2", ["--color-text" as string]: "#f2f2f2" }}>
            <Corners />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="cap" style={{ color: "#12f3ff" }}>Settlement record</span>
              <span className="mono" style={{ fontSize: 12, color: "#9dccee" }}>chain 42161</span>
            </div>
            <img src="/arb-logo-white.png" alt="Arbitrum One" style={{ height: 74, width: "auto", alignSelf: "flex-start", margin: "-16px -30px -14px" }} />
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "#c9d5ea" }}>
              PaymentIntent escrow, DictumRegistry, AgentBond and the agent&apos;s identity. Every promise and every result is written here.
            </p>
          </div>
        </div>
      </section>

      {/* 07 Close */}
      <section className="dark">
        <div className="layer" style={{ background: "repeating-conic-gradient(from 330deg at -8% 130%,#04163c 0deg 2.4deg,#016eee 2.4deg 3.2deg,#04163c 3.2deg 5deg,#12aaff 5deg 5.4deg)", opacity: 0.75 }} />
        <div className="layer" style={{ background: "linear-gradient(260deg,#04163c 30%,rgba(4,22,60,.2) 100%)" }} />
        <div className="wrap" style={{ position: "relative", paddingTop: "clamp(80px,10vw,144px)", paddingBottom: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", textAlign: "right", gap: 32 }}>
            <h2 style={{ fontWeight: 800, textTransform: "uppercase", fontSize: "clamp(48px,7vw,112px)", lineHeight: 0.88, margin: 0, maxWidth: "12ch" }}>
              Pay your next supplier on a promise you can audit.
            </h2>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <a href={REPO} className="btn btn-cyan btn-lg blueprint">View the code<Corners /></a>
              <a href={`${REPO}#readme`} className="btn btn-ghost-light btn-lg">Read the build plan</a>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px 40px", alignItems: "center", justifyContent: "space-between", marginTop: "clamp(80px,10vw,140px)", paddingTop: 24, borderTop: "1px solid rgba(242,242,242,.2)", fontSize: 13, color: "#9dccee" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 14, color: "#f2f2f2" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 22, letterSpacing: ".04em" }}>DICTUM</span>
              <span style={{ width: 1, height: 22, background: "rgba(242,242,242,.3)" }} />
              <img src="/arb-logo-white.png" alt="Arbitrum" style={{ height: 38, margin: "-8px -14px" }} />
            </span>
            <span>Built for Arbitrum Open House Singapore · Testnet build</span>
            <span style={{ display: "flex", gap: 24 }}>
              <a href={REPO} className="footlink">GitHub</a>
              <a href={`${REPO}/tree/main/docs`} className="footlink">Docs</a>
              <a href="https://sepolia.arbiscan.io" className="footlink">Arbiscan</a>
            </span>
          </div>
        </div>
        <div style={{ position: "relative", fontFamily: "var(--font-heading)", fontWeight: 800, fontStyle: "italic", textTransform: "uppercase", fontSize: "clamp(64px,15.5vw,236px)", lineHeight: 0.8, letterSpacing: "-.02em", whiteSpace: "nowrap", margin: "24px 0 -0.1em -0.04em", color: "#f2f2f2" }}>
          All on Arbitrum
        </div>
      </section>
    </main>
  );
}

function Arrow({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%", gap: 10 }}>
      <span style={{ flex: 1, height: 1, background: "#04163c" }} />
      <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15, letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: "#04163c" }} />
    </div>
  );
}
