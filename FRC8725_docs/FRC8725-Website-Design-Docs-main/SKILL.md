---
name: apply-team-8725-web-design
description: Apply the Team 8725 Web App design system and application architecture when creating, modifying, reviewing, or generating prompts for websites and Web Apps. Use for UI/UX planning, wireframes, frontend implementation, CSS refactoring, component design, responsive behavior, accessibility reviews, Cloudflare Worker/D1/Access architecture, shared people-table authorization, API contracts, design-system compliance audits, and prompts that ask another AI to produce or evaluate Team 8725 interfaces.
---

# Apply Team 8725 Web Design

Use the repository design system as the source of truth. Do not reproduce its full contents in prompts or invent parallel rules.

## Load the required context

Read only what the task needs, but never skip step 1 or 2.

**Always:**

1. [`design-system-guide.md`](design-system-guide.md) — normative design methodology.
2. [`design-system/interaction-checklist.md`](design-system/interaction-checklist.md) — acceptance checklist.

**When implementing or reviewing frontend code, add:**

3. [`docs/04-frontend.md`](docs/04-frontend.md) — style layering, HTML shell, module roles, auto sign-in.
4. [`docs/05-components.md`](docs/05-components.md) — the only legal class names.
5. [`docs/06-interaction.md`](docs/06-interaction.md) — JS module contract and state-presentation rules.
6. [`docs/07-mobile.md`](docs/07-mobile.md) — breakpoints and mobile navigation.
7. [`design-system/tokens/tokens.css`](design-system/tokens/tokens.css) and
   [`design-system/base/base.css`](design-system/base/base.css) — do not restate, reuse.
8. [`design-system/starter/`](design-system/starter/) — living example of every component.

**When touching the backend, data model, or authorization, add:**

9. [`docs/01-architecture.md`](docs/01-architecture.md) — Worker + D1 + Access boundaries.
10. [`docs/02-database.md`](docs/02-database.md) — `people` table, roles, D1 pitfalls, security checklist.
11. [`docs/03-api-contract.md`](docs/03-api-contract.md) — endpoints, payload shapes, error codes.

**When scaffolding a new app, add:**

12. [`docs/08-new-app.md`](docs/08-new-app.md) — the step-by-step procedure. Follow it in order.

Also read product-specific requirements supplied by the user or found in the target product.

Treat `design-system-guide.md` as the only normative *design* document and `docs/` as the
normative *implementation* contract. Treat the checklist and starter as supporting material.

## Establish the task

Identify:

- The target product, users, primary task, platform, framework, and existing code.
- Whether the request is for design, implementation, review, refactoring, or prompt generation.
- The existing design tokens and components that can be reused.
- Product-specific constraints that supplement the design guide.

If information is missing, inspect the repository before asking questions. Make safe, reversible assumptions when they do not change product intent.

## Apply the system

Preserve the product’s task and content while enforcing the shared design language.

### Required implementation rules

- Use semantic HTML and the most appropriate native interactive element.
- Use the shared design tokens instead of page-specific visual constants.
- Reference every CSS color through a custom property. Keep literal Hex, RGB, HSL, transparent, gradient, and shadow color values in the token definition layer only.
- Use `var(--font-family)` for all normal interface text. Reserve `--font-mono` for code, identifiers, or genuinely tabular monospaced content.
- Keep a rectangular component’s radius at or below one third of its shortest side unless the object is intentionally circular.
- Do not give ordinary buttons, inputs, cards, panels, list rows, toasts, or dialogs a pill shape.
- Provide default, hover, active, focus-visible, loading, disabled, success, empty, and error behavior when relevant.
- Support keyboard, pointer, touch, reduced motion, 200% zoom, and responsive layouts down to 320 px.
- Do not use color, icon, hover, dragging, or gesture as the only way to convey essential information or complete a task.
- Keep domain-specific patterns in the product layer. Do not turn one product’s navigation, data model, or workflow into a Team 8725 global rule.

### Required architecture rules

These are as binding as the visual rules. Full detail in `docs/01-architecture.md` §2.

- Identity comes from Cloudflare Access (GitHub). Never add a password field, sign-up form,
  session store, or sign-out button.
- The Worker is the only authorization boundary. Verify the Access JWT signature, issuer,
  audience, expiry, and subject on **every** request. Never trust a client-supplied user id.
- Shared identity lives in one `people` row per person. Each app owns exactly one
  `<prefix>_role` column, defaulting to `member`. There is no approval flow and no
  `<app>_auth` column.
- Never delete from `people`. Revoke by setting the role back to `member`.
- Keep app-specific relations in that app's own tables. Do not duplicate them into `people`.
- Migration filenames must be globally unique across apps (they share one `d1_migrations`).
- Reuse `design-system/base/base.css` verbatim. The product stylesheet may only add classes,
  never redefine shared ones — it loads afterwards and would silently override them.
- Shared files exist as byte-identical copies in every app. Changing one means changing all
  of them plus this repository.

### Preserve consistency

- Reuse an existing token or component before creating a new one.
- Add a shared pattern only when it reasonably applies to at least two product contexts.
- Keep links for navigation and buttons for actions.
- Use one clear page purpose, one `h1`, and one dominant primary action per region.
- Keep control positions and major container dimensions stable during data and state changes.

## Work by request type

### Design or plan an interface

1. Define the user, primary outcome, entry point, and next step.
2. Establish information hierarchy and task flow before visual styling.
3. Select responsive layout and components from the guide.
4. Specify initial, loading, empty, no-results, partial, success, warning, error, offline, and permission states as applicable.
5. Describe keyboard behavior, accessible names, focus movement, and responsive reflow.
6. Check the proposal against the interaction checklist.

### Implement or modify frontend code

1. Inspect the existing framework, components, tokens, and local conventions.
2. Import or reuse `design-system/tokens/tokens.css`.
3. Make the smallest coherent change that fulfills the product task.
4. Replace hard-coded CSS colors with semantic variables.
5. Apply `var(--font-family)` to normal interface text.
6. Verify component radius at its smallest responsive size.
7. Test relevant states, keyboard behavior, viewport widths, zoom, and reduced motion.
8. Report changed files, verification performed, and any remaining product decisions.

### Review an interface

Classify findings by impact:

- `blocking`: prevents task completion, accessibility, security, or correct interpretation.
- `major`: violates a mandatory shared rule or causes substantial inconsistency.
- `minor`: localized usability, content, or maintainability issue.

For each finding, state:

1. The affected file, component, or screen.
2. The observed behavior.
3. The violated requirement.
4. The user or maintenance impact.
5. A concrete correction.

Do not report personal visual preferences as violations.

### Generate a prompt for another AI

Produce a self-contained task prompt using this structure:

```text
Goal
[Describe the interface or change and its user outcome.]

Product context
[Users, workflow, framework, existing components, data, and constraints.]

Required references
- Read design-system-guide.md as the only normative design source.
- Read design-system/interaction-checklist.md.
- Read docs/05-components.md for the only legal class names.
- Read docs/06-interaction.md for the JS contract and state-presentation rules.
- Read docs/07-mobile.md for breakpoints and mobile navigation.
- Reuse design-system/tokens/tokens.css and design-system/base/base.css verbatim.
- Reuse design-system/ui/ for icon, dialog, toast, and form helpers.
- Inspect design-system/starter/ when implementation examples are needed.
[For backend or data work, also require docs/01-architecture.md, docs/02-database.md,
 and docs/03-api-contract.md.]

Mandatory rules
- Use CSS variables for every color. Literal colors belong only in tokens.css and the
  derived-token block at the top of base.css.
- Use var(--font-family) for normal interface text.
- Keep rectangular component radius at or below one third of its shortest side.
- Use only the class names listed in docs/05-components.md. Do not invent .btn, .panel,
  .modal, .state-block, .sr-only, or other synonyms.
- The product stylesheet may only add classes, never redefine shared ones.
- Breakpoints are 1100 / 900 / 768 / 480 only.
- No sign-in page, no pending-approval page, no sign-out button.
- Lists load with skeletonList(), not a centered spinner. Empty lists use emptyState().
- Meet semantic HTML, keyboard, touch, responsive, state, contrast, and reduced-motion requirements.
- Keep product-specific behavior in the product layer.

Deliverables
[List files, designs, code, screenshots, review findings, or tests expected.]

Verification
[List target viewport sizes, states, interactions, and commands to validate.]
```

Adapt the prompt to the user’s framework and task. Include only relevant constraints, but never omit the mandatory rules.

## Validate before delivery

Complete the relevant items in `design-system/interaction-checklist.md`.

For CSS work, search outside the token definition layer for:

- Literal Hex, RGB, HSL, named, transparent, gradient, or shadow colors.
- Old font stacks or direct `font-family` declarations.
- Pill radii or radii exceeding the geometric limit.
- Redefinitions of shared classes in the product stylesheet.

For shared-file work, confirm every copy is still byte-identical:

```bash
diff <app>/public/styles/tokens.css design-system/tokens/tokens.css
diff <app>/public/styles/base.css   design-system/base/base.css
diff -r <app>/public/assets/icons   design-system/assets/icons
```

For backend work, walk `docs/02-database.md` §7 (security checklist).

Verify that relative documentation links resolve and that JSON token files remain valid when changed.

Lead the final response with the result. Summarize material design decisions, changed files, validation, and any unresolved product-specific questions.
