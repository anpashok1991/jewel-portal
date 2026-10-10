import { describe, expect, it } from "vitest";
import { ORDER_STATUSES, ORDER_TRANSITIONS, CUSTOMER_CANCELLABLE, PURITY_FINENESS, FEATURE_LIST } from "@/lib/constants";
import { canTransition, assertTransition, customerCanCancel, statusLabel } from "@/lib/order-state";

describe("order transitions", () => {
  it("allows the happy path", () => {
    expect(canTransition("PLACED", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "PACKED")).toBe(true);
    expect(canTransition("PACKED", "SHIPPED")).toBe(true);
    expect(canTransition("SHIPPED", "DELIVERED")).toBe(true);
    expect(canTransition("DELIVERED", "RETURN_REQUESTED")).toBe(true);
    expect(canTransition("RETURN_REQUESTED", "RETURNED")).toBe(true);
    expect(canTransition("RETURNED", "REFUNDED")).toBe(true);
  });

  it("forbids skipping and backtracking", () => {
    expect(canTransition("PLACED", "SHIPPED")).toBe(false);
    expect(canTransition("SHIPPED", "CANCELLED")).toBe(false);
    expect(canTransition("DELIVERED", "CANCELLED")).toBe(false);
    expect(canTransition("CONFIRMED", "PLACED")).toBe(false);
    expect(canTransition("REFUNDED", "PLACED")).toBe(false);
  });

  it("assertTransition throws on illegal moves", () => {
    expect(() => assertTransition("PLACED", "CONFIRMED")).not.toThrow();
    expect(() => assertTransition("PLACED", "DELIVERED")).toThrow(/Illegal order transition/);
  });

  it("every transition targets a known status and every status has an entry", () => {
    for (const from of ORDER_STATUSES) {
      expect(ORDER_TRANSITIONS[from]).toBeDefined();
      for (const to of ORDER_TRANSITIONS[from]) {
        expect(ORDER_STATUSES).toContain(to);
      }
    }
  });

  it("terminal state REFUNDED has no exits", () => {
    expect(ORDER_TRANSITIONS.REFUNDED).toHaveLength(0);
  });

  it("customer can cancel only while early", () => {
    expect(customerCanCancel("PLACED")).toBe(true);
    expect(customerCanCancel("CONFIRMED")).toBe(true);
    expect(customerCanCancel("PACKED")).toBe(false);
    expect(CUSTOMER_CANCELLABLE.every((s) => ORDER_STATUSES.includes(s))).toBe(true);
  });
});

describe("statusLabel", () => {
  it("humanizes status codes", () => {
    expect(statusLabel("RETURN_REQUESTED")).toBe("Return Requested");
    expect(statusLabel("PLACED")).toBe("Placed");
  });
});

describe("constants sanity", () => {
  it("purity fineness covers karats and bullion purities", () => {
    expect(PURITY_FINENESS["24K"]).toBe(999);
    expect(PURITY_FINENESS["22K"]).toBe(916);
    expect(PURITY_FINENESS["925"]).toBe(925);
  });

  it("feature list keys are unique", () => {
    const keys = FEATURE_LIST.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
