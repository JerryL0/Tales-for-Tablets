# Tales for Tablets

An illustrated library built with plain HTML, CSS, inline SVG, and JavaScript. There are no dependencies, frameworks, external assets, or build steps.

## Open the website

Open `index.html` directly in a browser, or serve this folder with a static HTTP server.

## GitHub Pages

Commit `index.html`, `style.css`, `app.js`, `stories.js`, and `reader.js` to the repository. In GitHub Settings → Pages, choose Deploy from a branch, your branch, and / (root). Relative asset paths support both root and repository project URLs.

## Stories and activities

Each of the three books has eight chapters, with two connected paragraphs and an interactive scene per chapter. The stories are in `stories.js`; illustrations are in `app.js`; reader and activity behavior are in `reader.js`.

- Place objects in their matching spatial locations by dragging or by selecting an object and its destination.
- Steer a character through an ordered route with dragging, destination taps, arrow buttons, or arrow keys.
- Brush across covered patches to reveal objects, with repeated tapping or keyboard activation as an alternative.
- Adjust solar alignment, watering, or an observation lamp with a range control and immediate visual feedback.
- Follow sequences from the passage to trigger changes and character movement in the scene.

Readers can reset activities, select any chapter, or continue reading without completing an activity. Narration highlights the current paragraph. Sound and scene motion can be controlled independently; system reduced-motion preferences are respected.

Chapter progress is saved only in localStorage when available. Expanded-story progress uses a separate key from the earlier short prototype because the chapter structure has changed. Activity state resets when a chapter is reopened. Narration depends on browser and device voices. No personal data is transmitted.

## Verification of the expanded edition

- JavaScript syntax checks passed for all three scripts.
- All 24 activities completed through browser controls, and all three ending screens were checked.
- Wrong-order and wrong-destination feedback, direct rocket-part dragging, reset, animation pause, and chapter persistence were checked in the browser.
- All 24 chapters were checked for horizontal overflow in the narrow in-app browser viewport; none remained after the responsive layout fix.
- Narration voice quality and physical iPad touch behavior still depend on the target device and were not evaluated on an actual iPad.
