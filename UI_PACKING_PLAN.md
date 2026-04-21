# Plan: Compact Chat Post-Composer Drawer

## Objective
The main chat interaction (prompt area, history) should consume maximum vertical height. The secondary settings (Model selector, Criticality slider, Tracking toggles) are currently taking up too much vertical screen real estate, creating UI clutter.

We will hide these items behind a native collapsible `<details>` element (a "drawer") to "pack" them away by default, making them available securely without constantly blocking the user's primary view.

## Execution Plan
1. **Refactor JSX layout in `ChatView.tsx`**:
   - Locate the `<div className="chat-post-composer">` which currently wraps `chat-model-inline`, `chat-inline-tools`.
   - Convert it to `<details className="chat-post-composer">`.
   - Add a `<summary>` element with a nice label (e.g. `<span className="eyebrow">Session Configuration</span>`).
   - Wrap the actual config blocks inside a `<div className="chat-post-composer__body">`.

2. **Add CSS to `styles.css`**:
   - Style `<summary>` to behave like an interactive label.
   - Set `.chat-post-composer__body` with `display: flex; flex-direction: column; gap: 0.7rem;` which replaces the flex rules formerly on `.chat-post-composer` directly.
   - Ensure the padding and margins adapt dynamically when toggled.

3. **Verify Functionality**:
   - Look and feel should let the "ChatTranscript" and "Composer" dominate the screen.
   - Opening the "Session Configuration" drawer expands smoothly, un-hiding the large "Claude Sonnet 4.6" select box and "Criticality" slider.

