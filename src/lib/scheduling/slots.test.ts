import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeSlots, isSlotAvailable, type ScheduleInput } from "./slots";
import { hhmmToMinutes, isLocalDate, localDateOf, zonedToUtc } from "./time";

const base = (over: Partial<ScheduleInput> = {}): ScheduleInput => ({
  timeZone: "Africa/Accra",
  // Monday 09:00–12:00 and 13:00–17:00
  rules: [
    { weekday: 1, startMinute: 540, endMinute: 720 },
    { weekday: 1, startMinute: 780, endMinute: 1020 },
  ],
  overrides: [],
  busy: [],
  durationMinutes: 50,
  bufferMinutes: 10,
  minNoticeHours: 0,
  maxAdvanceDays: 60,
  now: new Date("2026-11-01T00:00:00Z"), // a Sunday
  ...over,
});
const iso = (d: Date[]) => d.map((x) => x.toISOString().slice(11, 16));

describe("computeSlots", () => {
  it("lays out slots from the weekly hours, stepping by duration + buffer", () => {
    assert.deepEqual(iso(computeSlots(base(), "2026-11-02", "2026-11-02")), ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"]);
  });

  it("offers nothing on days without weekly hours", () => {
    assert.equal(computeSlots(base(), "2026-11-03", "2026-11-03").length, 0);
  });

  it("removes slots that overlap a booking, including the buffer around it", () => {
    const busy = [{ start: new Date("2026-11-02T10:20:00Z"), end: new Date("2026-11-02T11:10:00Z") }];
    // 10:00 overlaps; 11:00 overlaps; 09:00 ends 09:50, buffer pushes busy start to 10:10 → fine
    assert.deepEqual(iso(computeSlots(base({ busy }), "2026-11-02", "2026-11-02")), ["09:00", "13:00", "14:00", "15:00", "16:00"]);
  });

  it("respects a blocked date range (leave)", () => {
    const overrides = [{ kind: "blocked" as const, startDate: "2026-11-02", endDate: "2026-11-06" }];
    assert.equal(computeSlots(base({ overrides }), "2026-11-02", "2026-11-02").length, 0);
    assert.ok(computeSlots(base({ overrides }), "2026-11-09", "2026-11-09").length > 0);
  });

  it("lets date-specific hours replace weekly hours, including on a normally closed day", () => {
    const overrides = [
      { kind: "custom_hours" as const, startDate: "2026-11-02", endDate: "2026-11-02", startMinute: 900, endMinute: 1020 },
      { kind: "custom_hours" as const, startDate: "2026-11-07", endDate: "2026-11-07", startMinute: 600, endMinute: 720 },
    ];
    assert.deepEqual(iso(computeSlots(base({ overrides }), "2026-11-02", "2026-11-02")), ["15:00", "16:00"]);
    assert.deepEqual(iso(computeSlots(base({ overrides }), "2026-11-07", "2026-11-07")), ["10:00", "11:00"]);
  });

  it("enforces minimum notice and the booking horizon", () => {
    const now = new Date("2026-11-02T08:30:00Z");
    assert.deepEqual(iso(computeSlots(base({ now, minNoticeHours: 2 }), "2026-11-02", "2026-11-02")), ["11:00", "13:00", "14:00", "15:00", "16:00"]);
    assert.equal(computeSlots(base({ now, maxAdvanceDays: 7 }), "2026-11-16", "2026-11-16").length, 0);
  });

  it("never offers a slot that would run past the end of a period", () => {
    const rules = [{ weekday: 1, startMinute: 540, endMinute: 620 }];
    assert.deepEqual(iso(computeSlots(base({ rules, durationMinutes: 60, bufferMinutes: 0 }), "2026-11-02", "2026-11-02")), ["09:00"]);
  });

  it("converts the psychologist's wall-clock hours across time zones and DST", () => {
    const rules = [{ weekday: 1, startMinute: 540, endMinute: 600 }];
    // London is UTC+1 in summer, UTC+0 in winter
    const summer = computeSlots(base({ timeZone: "Europe/London", rules, now: new Date("2026-06-01T00:00:00Z") }), "2026-06-08", "2026-06-08");
    const winter = computeSlots(base({ timeZone: "Europe/London", rules }), "2026-11-02", "2026-11-02");
    assert.equal(summer[0].toISOString(), "2026-06-08T08:00:00.000Z");
    assert.equal(winter[0].toISOString(), "2026-11-02T09:00:00.000Z");
  });

  it("isSlotAvailable accepts only exact offered starts", () => {
    assert.equal(isSlotAvailable(base(), new Date("2026-11-02T09:00:00Z")), true);
    assert.equal(isSlotAvailable(base(), new Date("2026-11-02T09:05:00Z")), false);
    assert.equal(isSlotAvailable(base(), new Date("2026-11-02T12:00:00Z")), false);
    const busy = [{ start: new Date("2026-11-02T09:00:00Z"), end: new Date("2026-11-02T09:50:00Z") }];
    assert.equal(isSlotAvailable(base({ busy }), new Date("2026-11-02T09:00:00Z")), false);
  });
});

describe("time helpers", () => {
  it("round-trips zoned times", () => {
    const t = zonedToUtc("2026-03-29", 150, "Europe/London"); // 02:30 doesn't exist (spring forward)
    assert.equal(localDateOf(t, "Europe/London"), "2026-03-29");
    assert.equal(zonedToUtc("2026-11-02", 0, "Asia/Kolkata").toISOString(), "2026-11-01T18:30:00.000Z");
  });
  it("validates inputs", () => {
    assert.equal(isLocalDate("2026-02-30"), false);
    assert.equal(isLocalDate("2026-02-28"), true);
    assert.equal(hhmmToMinutes("24:00"), 1440);
    assert.equal(hhmmToMinutes("9:75"), null);
  });
});
