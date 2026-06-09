import { describe, it, expect } from "vitest";
import { reconcileElements } from "./reconcile";

const el = (id: string, version: number, extra: Record<string, unknown> = {}) =>
  ({ id, version, ...extra }) as { id: string; version: number };

describe("reconcileElements", () => {
  it("adds an incoming element that is not in local", () => {
    const local = [el("a", 1)];
    const incoming = [el("b", 1)];

    const result = reconcileElements(local, incoming);

    expect(result).toEqual([el("a", 1), el("b", 1)]);
  });

  it("replaces local with incoming when incoming has higher version", () => {
    const local = [el("a", 1, { color: "red" })];
    const incoming = [el("a", 2, { color: "blue" })];

    const result = reconcileElements(local, incoming);

    expect(result).toEqual([el("a", 2, { color: "blue" })]);
  });

  it("keeps local element identity when versions are equal (no flicker)", () => {
    const localEl = el("a", 5, { stroke: "local" });
    const incomingEl = el("a", 5, { stroke: "incoming" });

    const result = reconcileElements([localEl], [incomingEl]);

    expect(result[0]).toBe(localEl);
  });

  it("keeps a local-only element that is absent in incoming", () => {
    const local = [el("a", 1), el("b", 1)];
    const incoming = [el("a", 1)];

    const result = reconcileElements(local, incoming);

    expect(result.find((e) => e.id === "b")).toEqual(el("b", 1));
  });

  it("respects deletion when an incoming tombstone has higher version", () => {
    const local = [el("a", 1)];
    const incoming = [el("a", 2, { isDeleted: true })];

    const result = reconcileElements(local, incoming);

    expect(result).toEqual([el("a", 2, { isDeleted: true })]);
  });
});
