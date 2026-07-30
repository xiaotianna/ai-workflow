# Workflow Next Step Design QA

## Comparison Target

- Source visual truth:
  `/private/var/folders/yx/0f19czbd2pn84nsrmvb134200000gn/T/codex-clipboard-a67c2ae4-edda-4b41-9c13-86e698a66fd4.png`
- Source pixels: `810 × 414`
- Source CSS size and density: unavailable from the cropped screenshot; the image appears to be a
  high-density capture, but no density normalization was used for acceptance.
- Previous implementation reference:
  `/private/var/folders/yx/0f19czbd2pn84nsrmvb134200000gn/T/codex-clipboard-0b99c574-1b5a-48d5-8604-d4d8b2252027.png`
- Previous implementation pixels: `800 × 316`
- Browser-rendered implementation screenshot: unavailable
- Viewport: unavailable
- State: current node with two directly connected downstream nodes and an add-parallel-node action

## Full-view Comparison Evidence

Blocked. No running application tab was available in the in-app browser, and the repository rules
prohibit starting the development server unless the user explicitly requests it.

## Focused Region Comparison Evidence

Blocked for the same reason. The source target was available, but there was no post-change rendered
component capture to place beside it.

## Findings

- [P1] Runtime fidelity has not been visually verified.
  - Location: workflow configuration panel, next-step section.
  - Evidence: the implementation now derives and renders direct downstream nodes, but no rendered
    screenshot is available to compare typography, spacing, icon scale, color, and copy against the
    source.
  - Impact: static checks cannot prove that the final browser rendering matches the target crop.
  - Fix: run the existing Web development environment, open a node with at least two direct
    downstream connections, capture the section at the same density, and compare both images.

## Required Fidelity Surfaces

- Fonts and typography: blocked pending rendered evidence.
- Spacing and layout rhythm: implemented to the measured compact specification, but blocked pending
  rendered evidence.
- Colors and visual tokens: implementation uses existing semantic tokens and Nodes UI theme colors;
  visual comparison remains blocked.
- Image quality and asset fidelity: no raster assets are required; node icons reuse the existing
  `NodeIcon` library component. Rendered sharpness remains unverified.
- Copy and content: implemented as connected instance names plus “添加并行节点”; browser rendering
  remains unverified.

## Comparison History

- Initial source review identified missing connected-node rows and oversized source/add controls.
- Implemented direct downstream-node derivation, compact node rows, a compact add-parallel action,
  standard Nodes UI icons, and click-through to connected-node configuration.
- Post-fix visual evidence is unavailable because no running application page was present.

## Implementation Checklist

- Start the existing Web development environment only with user authorization.
- Capture the connected-node state at the same crop and density as the source.
- Compare the two images together and correct any remaining P1/P2 visual differences.

## Follow-up Polish

- Review hover, keyboard focus, disabled, and node-list insertion animation after the base visual
  comparison passes.

final result: blocked
