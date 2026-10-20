import { describe, expect, it } from "vitest";
import { codeStatus, normalizeCode } from "@/lib/codes";

const now = new Date("2026-10-21T12:00:00Z");
const base = { redeemed_by: null, revoked: false, redeem_before: null, fixed_until: null };

describe("activation codes", () => {
  it("a used code is burned even if it was also revoked or expired", () => {
    expect(codeStatus({ ...base, redeemed_by: "u1", revoked: true, redeem_before: "2026-01-01T00:00:00Z" }, now)).toBe("burned");
  });
  it("an unused code past its admin-set redeem date is expired", () => {
    expect(codeStatus({ ...base, redeem_before: "2026-10-20T23:59:59Z" }, now)).toBe("expired");
  });
  it("an unused code whose fixed end date passed is expired", () => {
    expect(codeStatus({ ...base, fixed_until: "2026-10-21T00:00:00Z" }, now)).toBe("expired");
  });
  it("an unused, valid code is ready", () => {
    expect(codeStatus({ ...base, redeem_before: "2026-12-31T00:00:00Z" }, now)).toBe("ready");
  });
  it("codes match regardless of dashes, spaces or case", () => {
    expect(normalizeCode(" rfq-abcd 2345-wxyz ")).toBe("RFQABCD2345WXYZ");
  });
});
