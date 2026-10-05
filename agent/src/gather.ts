import type { Quote, Rejection, RouteRequest, VenueAdapter } from "@dictum/shared";

export interface GatherResult {
  quotes: Quote[];
  failures: Rejection[];
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

/** Ask every supporting venue in parallel. A slow or failing venue never blocks the others. */
export async function gatherQuotes(
  req: RouteRequest,
  adapters: readonly VenueAdapter[],
  timeoutMs: number,
): Promise<GatherResult> {
  const live = adapters.filter((a) => a.supports(req.sell, req.buy));
  const settled = await Promise.allSettled(live.map((a) => withTimeout(a.quote(req), timeoutMs)));
  const quotes: Quote[] = [];
  const failures: Rejection[] = [];
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") quotes.push(s.value);
    else failures.push({ venueId: live[i]!.id, reason: "venue-error", detail: String(s.reason?.message ?? s.reason) });
  });
  return { quotes, failures };
}
