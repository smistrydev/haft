import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultParams, PRESETS } from "./presets.ts";
import {
  inspectMountHole,
  printStats,
  innerRadius,
  socketDepth,
} from "./geometry.ts";

test("paddle brush has a round hole at the bottom", () => {
  const info = inspectMountHole(defaultParams);
  assert.ok(info.sampleCount >= 24, `too few bore samples: ${info.sampleCount}`);
  assert.ok(info.maxDev < 0.15, `bore not round, maxDev=${info.maxDev.toFixed(3)}`);
  assert.ok(
    Math.abs(info.meanR - info.expectedR) < 0.2,
    `bore radius ${info.meanR.toFixed(3)} != ${info.expectedR.toFixed(3)}`,
  );
  assert.equal(info.holeAtBottom, true, `hole face y=${info.faceY} bboxMin=${info.bboxMinY}`);
  assert.equal(innerRadius(defaultParams), 12.2 / 2 + 0.3);
  assert.equal(socketDepth(defaultParams), 24);
});

test("every preset keeps a circular mounting hole at the bottom", () => {
  for (const preset of PRESETS) {
    const p = preset.params;
    if (p.attachment !== "socket") continue;
    const info = inspectMountHole(p);
    assert.ok(
      info.sampleCount >= 16,
      `${preset.id} too few bore samples: ${info.sampleCount}`,
    );
    assert.ok(
      info.maxDev < 0.2,
      `${preset.id} bore not round, maxDev=${info.maxDev.toFixed(3)}`,
    );
    assert.equal(info.holeAtBottom, true, `${preset.id} hole not at bottom`);
  }
});

test("oval kitchen grip still gets a circular bore", () => {
  const kitchen = PRESETS.find((p) => p.id === "kitchen")!.params;
  const info = inspectMountHole(kitchen);
  assert.ok(info.maxDev < 0.15, `kitchen bore oval? maxDev=${info.maxDev}`);
});

test("print volume is a plausible solid handle", () => {
  const stats = printStats(defaultParams);
  assert.ok(stats.volumeCm3 > 8 && stats.volumeCm3 < 80, `volume ${stats.volumeCm3}`);
});
