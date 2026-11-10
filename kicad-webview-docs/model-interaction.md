---
layout: webview-docs
title: Interactive models & displays
description: Attach virtual displays, LEDs, buttons and knobs to actual 3D model faces.
permalink: /kicad-webview/docs/model-interaction/
doc_section: model-interaction
---

Add a small scripted interface to a loaded board: paint a display, change an LED,
press a button or turn a knob. **These are virtual presentation controls.** They
do not run firmware, emulate a peripheral bus, predict electrical behavior,
connect to hardware or edit the KiCad design. Your page supplies the behavior.

This guide uses **0.3.0** and its public `DemoController` API. It does not
depend on the later site-specific interaction-locking API. For exact signatures,
see [DemoController](/kicad-webview/docs/api-utilities/#democontroller) and
[face selection](/kicad-webview/docs/api-viewer/#cameras).

[Open the approved IRCA interaction demo](/assets/demos/model-interaction.html) to try the website’s existing review integration. It uses the site-demo bundle and approved IRCA display models; the portable 0.3.0 API example below uses the credited public OLIMEX files.

## Choose actual geometry

First load a supported project with `{view:'3d'}`, then create one controller for
that viewer. `await viewer.pickDemoFace()` opens an interactive face picker. Let
the visitor select a suitable **planar face on the rendered component geometry**;
do not guess a rectangle from the component name or screen coordinates.

The returned `SelectedDemoFace` includes a token, saved component UUID/reference,
center, normal, width, height and orientation frame. A face token is valid only
for that exact mounted scene. A labelled stand-in still represents a stand-in:
painting a screen on it does not make it an accurate model of a physical display.
Curved or unsupported geometry can reject a face selection.

For a known design, `{anchor:{uuid:'the-saved-uuid',face:'top'}}` or
`{anchor:{reference:'SW1',face:'top'}}` is another placement route. The saved
identity must resolve uniquely and the geometry must support the requested face.
Use a real identity from your drawing, not the example reference as a universal
part name. A whole-component LED frame can have `shape:'component'` and
`normal:null`; it is not a planar display surface.

## A complete browser example

Explore the [capability demos](/kicad-webview/#capability-demos), then try the release-specific example below.

Save this HTML on an HTTP(S) host. It opens the public OLIMEX project using pinned original upstream sources under CERN-OHL-S-2.0 and lets you select the faces for each virtual control. Models are not bundled, so some geometry can be labelled stand-ins. Choose appropriate faces explicitly; use your own model-complete project for a product demonstration.

```html
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Virtual board controls</title>
<style>
  body { margin:16px; font:16px system-ui,sans-serif; }
  #board { height:65dvh; min-height:360px; }
  .controls { display:flex; gap:8px; flex-wrap:wrap; margin-block:12px; }
  button, select, input { min-height:44px; font:inherit; }
  label { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
</style>
<div id="board"></div>
<p id="status" role="status">Opening the public design…</p>
<div class="controls">
  <button id="screen" disabled>Choose screen face</button>
  <button id="led" disabled>Choose LED face</button>
  <button id="button" disabled>Choose button face</button>
  <button id="knob" disabled>Choose knob face</button>
  <button id="focus" disabled>Focus board keyboard</button>
</div>
<label>LED brightness
  <input id="brightness" type="range" min="0" max="1" step="0.05" value="0.7" disabled>
</label>
<p>After placing controls: focus the board; Space holds the button,
  and Up/Down change the knob. Page controls remain usable with a keyboard.</p>
<script type="module">
import { Viewer, DemoController } from
  'https://unpkg.com/@wayrisignals/kicad-webview@0.3.0/dist/kivi-viewer.js';

const status = document.querySelector('#status');
const viewer = new Viewer('#board', {theme:'dark'});
const abort = new AbortController();
let demo, hasScreen = false, hasLED = false, dial = 25, choosing = false;
const installed = new Set();
const controls = [...document.querySelectorAll('.controls button')];
viewer.addEventListener('error', event => {
  status.textContent = event.detail.message;
});
function paintScreen() {
  if (!hasScreen || !demo?.active) return;
  demo.drawDisplay('screen', (ctx, canvas) => {
    ctx.fillStyle = '#081a35'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#4ce4c1'; ctx.font = '32px sans-serif';
    ctx.fillText('VIRTUAL PANEL', 24, 56);
    ctx.fillStyle = '#ffffff'; ctx.font = '24px sans-serif';
    ctx.fillText(`Dial: ${dial}`, 24, 106);
    ctx.fillStyle = '#ff527d'; ctx.fillRect(24, 146, dial * 4, 30);
  });
}
async function choose(id, install) {
  if (!demo?.active || choosing) return;
  choosing = true;
  controls.forEach(button => button.disabled = true);
  status.textContent = `Select a planar face for the virtual ${id}.`;
  try {
    const face = await viewer.pickDemoFace({signal:abort.signal});
    if (!demo.active) return;
    if (installed.has(id)) {
      demo.remove(id);
      installed.delete(id);
      if (id === 'screen') hasScreen = false;
      if (id === 'status') hasLED = false;
    }
    install(face);
    installed.add(id);
    status.textContent = `Virtual ${id} attached. The design is unchanged.`;
  } catch (error) {
    status.textContent = error.message;
  } finally {
    choosing = false;
    controls.forEach(button => button.disabled = !demo?.active);
  }
}
document.querySelector('#screen').onclick = () => choose('screen', face => {
  demo.addDisplay('screen', {face, mode:'tft', width:512, height:384,
    onPress: event => {
      if (event.uv) status.textContent =
        `Display UV: ${event.uv.x.toFixed(2)}, ${event.uv.y.toFixed(2)}`;
    }
  });
  hasScreen = true;
  paintScreen();
});
document.querySelector('#led').onclick = () => choose('status', face => {
  demo.addLED('status', {face, color:'#65ff84', on:true, brightness:0.7});
  hasLED = true;
  document.querySelector('#brightness').disabled = false;
});
document.querySelector('#button').onclick = () => choose('start', face => {
  demo.addButton('start', {face, label:'Virtual start',
    onPress: () => { if (hasLED && demo.active) demo.setLED('status', true); },
    onRelease: () => { if (hasLED && demo.active) demo.setLED('status', false); }
  });
  demo.bindKey('Space', {id:'start', action:'press'});
});
document.querySelector('#knob').onclick = () => choose('level', face => {
  demo.addKnob('level', {face, min:0, max:100, step:1, value:dial,
    onChange: event => { dial = event.value; paintScreen(); }
  });
  demo.bindKey('ArrowUp', {id:'level', action:'increment', repeat:true});
  demo.bindKey('ArrowDown', {id:'level', action:'decrement', repeat:true});
});
document.querySelector('#brightness').oninput = event => {
  if (hasLED && demo?.active) demo.setLED('status', {
    on:true, color:'#65ff84', brightness:Number(event.target.value)
  });
};
document.querySelector('#focus').onclick = () => demo?.focus();
try {
  const loaded = await viewer.load(
    'https://wayri.github.io/assets/demos/public-hardware/olimex-p4-project.json',
    {view:'3d', signal:abort.signal}
  );
  if (loaded) {
    demo = new DemoController(viewer);
    demo.addEventListener('error', event => {
      status.textContent = `${event.detail.phase}: ${event.detail.error.message}`;
    });
    demo.addEventListener('suspend', () => {
      controls.forEach(button => button.disabled = true);
      document.querySelector('#brightness').disabled = true;
      status.textContent = 'The scene changed. Recreate the controller and choose new faces.';
    });
    controls.forEach(button => button.disabled = false);
    status.textContent = 'Choose faces to add virtual controls.';
  }
} catch (error) { status.textContent = error.message; }
window.addEventListener('pagehide', () => {
  abort.abort(); demo?.dispose(); viewer.dispose();
}, {once:true});
</script>
</html>
```

The controls can also use stable saved anchors instead of face picking. The full
example avoids assuming that every board has a `D1`, `SW1` or `RV1`. Keep a
DOM-based alternative for every important action: mesh regions can be difficult
to target on touch screens or with assistive technology.

## Display modes and pixels

| Mode | Default dimensions | Intended virtual surface |
| --- | --- | --- |
| `matrix` | 16 × 8 | Small pixel/status matrix |
| `oled` | 128 × 64 | Compact display graphics |
| `lcd` | 320 × 240 | Canvas-driven display graphics |
| `tft` | 320 × 240 | Full-color graphics, images or RGBA pixels |

Specify integer width and height from **1 to 1024**. A controller permits at most
**64 controls** and **4,194,304 total display pixels**. `remove(id)` frees a
surface’s pixel budget. Texture resolution does not change the selected model’s
physical face size or aspect ratio. More pixels can sharpen magnified text, but
they increase canvas, upload and GPU memory costs; redraw only when needed.

`drawDisplay(id, callback)` supplies a native 2D canvas. The callback must finish
synchronously. A thrown or asynchronous callback reports an error and returns
`false`; it is not retried. Painting is not transactional. `writeImage` and
`setPixels` also return a success boolean; listen for `error` events.

### Native canvas graphics and an image

After adding `screen`, a host can draw directly or copy an origin-clean image:

```js
demo.drawDisplay('screen', (ctx, canvas) => {
  ctx.fillStyle = '#001014'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#65ffcc'; ctx.font = '28px sans-serif';
  ctx.fillText('READY', 20, 48);
});

// A locally generated canvas is an origin-clean CanvasImageSource.
const image = document.createElement('canvas');
image.width = 64; image.height = 64;
const ctx = image.getContext('2d');
ctx.fillStyle = '#ff527d'; ctx.fillRect(0, 0, 64, 64);
ctx.fillStyle = '#4ce4c1'; ctx.fillRect(16, 16, 32, 32);
demo.writeImage('screen', image);
```

`writeImage` clears and scales the image to the display. For a remote image, set
its CORS mode before its URL and use a server that grants the required access.
Wait for decoding before calling `writeImage`. The library does not fetch images
for you or bypass an origin-tainted canvas. A failed GPU/texture upload is an
error, not a reason to draw a plausible replacement result.

### RGBA and monochrome buffers

The complete example creates a 512 × 384 screen. This paints it with a synthetic
color pattern, not a measured image:

```js
const width = 512, height = 384;
const pixels = new Uint8ClampedArray(width * height * 4);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    pixels[i] = Math.round(255 * x / (width - 1));
    pixels[i + 1] = Math.round(255 * y / (height - 1));
    pixels[i + 2] = 96;
    pixels[i + 3] = 255;
  }
}
demo.setPixels('screen', pixels, {format:'rgba'});
```

| `format` | Required byte count and order |
| --- | --- |
| `rgba` | width × height × 4; row-major red, green, blue, alpha |
| `mono` | width × height; nonzero byte means an on pixel |
| `mono1` | ceil(width / 8) × height; row-major, MSB first, each row byte-padded |

Use `Uint8Array` or `Uint8ClampedArray`. The controller checks the exact byte
length and respects typed-array view offsets. For monochrome formats, optional
`foreground` and `background` accept `#rrggbb`. Default foreground is green for
matrix and pale cyan for OLED/LCD, with opaque black background. Choose the
format explicitly when sharing buffer-generation code. The modes do not emulate
a display-controller chip, SPI bus, RGB565 wire protocol or character ROM.

## LEDs, buttons, knobs and keyboard

`setLED(id, true)` switches a virtual LED on; an object patch can set `on`,
`color:'#rrggbb'` and `brightness` from 0 to 1. Brightness is a presentation value,
not luminous intensity or a modeled electrical current.

Buttons use `press(id)` / `release(id)` and `onPress` / `onRelease`. Pointer and
keyboard holds aggregate, so releasing one input does not prematurely release a
different held input. A lifecycle, focus or visibility cancellation releases
controls with `cancelled:true`; stop local animations and avoid updating a stale
scene in a late callback. Knobs have finite `min`, `max`, positive `step` and
`value`; `setKnob` clamps and quantizes, and `change(id, delta)` moves by
`delta × step`. Their values are host-defined demonstration state.

Use `bindKey` with **KeyboardEvent.code**, such as `Space`, `KeyL` or `ArrowUp`.
The `id`/`action` route supports `press`, `toggle`, `increment` and `decrement`;
the callback route takes `onDown`/`onUp`. Repetition is opt-in. Modifiers must
match exactly; defaults are false. There are at most 128 bindings. A returned
function removes one binding, and `unbindKey(code)` removes the code’s binding.

Keys belong to the focused viewer root, not the document. Editable fields,
links, toolbar controls and IME composition are ignored. Construction does not
autofocus; call `demo.focus()` from an explicit page control. Leaving viewer
focus or hiding the page releases held controls. Provide visible keyboard help
and equivalent page controls; do not take over ordinary page shortcuts.

## Touch regions and lifecycle

Display `input` events carry normalized surface `uv` coordinates when supplied
by the renderer. The host chooses and tests its UV-to-pixel convention, including
Y orientation; do not assume a CSS overlay coordinate equals a model UV.
`input` includes `id`, `type`, `source`, and optional `value`, `uv`, `cancelled`
and `originalEvent`. Callbacks are host JavaScript and are not serialized into
share links or executed from source files.

Only one active controller owns a viewer’s demo input handler. It binds to the
exact source text, file path and renderer identity. Source, view or renderer
replacement suspends it, releases held controls, removes key bindings and disposes
the surfaces. It does **not** reattach old face tokens to new geometry. Recreate
the controller and explicitly choose/bind the new scene after that transition.
A failed load that retains the current source and renderer does not itself
invalidate the controller.

Call `demo.dispose()` when unmounting; it is idempotent and does not dispose the
viewer you supplied. Dispose that viewer separately. Cancel pending face picks
with an `AbortSignal`. Listen for `error` and `suspend`, and handle asynchronous
host work so a late completion cannot repaint a replaced scene. This release has
no public `modelsready` event or focused interaction-locking method; do not copy
newer site-only calls into a 0.3.0 integration.

See [other runnable examples](/kicad-webview/docs/examples/), the
[full controller API](/kicad-webview/docs/api-utilities/#democontroller) and
[versioned source](https://github.com/wayri/kicad-webview/blob/v0.3.0/docs/INTERACTIVE-DEMO.md).
