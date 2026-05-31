# Presentation Runtime Action Showcase {#runtime-action-showcase}

This sample demonstrates the current explicit stage actions in `@civilization-os/ppt`.

Speaker note:
Summary: Use this deck to verify runtime action visuals and pacing.
Cue: Start by naming the four explicit actions.
Emphasis: HTML bundle is the primary presenting artifact.

---

## Current explicit actions

These are the four runtime actions you need to reason about. {#action-list}

- `highlight`
- `appear`
- `spotlight`
- `laser`

Speaker note:
Summary: Keep the action list short and concrete.
Step 2 Cue: [action-list] Pause before explaining the list.
Step 2 Spotlight: [action-list]
Step 2 Spotlight Shape: pill
Step 2 Spotlight Timing: 100, 360, ease-out
Step 2 Spotlight Exit Timing: 20, 180, ease-in

---

## Highlight and appear

The stage should make the active target obvious without hiding the content model.

Highlight keeps a block visually dominant. {#focus-copy}

Appear is better when the next point should feel introduced, not merely emphasized. {#reveal-copy}

Speaker note:
Summary: Explain that highlight and appear are semantic stage actions.
Step 3 Emphasis: [focus-copy] Highlight keeps the target stable.
Step 3 Highlight: [focus-copy]
Step 3 Highlight Timing: 80, 260, ease-in-out
Step 3 Highlight Exit Timing: 40, 220, ease-in
Step 4 Cue: [reveal-copy] Then reveal the next block.
Step 4 Appear: [reveal-copy]
Step 4 Appear Timing: 120, 320, ease-out
Step 4 Appear Exit Timing: 20, 200, ease-in

---

## Spotlight and laser

The runtime can combine spotlight and laser when a narrated path matters more than a static highlight.

Spotlight gives you a circular focus region. {#spotlight-copy}

Laser is useful when the narrative depends on directional motion. {#laser-copy}

Speaker note:
Summary: This slide validates composed stage motion.
Step 3 Cue: [spotlight-copy] Drop the spotlight first.
Step 3 Spotlight: [spotlight-copy]
Step 3 Spotlight Shape: circle
Step 3 Spotlight Timing: 120, 420, ease-out
Step 3 Spotlight Exit Timing: 20, 180, ease-in
Step 4 Emphasis: [laser-copy] Then draw the path.
Step 4 Laser: 0.14,0.74 -> 0.42,0.52 -> 0.74,0.34
Step 4 Laser Anchor: target
Step 4 Laser Timing: 240, 680, cubic-bezier(0.22,1,0.36,1)
Step 4 Laser Exit Timing: 10, 240, ease-in

---

## Motion profile defaults

::: comparison {#profile-table}
left: Technical brief
right: Product showcase
Highlight | faster entry, tighter exit | slower entry, softer exit
Appear | controlled reveal | more cinematic reveal
Laser | shorter path timing | longer staged path timing
:::

Speaker note:
Summary: Different presets now carry different default motion profiles.
Step 2 Emphasis: [profile-table] Mention that source timing can still override the preset default.
Step 2 Highlight: [profile-table]
Step 2 Highlight Timing: 80, 260, ease-in-out
Step 2 Highlight Exit Timing: 40, 220, ease-in
