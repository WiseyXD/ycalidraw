import { describe, it, expect } from "vitest";
import { backoffDelay } from "./backoff";

describe("backoffDelay", () => {
  it("starts at 1000ms and doubles each attempt up to a 10000ms cap", () => {
    expect(backoffDelay(0)).toBe(1000);
    expect(backoffDelay(1)).toBe(2000);
    expect(backoffDelay(2)).toBe(4000);
    expect(backoffDelay(3)).toBe(8000);
    expect(backoffDelay(4)).toBe(10000);
    expect(backoffDelay(10)).toBe(10000);
  });
});
