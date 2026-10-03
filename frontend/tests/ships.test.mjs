import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { afterEach, beforeEach, test } from "node:test";

// Node strips TypeScript; resolve the extensionless imports used by Vite.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && context.parentURL) {
      for (const suffix of [".ts", "/index.ts"]) {
        const url = new URL(specifier + suffix, context.parentURL);
        if (existsSync(url)) return nextResolve(url.href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});

const { PlayerController } = await import("../src/control/playerController.ts");
const { RemotePlayerController } = await import("../src/control/remotePlayerController.ts");
const { World } = await import("../src/state/world.ts");
const { WorldRenderer } = await import("../src/rendering/WorldRenderer.ts");
const { shipSprites } = await import("../src/rendering/ships/index.ts");
const { ShipRenderer } = await import("../src/rendering/ShipRenderer.ts");

const localOwner = { toHexString: () => "local" };
const remoteOwner = { toHexString: () => "remote" };
const originalGlobals = new Map();

beforeEach(() => {
  for (const key of ["document", "window", "ResizeObserver", "Image"]) {
    originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  }
  globalThis.document = Object.assign(new EventTarget(), { hidden: false });
  globalThis.window = Object.assign(new EventTarget(), { devicePixelRatio: 2 });
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  globalThis.Image = class {
    static instances = [];
    complete = true;
    naturalWidth = 128;
    constructor() {
      globalThis.Image.instances.push(this);
    }
  };
});

afterEach(() => {
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

function row(shipType, owner = localOwner) {
  return {
    id: 42n, owner, shipType: { tag: shipType },
    x: 20, y: 30, vx: 0, vy: 0,
    buttons: undefined, serverTick: 1n, lastProcessedInputTick: undefined,
  };
}

function connection() {
  const inserts = new Set();
  const updates = new Set();
  const deletes = new Set();
  return {
    identity: localOwner,
    isActive: true,
    db: { ship: {
      onInsert: (fn) => inserts.add(fn),
      onUpdate: (fn) => updates.add(fn),
      onDelete: (fn) => deletes.add(fn),
      removeOnInsert: (fn) => inserts.delete(fn),
      removeOnUpdate: (fn) => updates.delete(fn),
      removeOnDelete: (fn) => deletes.delete(fn),
    } },
    reducers: { submitPlayerInput: async () => {} },
    insert: (ship) => inserts.forEach((fn) => fn({}, ship)),
    update: (oldShip, ship) => updates.forEach((fn) => fn({}, oldShip, ship)),
    delete: (ship) => deletes.forEach((fn) => fn({}, ship)),
  };
}

function canvasContext() {
  const calls = [];
  const ctx = { calls };
  for (const method of [
    "save", "restore", "setTransform", "clearRect", "fillRect", "translate",
    "rotate", "beginPath", "moveTo", "lineTo", "closePath", "fill", "stroke", "drawImage",
  ]) ctx[method] = (...args) => calls.push([method, ...args]);
  return ctx;
}

for (const [label, Controller, owner] of [
  ["local", PlayerController, localOwner],
  ["remote", RemotePlayerController, remoteOwner],
  ["unowned", RemotePlayerController, undefined],
]) {
  test(`${label} ships retain their type on insert and change artwork without replacing their pose`, () => {
    const world = new World();
    const db = connection();
    const controller = new Controller(db, world);
    try {
      const raven = { ...row("Raven"), owner };
      db.insert(raven);
      const entity = world.entities.get("42");
      assert.equal(entity.shipType, "Raven");
      assert.equal(entity.position.x, 20);
      assert.equal(entity.position.y, 30);
      entity.rotation = 0.75;

      // Type-only updates must work even if position and server tick are unchanged.
      const gat = { ...raven, shipType: { tag: "Gat" } };
      db.update(raven, gat);
      assert.equal(world.entities.get("42"), entity);
      assert.equal(world.entities.size, 1);
      assert.equal(entity.shipType, "Gat");
      assert.equal(entity.position.x, 20);
      assert.equal(entity.position.y, 30);
      assert.equal(entity.rotation, 0.75);

      db.delete(gat);
      assert.equal(world.entities.size, 0);
    } finally {
      controller.dispose();
    }
  });
}

test("ownership changes preserve the ship and update its visual in either controller", () => {
  const world = new World();
  const db = connection();
  const local = new PlayerController(db, world);
  const remote = new RemotePlayerController(db, world);
  try {
    const raven = row("Raven");
    db.insert(raven);
    const entity = world.entities.get("42");
    const gat = row("Gat", remoteOwner);
    db.update(raven, gat);
    assert.equal(world.entities.get("42"), entity);
    assert.equal(entity.shipType, "Gat");
    db.update(gat, raven);
    assert.equal(world.entities.get("42"), entity);
    assert.equal(entity.shipType, "Raven");
  } finally {
    local.dispose();
    remote.dispose();
  }
});

test("each registered ship has a distinct transparent PNG", () => {
  const files = Object.values(shipSprites).map((sprite) => readFileSync(new URL(sprite.src)));
  assert.notDeepEqual(files[0], files[1]);
  for (const png of files) {
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), 128);
    assert.equal(png.readUInt32BE(20), 128);
    assert.equal(png[25], 6); // RGBA
  }
});

test("sprites load once and draw centered at display size independent of image resolution", () => {
  const renderer = new ShipRenderer();
  const ctx = canvasContext();
  for (let frame = 0; frame < 2; frame++) {
    for (const type of ["Raven", "Gat"]) renderer.draw(ctx, type);
  }
  assert.equal(Image.instances.length, 2);
  assert.equal(ctx.calls.length, 4);
  for (const [index, call] of ctx.calls.entries()) {
    const sprite = shipSprites[index % 2 === 0 ? "Raven" : "Gat"];
    assert.equal(call[0], "drawImage");
    assert.equal(call[1].src, sprite.src);
    assert.deepEqual(call.slice(2), [-16, -16, 32, 32]);
  }
  assert.equal(ctx.calls[0][1], ctx.calls[2][1]);
});

test("loading and broken sprites are skipped, and loaded sprites appear on the next draw", () => {
  const renderer = new ShipRenderer();
  const ctx = canvasContext();
  const raven = Image.instances.find((image) => image.src === shipSprites.Raven.src);
  const gat = Image.instances.find((image) => image.src === shipSprites.Gat.src);
  raven.complete = false;
  gat.naturalWidth = 0;
  renderer.draw(ctx, "Raven");
  renderer.draw(ctx, "Gat");
  assert.deepEqual(ctx.calls, []);
  raven.complete = true;
  renderer.draw(ctx, "Raven");
  assert.equal(ctx.calls.length, 1);
  assert.equal(ctx.calls[0][1], raven);
});

test("world rendering dispatches both types with the existing DPR, position, and heading conventions", () => {
  const world = new World();
  const db = connection();
  const controller = new RemotePlayerController(db, world);
  db.insert(row("Raven", remoteOwner));
  db.insert({ ...row("Gat", remoteOwner), id: 43n, x: -40, y: -50 });
  world.entities.get("43").rotation = 0;
  const ctx = canvasContext();
  const canvas = {
    width: 0, height: 0,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: 800, height: 600 }),
  };
  const renderer = new WorldRenderer(canvas, world);
  try {
    renderer.setOffset(10, 15);
    renderer.render();
    assert.deepEqual(ctx.calls[0], ["setTransform", 2, 0, 0, 2, 0, 0]);
    assert.equal(canvas.width, 1600);
    assert.equal(canvas.height, 1200);
    assert.deepEqual(ctx.calls.filter(([name]) => name === "translate"), [
      ["translate", 410, 285], ["translate", 350, 365],
    ]);
    assert.deepEqual(ctx.calls.filter(([name]) => name === "rotate"), [
      ["rotate", 0], ["rotate", Math.PI / 2],
    ]);
    const draws = ctx.calls.filter(([name]) => name === "drawImage");
    assert.deepEqual(draws.map((call) => call[1].src), [shipSprites.Raven.src, shipSprites.Gat.src]);
    assert.equal(
      ctx.calls.filter(([name]) => name === "save").length,
      ctx.calls.filter(([name]) => name === "restore").length,
    );
  } finally {
    renderer.dispose();
    controller.dispose();
  }
});
