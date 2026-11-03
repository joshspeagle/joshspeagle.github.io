/*
 * site.js: the behaviour every page shares, and TP.fig, the figure contract every figure script
 * hands its figure to.
 *
 * Design: notes/revamp/design-system.md (DS) §6, §9, §11.1, §11.2, §11.4, §11.7 and §13, and
 * notes/revamp/implementation-plan.md (the plan) §2.4 and WO-I5. A classic script on window.TP
 * with no dependencies. Every page loads it after lib/format.js, refs.js and concepts.js, and
 * before chart.js and runtime.js, so nothing here reads TP.chart or TP.run while it loads. The
 * parts of section 1 of the code need no DOM (the parameter schema, the URL text, presets and
 * the interpolation of transitions), and Node loads them for tests/lib/site.test.js.
 *
 * This comment is the reference for figure builders and page writers:
 *   A. The page's life cycle and events
 *   B. The figure contract, TP.fig(element, contract)
 *   C. A parameter entry
 *   D. The figure object that TP.fig returns
 *   E. Changes, settling, the ghost, the pin and transitions
 *   F. The URL, TP.state
 *   G. Controls, presets, Reset, "Draw again", actions and printing
 *   H. Exercises
 *   I. Running figures: what TP.fig gives the runtime (WO-I6)
 *   J. Test hooks, TP.figures[id] (WO-I12, WO-I13)
 *   K. TP.ui, the controls, with their markup and behaviour
 *   L. Page components outside figures (DS §13)
 *   M. Recaps, cases and TP.whenNear
 *   N. The page chrome kept from version 1
 *
 * A. THE PAGE'S LIFE CYCLE AND EVENTS
 *   On DOMContentLoaded site.js builds the header, the source marks, the citations, the margin
 *   notes, the figure numbers and the pager, renders the math, and gives the self-checks, rule
 *   prompts and copy buttons their behaviour. It then dispatches "tp:ready" on document, and each
 *   figure script calls TP.fig from its tp:ready listener. After the dispatch site.js logs a
 *   console error for each figure.fig (other than a recap or a reproduced figure) that no script
 *   registered, for each running figure with no runtime, and for each preset link that names a
 *   figure or preset that does not exist. It then starts watching the recaps.
 *   Events on document:
 *     tp:ready    once, after the page chrome is built
 *     tp:figure   after each settle of a figure (detail: its id); the margin notes are laid out
 *                 again
 *     tp:theme    when the Theme toggle changes (detail: "auto", "light" or "dark")
 *
 * B. THE FIGURE CONTRACT
 *   var fig = TP.fig(element, {
 *     kind: 'fixed',          'fixed', 'running', 'static' or 'exercise'. A static figure carries
 *                             the class "static" and an exercise the class "exercise" (DS §3.4).
 *     params: {name: entry},  section C. The order of the keys is the order of the controls, of
 *                             the URL's pairs and of clamping.
 *     seed: 4127,             the default seed of a stochastic figure, absent when deterministic.
 *                             TP.fig then adds the parameter "seed" with its "Draw again" control.
 *     presets: {'hold, then jump': {key: 'hold', kind: 'hold'}},     section G
 *     states: {w100: {end: 100}},   named states that the ledger check applies (section J)
 *     docked: ['presets'],    the controls other than parameters that sit in the dock; 'preset:<key>'
 *                             docks one preset (section G)
 *     actions: [{name: 'clear', label: 'Clear the strip', press: fn}],   section G
 *     pin: true,              a pin button, or {label: 'Pin', unlabel: 'Unpin'} (section E)
 *     prepare: function () {},   the first heavy computation. It runs once, when the figure comes
 *                             within one viewport height of the screen (DS §1 item 3).
 *     apply: function (values) { return state; },   fixed, static and exercise figures: the
 *                             derived state for the values, the seed included. Every row of an
 *                             array in the state carries a `key` (DS §9). A running figure takes
 *                             its states from its runtime instead.
 *     draw: function (state, ctx) {},   draws every panel into fig.panels, usually through
 *                             C.panel. state is null before prepare, and draw then builds the
 *                             frames and axes alone. ctx is described in section E. draw never
 *                             calls fig.set.
 *     readout: function (state, ctx) { return 'One sentence.'; },   required unless static
 *     table: function (state, ctx) { return {columns: [{key, label, format}], rows, caption}; },
 *     quantities: function (state, ctx) { return {'divergence-step': 34}; },   the ledger keys'
 *                             third parts, in kebab case (plan WO-I5.1)
 *     constrain: function (next, prev, changed) { return next; },   optional. It adjusts values
 *                             that depend on each other after a reader's change, such as F6.3's
 *                             slice when the number of buckets changes. `changed` lists the names
 *                             the change set. It is not called for values read from the URL.
 *     largestMove: function (from, to) { return px; },   optional: the largest move of a mark
 *                             in px, so that a move under 40 px takes a 400-ms transition (DS §9)
 *     snapshot: function () { return extra; },   optional: figure state outside params, such
 *     restore: function (extra) {},              as F9.2's strip. TP.fig keeps it with its own
 *     clear: function () {},                     snapshot. clear empties it on Reset and before
 *                                                printing.
 *     check: function () {},  an exercise's "Check", after the HTML items are committed (section H)
 *     model: function (body) {},   builds the model note when the page's HTML has none, because
 *                             it prints computed values (DS §11.1)
 *   });
 *   TP.fig checks the parts of DS §3.4 that the page's HTML holds and logs, for example,
 *   "TP.fig: fig-warmup lacks p.fig-task" for each one missing, and "has p.fig-caption before
 *   p.fig-task" for one out of order. The HTML parts are figcaption.fig-head (span.fig-num,
 *   span.fig-title with the id that aria-labelledby names, and span.chip where the figure has one),
 *   p.fig-task (not required on a static figure), p.fig-caption and details.fig-model, and the
 *   figure carries role="group". TP.fig fills nothing in them. It builds, in this order after the
 *   task line: div.fig-controls-more, div.fig-dock holding div.fig-controls (only where something
 *   is docked, and always on a running figure), div.fig-panels (kept where the HTML already holds
 *   one, as an exercise's items do), p.fig-readout with its twin p.sr-only[aria-live=polite], then
 *   p.fig-key before the model note and details.fig-table after it.
 *
 * C. A PARAMETER ENTRY
 *   end: {
 *     type,          'number', 'choice', 'set' or 'bool'; inferred from the default when absent
 *     default,       the value at the default state; a set's default is an array
 *     domain,        a number's [min, max], a choice's values, a set's members, or a function of
 *                    the values of the parameters before it that returns one of these (F2.1's
 *                    focus, F6.1's upper bound)
 *     max, min,      a set's most and fewest members, by default all of them and 0
 *     snap,          a number's sorted list of values, or its step (0.05); absent is continuous
 *     snapOrigin,    a step's origin, by default the domain's minimum or 0
 *     scale,         'log' snaps to a list by log distance and gives a slider log positions
 *     encode, decode,   the value to its URL text and back (section F gives the defaults)
 *     change,        a running figure's 'live', 'restart' or 'redraw' (DS §7.6); any other
 *                    figure's 'transition' or 'cut' (DS §9). Default 'cut', or 'restart'.
 *     ghost,         true where a change leaves the ghost of DS §4.8; default false
 *     showEnd,       on a running figure's restart parameter (DS §7.6)
 *     label,         the control's visible label, in the playbook's term
 *     control,       'slider', 'segment', 'toggles', 'check', 'handle' or 'none'. The default is
 *                    'handle' for a number with `handle`, and otherwise a slider for a number,
 *                    segment buttons for a choice, toggles for a set and a checkbox for a bool.
 *                    A number with control 'slider' and `handle` has both, sharing one state.
 *     handle,        the letter of the panel on which the figure's draw makes the handle, which
 *                    calls fig.set (section E)
 *     dock,          true where the control sits in the dock; otherwise it sits in more
 *     place: 'side', the control sits in div.fig-side, which TP.fig adds at the end of
 *                    div.fig-panels (F2.1)
 *     panel: 'b',    the control sits in the header of panel (b), div.panel[data-panel="b"]
 *                    .panel-head, once draw has built it (F1.2)
 *     when,          function (values): the control shows only while it returns true
 *     format,        function (value): the text of a value (slider output, aria-valuetext)
 *     labels,        {value: text}: the text of each choice or member on its button
 *     ticks          [{value, text}], or a function of the values returning them: special values
 *                    named under a slider's track (DS §6.3)
 *   }
 *   Parameter names and the values of choices and sets match /^[a-z0-9-]+$/, and "t" is
 *   reserved for the cursor. The seed is the parameter "seed", an integer from 1 to 2^32 - 1
 *   with change 'cut' ('restart' on a running figure) and no ghost. An entry params.seed may set
 *   its label ("New pool" for F5.2) and dock.
 *
 * D. THE FIGURE OBJECT
 *   fig.id, fig.el, fig.kind, fig.params (the normalized entries, "seed" included), fig.order
 *   fig.panels     div.fig-panels, where draw draws
 *   fig.dock       div.fig-dock, or null; fig.controls is its div.fig-controls
 *   fig.more       div.fig-controls-more;  fig.side  div.fig-side, or null
 *   fig.set(values, {transient})   applies values (section E)
 *   fig.settle()   settles after transient changes, as a handle does on release
 *   fig.reset(), fig.preset(nameOrKey), fig.redraw({settle, apply})
 *   fig.values()   the current values, the seed included; fig.state() the derived state
 *   fig.control(name)   the element of a parameter's control
 *   fig.pin(on), fig.pinned()      section E
 *   fig.answer(item, option), fig.check(), fig.exercise()     section H
 *   fig.snapshot(), fig.restore(snap), fig.whenReady()
 *   fig.on(event, fn)   'settle', 'prepare' (called at once when already prepared) or 'draw'
 *   fig.linkSymbol(name, node)   hover or focus on node marks each .hp-<name> symbol in the
 *                  figure with the class "on" (DS §6.3); TP.fig does it for its own controls
 *   fig.attach(run), fig.initial(), fig.draw(state, ctx)   the runtime's (section I)
 *
 * E. CHANGES, SETTLING, THE GHOST, THE PIN AND TRANSITIONS
 *   fig.set(values, {transient}) clamps and snaps each value to its entry (section C), calls
 *   constrain, and applies what changed.
 *     - transient: true, on each frame of a drag or a keyboard step on a handle: apply(values)
 *       and draw at once with ctx.transient and ctx.hold set. The figure does not settle.
 *     - otherwise, when every changed parameter's class is 'transition': a transition from the
 *       state on screen to the new one (TP.fig.transition), 750 ms, or 400 ms when largestMove
 *       says the largest move is under 40 px, then a settle. Under reduced motion it is a cut.
 *     - otherwise, a cut: draw at once and settle.
 *   A handle calls fig.set(v, {transient: true}) on each frame and fig.set(v) or fig.settle() on
 *   release. A value equal to the current one settles a figure with transient changes pending
 *   and otherwise does nothing.
 *   Settling (DS §1): the readout is set and its live twin repeats it, the data table is
 *   rebuilt, the placer runs from scratch (the draw that ends the change has ctx.hold false),
 *   the URL is written at most once every 250 ms, the settle listeners run, and "tp:figure" is
 *   dispatched. The visible readout follows every draw except a transition's frames, and the
 *   live twin changes on a settle alone, so it never speaks on a transient change or during play.
 *   The live twin stays empty at load, so that loading a page announces nothing.
 *   ctx, the second argument of draw, readout, table and quantities:
 *     fig, values      the figure and the values of the state drawn
 *     transient        a frame of a drag
 *     transition       a frame of a transition, whose numbers are interpolated
 *     hold             labels keep the positions that stay admissible (C.place's hold); true on
 *                      transient, transition and playing frames, false on the draw that settles
 *     phone            the phone layout, below 640 px
 *     ghost            the derived state as it stood before the last change of a ghost: true
 *                      parameter, held through a drag, or null. A change of a ghost: false
 *                      parameter and Reset clear it (DS §4.8). The decision reads the names the
 *                      reader set, so a parameter that constrain adjusts in step with them keeps
 *                      the ghost (F6.3's slice moves with its buckets). A running figure's ghost
 *                      is the runtime's ghostRows instead.
 *     pin              {values, state} while a pin stands, or null. "Pin" keeps the current
 *                      values and state; Reset clears it; it is never written to the URL.
 *     exercise         {answers, checked} on an exercise (section H)
 *     run, t, rows, ghostRows, changes, playing   on a running figure, from the runtime
 *   TP.fig.transition(from, to, {duration, draw, done, ease}) matches the rows of each array by
 *   `key`, interpolates every numeric field under d3.easeCubicInOut and calls draw(frameState)
 *   once per animation frame. A row present in one state alone is cut, out at the start and in at
 *   the end. Strings and path data take the target's value. The field `key` is never
 *   interpolated, so an integer that must stay an integer belongs in `key` or in a string. It
 *   returns {running, finish(interrupted), cancel()}, and done(interrupted) runs at the end. A new
 *   input during a transition finishes it in its target state first (DS §9 rule 1). Where chart.js
 *   is loaded, TP.fig.transition delegates to TP.chart.transition, looked up at each call because
 *   chart.js loads after site.js; the code of this file is the fallback for pages without it.
 *
 * F. THE URL, TP.state
 *   The query string holds one key per figure whose values differ from its defaults, such as
 *   ?fig-warmup=end:300,base:3x,t:340 (plan WO-I5.3). The pairs follow the order of params, then
 *   the seed, then t, a running figure's cursor when it is paused away from its default step. A
 *   number encodes as the shortest decimal text that snaps back to the same value (for a snap that
 *   is a list, the shortest text of the snapped value itself, such as 1024), a choice as its
 *   value, a set as its members joined by "+" in domain order, and a bool as 1 or 0. On load a
 *   figure decodes its key before its first render, clamps and snaps each value, and ignores
 *   unknown names and values it cannot decode. A figure restored from a key does not autoplay.
 *   Settling writes the key through history.replaceState inside a try, and Reset removes it. A
 *   change a running figure takes while it plays writes the key at once, without t, since the
 *   run settles only when it stops.
 *   Exercises, static figures, self-checks and pins write nothing. The URL holds settings and
 *   never a history.
 *   TP.state.read(id) returns the pairs of the page's URL at load for a key, or null.
 *   TP.state.write(id, text) writes a key, or removes it for null, at most once every 250 ms for
 *   all keys together; TP.state.flush() writes what is pending at once.
 *   TP.state.parse('a:1,b:2') and TP.state.format({a: '1'}) convert pairs; parseQuery,
 *   formatQuery and setQueryKey handle the query string with literal ":", "," and "+".
 *
 * G. CONTROLS, PRESETS, RESET, "DRAW AGAIN", ACTIONS AND PRINTING
 *   The controls follow the order of params, then the actions, the pin, the presets, "Draw
 *   again" and Reset (DS §6.9). A parameter with dock: true goes to div.fig-controls in the dock,
 *   and the others to div.fig-controls-more. `docked` lists the other controls the dock holds:
 *   'presets' (every preset), 'preset:<key>' (one preset, by its key), 'draw', 'reset', 'pin',
 *   'check' and action names. By default an exercise docks 'check' and 'reset', a figure with a
 *   pin docks 'pin', and nothing else is docked. Presets that are not docked stand in
 *   div.fig-controls-more in the order of presets, before "Draw again" and Reset.
 *   Presets: {name: values}. The name is the preset's label, as the prose names it. `key` names
 *   the ledger setting, by default the name in kebab case with its punctuation removed ("hold,
 *   then jump" is "hold-then-jump"). `t` is a running figure's cursor, applied as a scrub after
 *   the values. A preset may be a function of the seed returning its values (F9.3's "90th
 *   percentile"), with its key as the function's property `key`. Each preset is button.preset
 *   with aria-pressed="true" while every parameter it sets has the value it would set, compared
 *   on the snapped values' encodings, and its t equals the cursor where it has one.
 *   button.preset-link[data-figure][data-preset] in the prose applies the preset by name or
 *   key, scrolls the figure's dock into view when the panels are off screen, and leaves focus on
 *   the link. The figure's settle announces the new readout.
 *   Reset (button.reset) restores the default values and seed, clears the ghost, the pin, the
 *   figure's own state (clear) and an exercise's answers, and removes the URL key. It moves
 *   transition parameters by a transition and cuts otherwise.
 *   "Draw again" (button.draw beside span.seed, "seed 4127", inside span.btn-group) draws a new
 *   seed from TP.prng seeded by the time and cuts to it.
 *   actions: [{name, label, dock, press(fig)}] build button.btn, named with its verb. Without
 *   press, a running figure's action calls run.act(name).
 *   Printing: on beforeprint every deferred figure, recap and case is prepared, and each figure's
 *   snapshot is kept and its default state drawn at once (a running figure through
 *   run.reset({now: true})). beforeprint also adds html.tp-print (the paper's layout, DS §6.7)
 *   and opens every closed details.fig-model. On afterprint the class goes, those notes close and
 *   each figure's snapshot is restored. Neither writes the URL or speaks.
 *
 * H. EXERCISES
 *   An exercise (fig exercise) has "Check" (button.btn.check) and Reset in its dock and writes
 *   nothing to the URL. Items in the page's HTML use the markup of plan WO-I5.6 inside the
 *   figure, usually inside a div.fig-panels of the HTML: div.item[data-item] holding its option
 *   buttons (in div.options, each with data-option) and, beside them, one p.feedback[data-option]
 *   per option, hidden until "Check". A p.feedback[data-item][data-option] elsewhere in the figure
 *   also counts. A press on an option sets aria-pressed within its item and hides that item's
 *   feedback until the next "Check". "Check" shows each answered item's feedback for its option,
 *   calls contract.check, redraws, settles and moves focus to the first feedback shown. An item
 *   drawn by the script (F4.1's cells) records its answer with fig.answer(item, option). draw
 *   reads ctx.exercise = {answers: {item: option}, checked: {item: true}}, where checked holds
 *   the items committed by the last "Check" and not changed since. Reset clears both.
 *
 * I. RUNNING FIGURES: WHAT TP.fig GIVES THE RUNTIME (WO-I6)
 *   A running figure calls TP.run(fig, spec) right after TP.fig. The handshake:
 *     - TP.run calls fig.attach(run) once, before it draws. TP.fig then listens to
 *       run.on('settle') and exposes the run as TP.figures[id].run.
 *     - fig.params and fig.order give each parameter's change class, ghost and showEnd, and
 *       fig.params.seed.default the default seed.
 *     - fig.initial() returns {values, t, restored}: the values the run starts from (the URL's
 *       where the URL has the figure's key, the defaults otherwise, the seed included), the URL's
 *       cursor or null, and whether the URL had the key, in which case the run does not autoplay.
 *     - fig.dock is the dock; the runtime appends div.run-strip to it, after fig.controls.
 *     - fig.on('prepare', fn) tells the runtime when the figure first comes within one viewport
 *       of the screen, the moment for its first computation (DS §7.7 item 1).
 *     - fig.draw(state, ctx) is TP.fig's draw: the runtime calls it with its ctx (t, rows,
 *       ghostRows, changes, playing, transient, run). TP.fig adds phone, hold, pin and values
 *       (the parameters in force at the cursor), calls the contract's draw, and sets the visible
 *       readout.
 *   TP.fig calls these methods of the run:
 *     run.setMany(values, {transient})   each change of a control, a preset or "Draw again",
 *                                        with only the parameters that changed
 *     run.settle()                       after transient changes, on release
 *     run.reset()                        Reset; run.reset({now: true}) for printing and the
 *                                        tests, which shows the default state at once whatever
 *                                        the reset mode, the motion setting or pending chunks
 *     run.scrub(t)                       a preset's t, after its values
 *     run.act(name), run.finish()        actions; the test hook `setting`
 *     run.params()                       the parameters in force at the cursor, seed included
 *     run.state(), run.t(), run.rows()   for the readout, the table, quantities and the URL
 *     run.steps()                        the step of the default state for the parameters in
 *                                        force, so that t is written only away from it
 *     run.snapshot(), run.restore(snap)  printing and fig.snapshot()
 *   On each run settle TP.fig takes the values from run.params(), updates the controls and the
 *   presets' aria-pressed, sets the readout and its live twin, rebuilds the data table and
 *   writes the URL. A settle whose info carries quiet: true (the runtime's settle at load of a
 *   reduced-motion or restored figure) rebuilds the table and leaves the live twin and the URL.
 *   An autoplaying figure's table is filled from the first state drawn after prepare, and nothing
 *   is written to the URL until the run settles.
 *
 * J. TEST HOOKS
 *   TP.figures[id] = {fig, run, states, state(), set(values), preset(name), reset(),
 *   whenReady(), setting(name)}.
 *     state()     {params, seed, t, quantities, readout, pinned, answers, checked}; params
 *                 leaves the seed out, and t is null on a figure that does not run
 *     set(values) applies as a cut and settles
 *     preset(n), reset()   act as the buttons do, with their transitions
 *     whenReady() resolves after prepare, a full draw after it, and the end of any transition
 *     setting(name)   applies a ledger setting as a cut: 'default' resets, a named state of
 *                 `states` or a preset (by name or key) is applied, and 'model' or a 'seed'
 *                 setting changes nothing; a running figure then runs run.finish(). It returns
 *                 whenReady().
 *   set, preset, reset, state and setting prepare a figure that has not come into view yet.
 *
 * K. TP.ui, THE CONTROLS
 *   Every control has a visible label and a 44-px target (DS §6.8). Each builder appends to
 *   container and returns an object with el, value() and set(v).
 *   TP.ui.range(container, {id, label, min, max, step, values, log, value, format, ticks,
 *       onInput, onChange})
 *     <div class="ctl"><label for="id">Label<output for="id">0.9</output></label>
 *       <div class="range"><input type="range" id="id" aria-valuetext="0.9">
 *         <div class="range-ticks" aria-hidden="true"><span class="range-tick start">name</span>
 *       </div></div><span class="sr-only" id="id-ticks">Marked on the track: name at 1.</span></div>
 *     A slider over `values` is a log slider: the input holds the index. onInput runs on each
 *     input event (transient) and onChange on release. setTicks(ticks) redraws the ticks.
 *   TP.ui.segment(container, {id, label, options: [{value, label}], value, onChange})
 *     <div class="ctl"><span class="lbl" id="id-lbl">Label</span>
 *       <div class="seg" role="group" aria-labelledby="id-lbl">
 *         <button type="button" aria-pressed="true">…</button>…</div></div>
 *   TP.ui.toggles(container, {id, label, options, value: [], max, min, onChange})
 *     The markup of a segment, with div.toggles holding button.btn toggles (site.css lays out
 *     .toggles and .ctl:has(> .toggles), and styles .btn[aria-disabled]). The label states
 *     the maximum ("Rules shown, at most three"), added when the given label lacks "at most".
 *     At the maximum the unpressed toggles take aria-disabled="true", and at the minimum the
 *     pressed ones do.
 *   TP.ui.check(container, {id, label, checked, onChange})
 *     <div class="ctl check"><input type="checkbox" id="id"><label for="id">Label</label></div>
 *   TP.ui.preset(container, {label, onPress}) is button.preset with aria-pressed and
 *     setPressed(on). TP.ui.reset(container, {onPress}) is button.reset, "Reset".
 *   TP.ui.drawAgain(container, {id, label, seed, onPress})
 *     <span class="btn-group"><button class="draw" aria-describedby="id-seed">Draw again</button>
 *       <span class="seed" id="id-seed">seed 4127</span></span>, with setSeed(seed).
 *   TP.ui.action(container, {label, cls, onPress}) is button.btn, with setLabel(text).
 *   TP.ui.table(details, columns, rows, caption) fills a details.fig-table's div.scroll.
 *   TP.ui.content(parent, blocks) builds text blocks from data (see its comment).
 *
 * L. PAGE COMPONENTS OUTSIDE FIGURES (DS §13)
 *   site.js rewrites none of these, and never builds a hover definition: a[data-concept] with
 *   its title, span.gloss (visible at every width, the browser's own link behaviour), p.lede,
 *   p.assumes, p.assumes-section, p.next-use, section.retrieval with its details.retrieve,
 *   details.worked, the "What to do" list with data-step and data-home, section.task's
 *   ul.standard and div.product, section#limits, and the contents page's outline, questions and
 *   symptoms. Their appearance is the stylesheet's. site.js adds behaviour to three components,
 *   and records nothing anywhere (no storage, no URL):
 *   div.self-check (DS §13.5, plan WO-I5.6)
 *     - One choice: div.options > button[data-option] (or button.clause[data-option] in p.task
 *       for choose-the-clause). A press sets aria-pressed on it alone and commits.
 *     - Several items: div.items > div.item[data-item] > div.options > button[data-option], and
 *       button.btn.check in div.items. A press sets aria-pressed within its item; "Check" commits
 *       every item.
 *     - Clauses as items (SC-A): button.clause[data-item] in p.task, each a toggle with
 *       aria-pressed, and button.btn.check after the task. "Check" commits.
 *     - On commit div.reveal loses hidden and takes focus (tabindex="-1", no role, no live
 *       region). It shows, per item, the p.feedback[data-item][data-option] of the option chosen
 *       (a feedback without data-item belongs to every item, and one without data-option to
 *       every option) and hides the rest. For clauses, it shows p.feedback[data-item] where the
 *       clause is pressed or the feedback carries data-overclaims. p.criterion and p.next stay
 *       shown. Pressing another option moves the press, replaces the feedback and focuses the
 *       reveal again, and a change to an item after "Check" hides its feedback until the next.
 *   div.rule-prompt (DS §13.6): a question, two or three buttons with aria-pressed, and p.reveal
 *     with hidden, which a press shows and focuses. The reveal is the same for every button. The
 *     button that states the rule carries data-right. From the first press on, it holds
 *     span.rule-mark "(the rule)", a text mark with no hue (DS §13.5), so that the reader sees
 *     which option the reveal's rule is. A prompt with no button[data-right], or several, logs an
 *     error.
 *   button.copy (DS §13.9): copies the text of the pre.template before it (or of the one named
 *     by data-template, or of the one in its section.task) to the clipboard. On success the label
 *     reads "Copied" for 2 s and a polite live region after the button says "Template copied".
 *     Where the browser refuses, the template's text is selected and the live region says so.
 *   span[data-num] whose text begins "10^" (the ledger's exp10dec form, such as "10^−1.5"): at
 *     load its text is kept in data-print and it is drawn as 10<sup>−1.5</sup>. The data-num
 *     checks compare the ledger's text with data-print where it is present, else with the text.
 *
 * M. RECAPS, CASES AND TP.whenNear
 *   TP.recaps['F2.1:summary'] = function (el, setting) {} registers a recap function. For each
 *   figure.fig.recap[data-recap] site.js calls it once, when the recap comes within one viewport
 *   of the screen, with the recap's div.recap-body and its data-setting as an object of strings
 *   ("rules=nesterov+adam&bound=1" gives {rules: 'nesterov+adam', bound: '1'}; split a list on
 *   "+"). A missing function logs a console error. A drawn recap carries data-drawn="true".
 *   At init, before any draw, the caption of every recap ends with the fixed sentence
 *   TP.recaps.SYNTHETIC, "The data drawn here are synthetic, from one of the site's toys.", in a
 *   span.recap-synthetic, unless the recap carries data-toy="false" (DS §3.4).
 *   TP.whenNear(el, fn) calls fn once when el comes within one viewport height of the screen,
 *   through the one IntersectionObserver the figures and recaps share (cases.js uses it), and at
 *   once before printing.
 *
 * N. THE PAGE CHROME KEPT FROM VERSION 1
 *   The header (skip link, brand, page position, Contents, Sources, Theme), the pager, source
 *   markers on [data-src], citations (cite[data-ref]) with the page's sorted reference list
 *   (ol#reflist) or, on the reference page, every entry of TP.refs in version 1's order
 *   (ol#allrefs, each li#ref-{key}), margin notes (span.sidenote) laid out beside their markers, KaTeX (TP.renderMath, which
 *   admits \htmlClass alone as trusted), figure numbering ("Figure N" for figure.fig outside
 *   recaps, "Playbook Figure 7a" for data-playbook-fig) and a.figref. The header's height is
 *   written to --header-h, and scroll-padding-top is that height plus 12 px, plus --dock-h, the
 *   height of a dock stuck under the header in the phone layout (DS §6.8). TP.motion.reduced()
 *   follows the reduced-motion query, and TP.motion.on(fn) hears its changes.
 *   Standards: the subobjective numbers of ul.standard's items leave the text and stay in the
 *   item's data-item (TP.standards.strip, which the generator applies to the reference page's copy).
 *   Wide scroll containers: a div.scroll or a display equation (.katex-display) outside the
 *   figures whose content is wider than its box takes tabindex="0", role="region" and an
 *   aria-label (a table's caption, else its section's heading, else its first header cell, or
 *   "Equation"), so that a keyboard can
 *   scroll it in every browser and a screen reader names it; the three go when it fits again
 *   (the accessibility pass, finding Z6). They are set on load and after each layout change.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  /* ======================================================================================
     1. The parts that need no DOM: the parameter schema, the URL text, presets and the
        interpolation of transitions. tests/lib/site.test.js loads them in Node.
     ====================================================================================== */

  var NAME_RE = /^[a-z0-9-]+$/;
  var NUMBER_RE = /^-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i;
  var TYPES = { number: 1, choice: 1, set: 1, bool: 1 };
  var SEED_MAX = 4294967295;
  var hasOwn = Object.prototype.hasOwnProperty;

  function isFn(f) { return typeof f === 'function'; }
  function finite(v) { return typeof v === 'number' && isFinite(v); }
  function copy(o) {
    var out = {};
    if (o) for (var k in o) if (hasOwn.call(o, k)) out[k] = o[k];
    return out;
  }
  function inferType(v) {
    if (typeof v === 'boolean') return 'bool';
    if (Array.isArray(v)) return 'set';
    if (typeof v === 'number') return 'number';
    return 'choice';
  }
  /* The number of decimals a step or an origin carries, so that snapping to 0.05 gives 0.15
     and not 0.15000000000000002. */
  function decimalsOf(x) {
    var s = String(Math.abs(x)), m = /e-(\d+)$/.exec(s), d = 0;
    if (m) { d = +m[1]; s = s.replace(/e-\d+$/, ''); }
    var dot = s.indexOf('.');
    return Math.min(15, d + (dot < 0 ? 0 : s.length - dot - 1));
  }
  /* The position of v in list: identical, or equal as text, so that "24" finds 24. */
  function indexIn(list, v) {
    var i;
    for (i = 0; i < list.length; i++) if (list[i] === v) return i;
    for (i = 0; i < list.length; i++) if (String(list[i]) === String(v)) return i;
    return -1;
  }
  function nearest(list, v, log) {
    var best = list[0], bd = Infinity;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      var dist = log && s > 0 && v > 0 ? Math.abs(Math.log(s) - Math.log(v)) : Math.abs(s - v);
      if (dist < bd) { bd = dist; best = s; }
    }
    return best;
  }

  /* ---------- the parameter schema (DS §11.2, plan WO-I5.1) ---------- */

  function defaultControl(e) {
    if (e.type === 'number') return e.handle ? 'handle' : 'slider';
    if (e.type === 'choice') return 'segment';
    if (e.type === 'set') return 'toggles';
    return 'check';
  }
  function domainOf(e, values) { return isFn(e.domain) ? e.domain(values || {}) : e.domain; }
  function members(e, values) {
    var d = domainOf(e, values);
    if (Array.isArray(d)) return d;
    return (d && d.members) || [];
  }
  function setMax(e, values) {
    if (e.max != null) return e.max;
    var d = domainOf(e, values);
    if (d && !Array.isArray(d) && d.max != null) return d.max;
    return members(e, values).length;
  }

  /* Normalizes a contract's params into entries carrying every field this file reads.
     opts: {kind, seed, report(message)}. Returns {entries: {name: entry}, order: [names]}, with
     the seed last. */
  function normalize(params, opts) {
    opts = opts || {};
    var report = opts.report || function () {};
    var kind = opts.kind || 'fixed', running = kind === 'running';
    var classes = running ? ['live', 'restart', 'redraw'] : ['transition', 'cut'];
    var entries = {}, order = [], src = params || {};
    Object.keys(src).forEach(function (name) {
      if (name === 'seed') return;
      if (name === 't') { report('uses the name "t", which is reserved for the cursor'); return; }
      if (!NAME_RE.test(name)) report('has a parameter "' + name + '" whose name is not lower-case letters, digits and hyphens');
      var e = copy(src[name]);
      e.name = name;
      e.type = e.type || inferType(e['default']);
      if (!TYPES[e.type]) { report('gives ' + name + ' the unknown type "' + e.type + '"'); e.type = inferType(e['default']); }
      if (e.type === 'number') {
        if (Array.isArray(e.snap)) e.snap = e.snap.slice().sort(function (a, b) { return a - b; });
        else if (!(finite(e.snap) && e.snap > 0)) e.snap = null;
        if (!e.domain && Array.isArray(e.snap) && e.snap.length) e.domain = [e.snap[0], e.snap[e.snap.length - 1]];
        if (e.snapOrigin == null) e.snapOrigin = Array.isArray(e.domain) ? e.domain[0] : 0;
        e.scale = e.scale === 'log' ? 'log' : 'linear';
      }
      e.change = e.change || (running ? 'restart' : 'cut');
      if (classes.indexOf(e.change) < 0) report('gives ' + name + ' the change class "' + e.change + '", which a ' + kind + ' figure does not use');
      e.ghost = !!e.ghost;
      e.control = e.control || defaultControl(e);
      entries[name] = e;
      order.push(name);
    });
    var given = src.seed || null;
    var seedDefault = opts.seed != null ? opts.seed : (given ? given['default'] : null);
    if (seedDefault != null) {
      var s = copy(given);
      s.name = 'seed'; s.type = 'number'; s['default'] = seedDefault;
      s.domain = [1, SEED_MAX]; s.snap = 1; s.snapOrigin = 0; s.scale = 'linear';
      s.change = s.change || (running ? 'restart' : 'cut');
      s.ghost = false; s.control = 'draw'; s.label = s.label || 'Draw again';
      entries.seed = s;
      order.push('seed');
    }
    order.forEach(function (name) {
      var e = entries[name];
      if ((e.type === 'choice' || e.type === 'set') && !isFn(e.domain) && !e.encode) {
        members(e, {}).forEach(function (v) {
          if (!NAME_RE.test(String(v))) report('gives ' + name + ' the value "' + v + '", which is not lower-case letters, digits and hyphens');
        });
      }
    });
    return { entries: entries, order: order };
  }

  function snapStep(v, step, origin, lo, hi) {
    var d = Math.max(decimalsOf(step), decimalsOf(origin));
    var k = Math.round((v - origin) / step), r = +(origin + k * step).toFixed(d);
    if (r > hi + step * 1e-9) r = +(origin + (k - 1) * step).toFixed(d);
    else if (r < lo - step * 1e-9) r = +(origin + (k + 1) * step).toFixed(d);
    return r;
  }
  /* A number snapped to its entry within [lo, hi]. */
  function snapNumber(e, v, lo, hi) {
    if (Array.isArray(e.snap) && e.snap.length) {
      /* a value of the list inside the bounds is its own nearest element: return it without
         filtering the list (frame cost, Batch 5), from a set kept per list */
      if (v >= lo && v <= hi) {
        if (e._snapSetOf !== e.snap) { e._snapSetOf = e.snap; e._snapSet = new Set(e.snap); }
        if (e._snapSet.has(v)) return v;
      }
      var tol = 1e-9 * Math.max(Math.abs(lo), Math.abs(hi), 1e-300);
      var list = e.snap.filter(function (s) { return s >= lo - tol && s <= hi + tol; });
      return nearest(list.length ? list : e.snap, v, e.scale === 'log');
    }
    if (e.snap) return snapStep(v, e.snap, e.snapOrigin || 0, lo, hi);
    return v;
  }
  function snapOnly(e, v) { return snapNumber(e, v, -Infinity, Infinity); }

  /* The value of entry e for v, clamped to its domain at the values given and snapped, or
     undefined when v is not a value of the entry's type (a choice outside its domain, a set
     with fewer than its minimum). */
  function clampValue(e, v, values) {
    switch (e.type) {
      case 'number': {
        if (typeof v === 'string' && NUMBER_RE.test(v)) v = +v;
        if (!finite(v)) return undefined;
        var d = domainOf(e, values), lo = -Infinity, hi = Infinity;
        if (Array.isArray(d) && d.length >= 2 && finite(d[0]) && finite(d[1])) {
          lo = Math.min(d[0], d[1]); hi = Math.max(d[0], d[1]);
        }
        return snapNumber(e, Math.min(hi, Math.max(lo, v)), lo, hi);
      }
      case 'choice': {
        var list = members(e, values), i = indexIn(list, v);
        return i < 0 ? undefined : list[i];
      }
      case 'set': {
        if (!Array.isArray(v)) return undefined;
        var all = members(e, values), out = [];
        for (var j = 0; j < all.length; j++) if (indexIn(v, all[j]) >= 0) out.push(all[j]);
        var max = setMax(e, values);
        if (out.length > max) out = out.slice(0, max);
        return out.length < (e.min || 0) ? undefined : out;
      }
      case 'bool':
        if (v === true || v === 1 || v === '1') return true;
        if (v === false || v === 0 || v === '0') return false;
        return undefined;
    }
    return undefined;
  }
  /* The value an entry falls back to when its value leaves its domain: the default where it is
     valid, else the first member of the domain. */
  function fallback(e, values) {
    var v = clampValue(e, e['default'], values);
    if (v !== undefined) return v;
    if (e.type === 'choice') return members(e, values)[0];
    if (e.type === 'set') return members(e, values).slice(0, e.min || 0);
    if (e.type === 'bool') return false;
    return e['default'];
  }
  /* Clamps every value in the schema's order, so that a domain function sees the parameters
     before it already clamped. Returns a new object. */
  function resolveAll(schema, values) {
    var out = copy(values);
    schema.order.forEach(function (name) {
      var e = schema.entries[name], c = clampValue(e, out[name], out);
      out[name] = c === undefined ? fallback(e, out) : c;
    });
    return out;
  }

  /* The URL text of a value (plan WO-I5.3). */
  function encodeValue(e, v) {
    if (isFn(e.encode)) return String(e.encode(v));
    switch (e.type) {
      case 'number': {
        if (!finite(v) || !e.snap) return String(v);
        var target = snapOnly(e, v);
        if (Array.isArray(e.snap) && finite(target)) {
          /* a list of values: the snapped value's own shortest text, such as 1024 for 1,024, and
             not the shortest text that snaps to it (1000) */
          for (var q = 1; q <= 17; q++) {
            var u = String(Number(target.toPrecision(q)));
            if (Number(u) === target) return u;
          }
          return String(target);
        }
        for (var p = 1; p <= 17; p++) {
          var t = String(Number(v.toPrecision(p)));
          if (snapOnly(e, Number(t)) === target) return t;
        }
        return String(v);
      }
      case 'set': return (v || []).map(String).join('+');
      case 'bool': return v ? '1' : '0';
      default: return String(v);
    }
  }
  /* The value of a URL text, clamped and snapped, or undefined when it cannot be decoded. */
  function decodeValue(e, text, values) {
    var v, i;
    text = String(text);
    if (isFn(e.decode)) {
      try { v = e.decode(text); } catch (err) { return undefined; }
    } else {
      switch (e.type) {
        case 'number':
          if (!NUMBER_RE.test(text)) return undefined;
          v = Number(text);
          break;
        case 'choice': {
          var list = members(e, values);
          for (i = 0; i < list.length; i++) if (encodeValue(e, list[i]) === text) { v = list[i]; break; }
          if (v === undefined) return undefined;
          break;
        }
        case 'set': {
          v = [];
          if (text === '') break;
          var parts = text.split('+'), all = members(e, values);
          for (i = 0; i < parts.length; i++) {
            var k = -1;
            for (var j = 0; j < all.length; j++) if (String(all[j]) === parts[i]) { k = j; break; }
            if (k < 0) return undefined;
            v.push(all[k]);
          }
          break;
        }
        case 'bool':
          if (text === '1') v = true; else if (text === '0') v = false; else return undefined;
          break;
      }
    }
    return clampValue(e, v, values);
  }
  function sameValue(e, a, b) { return encodeValue(e, a) === encodeValue(e, b); }
  /* The pairs of the values that differ from the defaults, in the schema's order. */
  function encodeValues(schema, values, defaults) {
    var map = {};
    schema.order.forEach(function (name) {
      var e = schema.entries[name];
      if (!sameValue(e, values[name], defaults[name])) map[name] = encodeValue(e, values[name]);
    });
    return map;
  }
  /* The values a map of pairs sets over base, each decoded, clamped and snapped; unknown names
     and undecodable values are ignored. */
  function decodeValues(schema, map, base) {
    var values = copy(base);
    schema.order.forEach(function (name) {
      if (!map || !hasOwn.call(map, name)) return;
      var v = decodeValue(schema.entries[name], map[name], values);
      if (v !== undefined) values[name] = v;
    });
    return resolveAll(schema, values);
  }
  function decodeT(map) {
    return map && typeof map.t === 'string' && /^\d+$/.test(map.t) ? +map.t : null;
  }

  /* ---------- the URL text (plan WO-I5.3) ---------- */

  function parsePairs(text) {
    var map = {};
    if (!text) return map;
    String(text).split(',').forEach(function (pair) {
      var i = pair.indexOf(':');
      if (i <= 0) return;
      var name = pair.slice(0, i);
      if (NAME_RE.test(name)) map[name] = pair.slice(i + 1);
    });
    return map;
  }
  function formatPairs(map) {
    return Object.keys(map || {}).map(function (k) { return k + ':' + map[k]; }).join(',');
  }
  function safeDecode(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }
  /* Query strings keep ":", "," and "+" literal and read "+" as a plus, never as a space. */
  function parseQuery(search) {
    var s = String(search || '').replace(/^\?/, '');
    if (!s) return [];
    return s.split('&').filter(Boolean).map(function (part) {
      var i = part.indexOf('=');
      return [safeDecode(i < 0 ? part : part.slice(0, i)), safeDecode(i < 0 ? '' : part.slice(i + 1))];
    });
  }
  function escapeQuery(s) {
    return String(s).replace(/[^A-Za-z0-9\-._~:,+]/g, function (c) {
      try { return encodeURIComponent(c); } catch (e) { return ''; }
    });
  }
  function formatQuery(pairs) {
    if (!pairs.length) return '';
    return '?' + pairs.map(function (p) { return escapeQuery(p[0]) + '=' + escapeQuery(p[1]); }).join('&');
  }
  /* The query string with key set to value, or removed for null or "", keeping every other
     key in its place. */
  function setQueryKey(search, key, value) {
    var remove = value == null || value === '', found = false, out = [];
    parseQuery(search).forEach(function (p) {
      if (p[0] !== key) { out.push(p); return; }
      if (found || remove) return;
      found = true;
      out.push([key, String(value)]);
    });
    if (!found && !remove) out.push([key, String(value)]);
    return formatQuery(out);
  }

  /* ---------- presets (plan WO-I5.4) ---------- */

  function kebab(name) {
    return String(name).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function presetList(presets) {
    return Object.keys(presets || {}).map(function (name) {
      var def = presets[name];
      return { name: name, key: (def && def.key) || kebab(name), def: def };
    });
  }
  function findPreset(list, which) {
    for (var i = 0; i < list.length; i++) if (list[i].name === which || list[i].key === which) return list[i];
    return null;
  }
  /* The values a preset sets, and its cursor t or null. A function preset takes the seed. */
  function presetValues(entry, seed) {
    var def = isFn(entry.def) ? entry.def(seed) : entry.def;
    var values = {}, t = null;
    Object.keys(def || {}).forEach(function (k) {
      if (k === 'key') return;
      if (k === 't') { t = def.t; return; }
      values[k] = def[k];
    });
    return { values: values, t: t };
  }
  /* True while every parameter a preset sets has the snapped value the preset would give it,
     compared as URL text, and its t, where it has one, equals the cursor t. */
  function presetMatches(schema, entry, values, t) {
    var r = presetValues(entry, values.seed), would = copy(values), k;
    for (k in r.values) {
      if (!schema.entries[k]) return false;
      would[k] = r.values[k];
    }
    would = resolveAll(schema, would);
    for (k in r.values) if (!sameValue(schema.entries[k], would[k], values[k])) return false;
    return r.t == null || r.t === t;
  }

  /* ---------- the interpolation of transitions (DS §9 rule 1, plan WO-I5.2) ---------- */

  function isRows(list) {
    if (!list.length) return false;
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (!r || typeof r !== 'object' || !('key' in r)) return false;
    }
    return true;
  }
  /* The state at fraction u between a and b: numbers linearly, arrays of rows matched by key
     (a row in one state alone is left out), other arrays and typed arrays element by element
     when their lengths agree, plain objects field by field. Everything else, the field `key`
     included, takes b's value. */
  function interpolate(a, b, u) {
    if (typeof b === 'number') return finite(a) && finite(b) ? a + (b - a) * u : b;
    if (b === null || typeof b !== 'object') return b;
    if (ArrayBuffer.isView(b)) {
      if (typeof b.length !== 'number' || !a || a.length !== b.length) return b;
      var typed = new b.constructor(b.length);
      for (var i = 0; i < b.length; i++) typed[i] = finite(a[i]) && finite(b[i]) ? a[i] + (b[i] - a[i]) * u : b[i];
      return typed;
    }
    if (Array.isArray(b)) {
      if (!Array.isArray(a)) return b;
      if (isRows(b) && (!a.length || isRows(a))) {
        var byKey = new Map();
        a.forEach(function (r) { byKey.set(r.key, r); });
        var rows = [];
        b.forEach(function (r) { if (byKey.has(r.key)) rows.push(interpolate(byKey.get(r.key), r, u)); });
        return rows;
      }
      if (a.length !== b.length) return b;
      return b.map(function (x, j) { return interpolate(a[j], x, u); });
    }
    /* a plain object's prototype is the Object prototype of some realm, whose own prototype is null */
    var proto = Object.getPrototypeOf(b);
    if ((proto !== null && Object.getPrototypeOf(proto) !== null) || !a || typeof a !== 'object' || Array.isArray(a)) return b;
    var o = {};
    for (var k in b) {
      if (!hasOwn.call(b, k)) continue;
      o[k] = k === 'key' || !(k in a) ? b[k] : interpolate(a[k], b[k], u);
    }
    return o;
  }
  /* d3.easeCubicInOut, for pages that load no d3 */
  function easeCubicInOut(t) { return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2; }

  /* ---------- the standards' subobjective numbers ----------
     A standard's item names the subobjective it checks by number before its link, as
     "(1.1, which Starting a project teaches under <a>Architecture</a>)" or "(3.7, 3.8 and 3.9,
     <a>...</a>)". The numbers are the learning guide's and mean nothing to the reader, so the text
     drops them and the item keeps them in data-item (the build log's Batch 7 rulings). strip takes
     the text directly before a link and returns {text, items}: "(1.1, which P teaches under " becomes
     "(taught on P, under ", "(3.1, which P teaches with the roles under " becomes "(taught on P,
     with the roles, under ", "(3.7, 3.8 and 3.9, " becomes "(", and "from 3.6, which P teaches
     under " becomes "taught on P, under ". Text without such a number comes back unchanged.
     tests/lib/write-generated.js applies the same function to the reference page's copies. */
  var SUB_NUMS = '\\d+\\.\\d+(?:(?:,\\s+|\\s+and\\s+)\\d+\\.\\d+)*';
  var SUB_TEACH = new RegExp('(\\(|\\bfrom\\s+)(' + SUB_NUMS + '),\\s+which\\s+([^()]+?)\\s+teaches(\\s+[^()]*?)?\\s+under\\s*$');
  var SUB_BARE = new RegExp('\\((' + SUB_NUMS + '),\\s*$');
  function stripSubobjectives(text) {
    var m = SUB_TEACH.exec(text), nums = null, out = text;
    if (m) {
      nums = m[2];
      out = text.slice(0, m.index) + (m[1] === '(' ? '(' : '') + 'taught on ' + m[3] + (m[4] ? ',' + m[4] : '') + ', under ';
    } else if ((m = SUB_BARE.exec(text))) {
      nums = m[1];
      out = text.slice(0, m.index) + '(';
    }
    return { text: out, items: nums ? nums.split(/,\s+|\s+and\s+/) : [] };
  }

  /* ---------- exports of the DOM-free part ---------- */

  var figImpl = null;
  TP.fig = function (element, contract) {
    if (!figImpl) { if (global.console) global.console.error('TP.fig: no document'); return null; }
    return figImpl(element, contract);
  };
  TP.fig.schema = {
    normalize: normalize, clamp: clampValue, fallback: fallback, resolve: resolveAll,
    encode: encodeValue, decode: decodeValue, same: sameValue,
    encodeValues: encodeValues, decodeValues: decodeValues, decodeT: decodeT, members: members
  };
  TP.fig.presets = { list: presetList, find: findPreset, values: presetValues, matches: presetMatches, key: kebab };
  TP.fig.interpolate = interpolate;
  TP.fig.ease = easeCubicInOut;
  TP.state = TP.state || {};
  TP.state.parse = parsePairs;
  TP.state.format = formatPairs;
  TP.state.parseQuery = parseQuery;
  TP.state.formatQuery = formatQuery;
  TP.state.setQueryKey = setQueryKey;
  TP.recaps = TP.recaps || {};
  TP.standards = { strip: stripSubobjectives };

  var doc = global.document;
  if (!doc) return;

  /* ======================================================================================
     2. The page chrome kept from version 1: storage, paths, theme, sources, header, pager,
        source marks, citations, margin notes, math, figure numbering and callouts
     ====================================================================================== */

  var html = doc.documentElement;
  function store(key, value) {
    try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch (e) {}
  }
  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function el(tag, attrs, text) {
    var node = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null) return;
      if (k === 'class') node.className = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    if (Array.isArray(text)) {
      text.forEach(function (child) {
        if (child == null) return;
        if (typeof child === 'string' || typeof child === 'number') {
          node.appendChild(doc.createTextNode(String(child)));
        } else if (child.nodeType) {
          node.appendChild(child);
        }
      });
    } else if (text != null) {
      node.textContent = text;
    }
    return node;
  }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function listenMQ(q, fn) {
    if (!q) return;
    if (q.addEventListener) q.addEventListener('change', fn);
    else if (q.addListener) q.addListener(fn);
  }

  /* ---------- paths ---------- */
  var here = doc.body.getAttribute('data-page') || '';
  var siteRoot = doc.body.getAttribute('data-root') || '';   /* "" on index.html, "../" inside pages/ */
  function link(file) { return siteRoot + file; }

  /* ---------- theme ---------- */
  var THEMES = ['auto', 'light', 'dark'];
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') html.setAttribute('data-theme', t);
    else html.removeAttribute('data-theme');
  }
  var theme = read('tp-theme') || 'auto';
  applyTheme(theme);

  /* ---------- sources ---------- */
  var sources = read('tp-sources') === 'on' ? 'on' : 'off';
  html.setAttribute('data-sources', sources);

  /* ---------- motion (DS §9 rule 7) ---------- */
  var motionQuery = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var motionFns = [];
  TP.motion = {
    reduced: function () { return !!(motionQuery && motionQuery.matches); },
    on: function (fn) { if (isFn(fn)) motionFns.push(fn); }
  };
  listenMQ(motionQuery, function () {
    var r = TP.motion.reduced();
    motionFns.forEach(function (fn) { try { fn(r); } catch (e) { global.console.error(e); } });
  });

  /* the phone layout (DS §3.2) */
  var phoneQuery = global.matchMedia ? global.matchMedia('(max-width: 639px)') : null;
  function isPhone() { return !!(phoneQuery && phoneQuery.matches); }
  /* A viewport under 200 px wide is transient (Chromium reports 1 × 1 while it captures an
     element beyond the viewport), and no relayout follows it. */
  function degenerateViewport() { return (global.innerWidth || 0) > 0 && global.innerWidth < 200; }

  /* ---------- header, and the scroll padding under it (DS §6.8) ---------- */
  var headerEl = null, headerH = 0, dockH = -1, lastPad = '';
  /* The height of a dock stuck under the header, in the phone layout alone: a dock whose top
     sits at the header's bottom while its figure runs above and below it. */
  function stuckDockHeight() {
    if (!isPhone()) return 0;
    var docks = doc.querySelectorAll('figure.fig > .fig-dock');
    for (var i = 0; i < docks.length; i++) {
      var r = docks[i].getBoundingClientRect();
      if (!r.height || Math.abs(r.top - headerH) > 1.5) continue;
      var f = docks[i].parentNode.getBoundingClientRect();
      if (f.top < r.top - 1 && f.bottom > r.bottom + 1) return Math.ceil(r.height);
    }
    return 0;
  }
  function updateScrollPadding() {
    var h = stuckDockHeight();
    if (h !== dockH) { dockH = h; html.style.setProperty('--dock-h', h + 'px'); }
    var pad = (headerH + 12 + dockH) + 'px';
    if (pad !== lastPad) { lastPad = pad; html.style.scrollPaddingTop = pad; }
  }
  function measureHeader() {
    var h = headerEl ? Math.ceil(headerEl.getBoundingClientRect().height) : 0;
    if (h !== headerH) { headerH = h; html.style.setProperty('--header-h', h + 'px'); }
    updateScrollPadding();
  }
  var padRaf = 0;
  function schedulePadding() {
    if (padRaf) return;
    padRaf = global.requestAnimationFrame(function () { padRaf = 0; updateScrollPadding(); });
  }

  function buildHeader() {
    var header = doc.querySelector('.site-header');
    if (!header) return;
    headerEl = header;
    var main = doc.querySelector('main');
    if (main) {
      if (!main.id) main.id = 'content';
      main.setAttribute('tabindex', '-1');
      header.appendChild(el('a', { class: 'skip', href: '#' + main.id }, 'Skip to content'));
    }
    var idx = -1;
    (TP.pages || []).forEach(function (p, i) { if (p.file === here) idx = i; });
    var page = idx >= 0 ? TP.pages[idx] : null;
    var inSiteHub = !!(global.location && global.location.pathname && global.location.pathname.indexOf('/writing/') >= 0);
    var homeHref = inSiteHub ? link('../../index.html') : 'https://joshspeagle.com';
    var writingHref = inSiteHub ? link('../../writing.html') : 'https://joshspeagle.com/writing.html';
    var brandGroup = el('div', { class: 'header-brand-group' });
    var ownerLink = el('a', { class: 'brand-crumb brand-home', href: homeHref, title: 'Josh Speagle' });
    var svgNS = 'http://www.w3.org/2000/svg';
    var mark = doc.createElementNS(svgNS, 'svg');
    mark.setAttribute('class', 'brand-mark');
    mark.setAttribute('viewBox', '0 0 24 24');
    mark.setAttribute('aria-hidden', 'true');
    var path1 = doc.createElementNS(svgNS, 'path');
    path1.setAttribute('fill', 'currentColor');
    path1.setAttribute('d', 'M12 1.2 L14.1 9.9 L22.8 12 L14.1 14.1 L12 22.8 L9.9 14.1 L1.2 12 L9.9 9.9 Z');
    mark.appendChild(path1);
    ownerLink.appendChild(mark);
    ownerLink.appendChild(el('span', { class: 'brand-owner' }, 'Josh Speagle'));
    brandGroup.appendChild(ownerLink);
    brandGroup.appendChild(el('span', { class: 'brand-sep', 'aria-hidden': 'true' }, '/'));
    brandGroup.appendChild(el('a', { class: 'brand-crumb brand-writing', href: writingHref, title: 'Writing on joshspeagle.com' }, 'Writing'));
    brandGroup.appendChild(el('span', { class: 'brand-sep', 'aria-hidden': 'true' }, '/'));
    var brand = el('a', { class: 'brand', href: link('index.html') });
    brand.appendChild(el('span', { class: 'brand-series' }, 'DL Tuning Playbook'));
    brandGroup.appendChild(brand);

    var numbered = (TP.pages || []).filter(function (p) { return !p.unnumbered; });
    if (page && !page.unnumbered) {
      var partNum = numbered.indexOf(page) + 1;
      var padNum = partNum < 10 ? '0' + partNum : String(partNum);
      var padTot = numbered.length < 10 ? '0' + numbered.length : String(numbered.length);
      brandGroup.appendChild(el('span', { class: 'where' }, 'Part ' + partNum + ' of ' + numbered.length));
    } else if (here === 'design-sheet.html') {
      brandGroup.appendChild(el('span', { class: 'where' }, 'Design sheet'));
    }
    header.appendChild(brandGroup);

    var nav = el('nav', { 'aria-label': 'Series navigation', id: 'site-nav', class: 'site-nav' });
    nav.appendChild(el('a', {
      class: 'btn small' + (here === 'index.html' ? ' is-active' : ''),
      href: link('index.html')
    }, 'Contents'));

    var drop = el('details', { class: 'nav-dropdown' });
    var sum = el('summary', { class: 'btn small' }, 'Posts \u25be');
    drop.appendChild(sum);
    var menu = el('div', { class: 'nav-menu' });
    (TP.pages || []).forEach(function (p) {
      var a = el('a', {
        class: 'nav-menu-item' + (p.file === here ? ' is-current active' : ''),
        href: link(p.file)
      });
      if (p.file === here) a.setAttribute('aria-current', 'page');
      var kickerText = 'Overview';
      if (!p.unnumbered) {
        kickerText = String(numbered.indexOf(p) + 1);
      } else if (p.file.indexOf('reference') >= 0) {
        kickerText = 'Ref';
      }
      var cleanTitle = p.title.replace(/^Post\s+\d+\s+[\u2014\-:]\s*/i, '');
      a.appendChild(el('span', { class: 'nav-menu-kicker' }, kickerText));
      a.appendChild(el('span', { class: 'nav-menu-title' }, cleanTitle));
      menu.appendChild(a);
    });
    var dsLink = el('a', { class: 'nav-menu-item nav-menu-aux' + (here === 'design-sheet.html' ? ' is-current' : ''), href: link('design-sheet.html') });
    dsLink.appendChild(el('span', { class: 'nav-menu-kicker' }, '\u2726'));
    dsLink.appendChild(el('span', { class: 'nav-menu-title' }, 'Design sheet (components and colors)'));
    menu.appendChild(dsLink);
    var wrLink = el('a', { class: 'nav-menu-item nav-menu-aux', href: writingHref });
    wrLink.appendChild(el('span', { class: 'nav-menu-kicker' }, '\u2190'));
    wrLink.appendChild(el('span', { class: 'nav-menu-title' }, 'All writing on joshspeagle.com'));
    menu.appendChild(wrLink);
    drop.appendChild(menu);
    if (inSiteHub) {
      doc.querySelectorAll('.site-footer a[href="https://joshspeagle.com"]').forEach(function (a) { a.href = homeHref; });
      doc.querySelectorAll('.site-footer a[href="https://joshspeagle.com/writing.html"]').forEach(function (a) { a.href = writingHref; });
    }
    doc.addEventListener('click', function (ev) {
      if (drop.open && !drop.contains(ev.target)) drop.open = false;
    });
    doc.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && drop.open) { drop.open = false; sum.focus(); }
    });
    nav.appendChild(drop);

    nav.appendChild(el('a', {
      class: 'btn small' + (here === 'pages/reference.html' ? ' is-active' : ''),
      href: link('pages/reference.html')
    }, 'Reference'));
    var th = el('button', { class: 'btn small theme-btn', type: 'button' });
    function labelTheme() {
      var icon = theme === 'light' ? '\u2600' : (theme === 'dark' ? '\u263e' : '\u25d0');
      var name = theme === 'auto' ? 'automatic' : theme;
      th.textContent = '';
      th.appendChild(el('span', { class: 'theme-icon', 'aria-hidden': 'true' }, icon));
      th.appendChild(el('span', { class: 'theme-name' }, 'Theme: ' + name));
      th.setAttribute('aria-label', 'Color theme: ' + name + '. Click to change.');
      th.title = 'Color theme: ' + name;
    }
    labelTheme();
    th.addEventListener('click', function () {
      theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
      applyTheme(theme);
      labelTheme();
      store('tp-theme', theme === 'auto' ? null : theme);
      doc.dispatchEvent(new CustomEvent('tp:theme', { detail: theme }));
    });
    nav.appendChild(th);

    /* phones: the nav folds behind a Menu button, and the header slides away while reading */
    var toggle = el('button', { type: 'button', class: 'btn small nav-toggle', 'aria-expanded': 'false', 'aria-controls': 'site-nav' }, 'Menu');
    toggle.addEventListener('click', function () {
      var open = !header.classList.contains('nav-open');
      header.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      measureHeader();
    });
    header.appendChild(toggle);
    var lastY = global.scrollY || 0;
    global.addEventListener('scroll', function () {
      var y = global.scrollY || 0;
      var hide = isPhone() && y > lastY + 4 && y > 160 && !header.classList.contains('nav-open');
      var show = y < lastY - 4 || y < 160;
      if (hide) { header.classList.add('is-tucked'); doc.documentElement.classList.add('header-tucked'); }
      else if (show) { header.classList.remove('is-tucked'); doc.documentElement.classList.remove('header-tucked'); }
      lastY = y;
    }, { passive: true });
    header.appendChild(nav);
    measureHeader();
    if (global.ResizeObserver) new ResizeObserver(measureHeader).observe(header);
  }

  /* ---------- pager ---------- */
  function buildPager() {
    var pager = doc.querySelector('.pager');
    if (!pager || !TP.pages) return;
    var idx = -1;
    TP.pages.forEach(function (p, i) { if (p.file === here) idx = i; });
    if (idx < 0) return;
    var prev = TP.pages[idx - 1], next = TP.pages[idx + 1];
    if (prev) {
      var a = el('a', { class: 'prev', href: prev.planned ? link('index.html') : link(prev.file) });
      a.appendChild(el('small', null, '\u2190 Previous Post'));
      a.appendChild(doc.createTextNode(prev.title + (prev.planned ? ' (not yet built)' : '')));
      pager.appendChild(a);
    }
    if (next) {
      var b = el('a', { class: 'next', href: next.planned ? link('index.html') : link(next.file) });
      b.appendChild(el('small', null, 'Next Post \u2192'));
      b.appendChild(doc.createTextNode(next.title + (next.planned ? ' (not yet built)' : '')));
      pager.appendChild(b);
    }
  }

  /* ---------- source markers ---------- */
  function srcUrl(rangeOrStart, optEnd) {
    if (!rangeOrStart) return null;
    var rangeStr = optEnd ? (String(rangeOrStart) + '-' + String(optEnd)) : String(rangeOrStart);
    var m = /^L?(\d+)(?:-\s*L?(\d+))?$/.exec(rangeStr.trim());
    if (!m) return null;
    var frag = 'L' + m[1] + (m[2] && m[2] !== m[1] ? '-L' + m[2] : '');
    return 'https://github.com/google-research/tuning_playbook/blob/' + TP.playbookCommit + '/README.md#' + frag;
  }
  TP.playbookRawLineUrl = srcUrl;
  function buildSourceMarks() {
    /* Source line badges disabled in blog format */
  }

  /* ---------- citations ---------- */
  /* The first author's surname: the last word before the first comma of the author list. */
  function surname(ref) { return ref.authors.split(',')[0].trim().split(/\s+/).pop(); }
  /* The separator after a title: a title that ends in "?", "!" or "." takes no period. */
  function afterTitle(title) { return /[?!.]$/.test(title) ? ' ' : '. '; }
  function buildCitations() {
    var refs = TP.refs || {};
    var cites = doc.querySelectorAll('cite[data-ref]');
    var keys = [];
    each(cites, function (c) {
      var key = c.getAttribute('data-ref');
      if (keys.indexOf(key) < 0) keys.push(key);
    });
    /* The page's reference list is sorted by the first author's surname, then by year, and the
       citations are numbered in the list's order. Keys without an entry go last. */
    var order = keys.slice().sort(function (a, b) {
      var ra = refs[a], rb = refs[b];
      if (!ra || !rb) return (ra ? 0 : 1) - (rb ? 0 : 1);
      return surname(ra).localeCompare(surname(rb), 'en', { sensitivity: 'base' }) || ra.year - rb.year ||
        ra.title.localeCompare(rb.title, 'en', { sensitivity: 'base' });
    });
    /* The reference page's ol#allrefs lists every entry of TP.refs in version 1's order: the playbook
       first, then the other entries by the first author's surname and then by year. On that page the
       citations are numbered in this list's order, and cited keys without an entry go last. */
    var all = doc.getElementById('allrefs');
    if (all) {
      var papers = Object.keys(refs).filter(function (k) { return k !== 'playbook'; }).sort(function (a, b) {
        return surname(refs[a]).localeCompare(surname(refs[b]), 'en', { sensitivity: 'base' }) || refs[a].year - refs[b].year;
      });
      order = (refs.playbook ? ['playbook'] : []).concat(papers)
        .concat(keys.filter(function (k) { return !refs[k]; }));
    }
    each(cites, function (c) {
      var key = c.getAttribute('data-ref');
      var ref = refs[key];
      var n = order.indexOf(key) + 1;
      c.className = 'ref';
      /* a cite that carries text ("Shallue et al.") keeps it and gains the number after it */
      var label = (c.textContent || '').replace(/\s+/g, ' ').trim();
      c.textContent = '';
      if (label) { c.classList.add('has-label'); c.appendChild(doc.createTextNode(label + '\u00a0')); }
      var a = el('a', { href: '#ref-' + key }, '[' + n + ']');
      if (ref) a.setAttribute('title', ref.authors + ' (' + ref.year + '). ' + ref.title + afterTitle(ref.title) + ref.venue);
      else { a.textContent = '[?]'; global.console.warn('Unknown reference key', key); }
      c.appendChild(a);
    });
    var list = all || doc.getElementById('reflist');
    if (!list) return;
    order.forEach(function (key) {
      var ref = refs[key];
      var li = el('li', { id: 'ref-' + key });
      if (!ref) { li.textContent = key + ' (missing entry)'; list.appendChild(li); return; }
      li.appendChild(doc.createTextNode(ref.authors + ' (' + ref.year + '). '));
      li.appendChild(el('a', { href: ref.url, target: '_blank', rel: 'noopener' }, ref.title));
      li.appendChild(doc.createTextNode(afterTitle(ref.title) + ref.venue + '.'));
      list.appendChild(li);
    });
    if (!order.length) {
      var sec = list.closest('section');
      if (sec) sec.hidden = true;
    }
  }

  /* ---------- margin notes ---------- */
  function buildSidenotes() {
    each(doc.querySelectorAll('.sidenote'), function (note, i) {
      /* a margin note is read inside its paragraph; the role and the name mark where it starts,
         since the number beside it is CSS-generated text */
      note.setAttribute('role', 'note');
      note.setAttribute('aria-label', 'note ' + (i + 1));
      if (note.previousElementSibling && note.previousElementSibling.classList.contains('sn-toggle')) return;
      var id = 'sn-' + (i + 1);
      /* the visible label "note N" comes from a CSS counter, which browsers leave out of the
         accessible name, so the aria-label gives the checkbox the same text */
      var input = el('input', { type: 'checkbox', class: 'sn-toggle', id: id, 'aria-label': 'note ' + (i + 1) });
      var label = el('label', { class: 'sn-mark', for: id, title: 'Show note' });
      note.parentNode.insertBefore(label, note);
      note.parentNode.insertBefore(input, note);
    });
  }

  /* Positions margin notes beside their markers on wide screens, pushing a note down when it
     would overlap the previous one. A note that would run into a following wide figure is shown
     inline instead. Sections are subgrids, so a wide figure may sit inside a section, and the
     query reads every .l-wide and .l-full in the page. On narrow screens CSS makes the notes
     inline collapsibles and this does nothing. */
  var wideQuery = global.matchMedia ? global.matchMedia('(min-width: 1120px)') : null;
  function layoutSidenotes() {
    var notes = doc.querySelectorAll('.sidenote');
    if (!notes.length) return;
    var wide = wideQuery ? wideQuery.matches : true;
    var lastBottom = -Infinity;
    each(notes, function (note) { note.classList.remove('inline'); });
    var wides = Array.prototype.slice.call(doc.querySelectorAll('main.page .l-wide, main.page .l-full'));
    each(notes, function (note) {
      if (!wide) { note.style.top = ''; return; }
      var host = note.offsetParent;
      var mark = note.previousElementSibling && note.previousElementSibling.previousElementSibling;
      if (!host) return;
      var hostTop = host.getBoundingClientRect().top + global.scrollY;
      var anchor = mark && mark.classList.contains('sn-mark') ? mark.getBoundingClientRect().top + global.scrollY : hostTop;
      var top = Math.max(anchor - 2, lastBottom + 10);
      note.style.top = (top - hostTop) + 'px';
      var bottom = top + note.offsetHeight;
      var blocker = null;
      for (var i = 0; i < wides.length; i++) {
        var w = wides[i];
        if (w.contains(host) || !(host.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
        var wTop = w.getBoundingClientRect().top + global.scrollY;
        if (wTop >= top && bottom > wTop - 8) blocker = w;
        break;
      }
      if (blocker) { note.classList.add('inline'); note.style.top = ''; return; }
      lastBottom = bottom;
    });
  }
  var layoutTimer = null;
  function scheduleLayout() {
    if (layoutTimer) return;
    layoutTimer = global.requestAnimationFrame(function () { layoutTimer = null; layoutSidenotes(); nameScrollers(); });
  }

  /* A wide scroll container outside the figures becomes a named tab stop while its content is
     wider than its box (section N). Chromium and Firefox make such a container focusable by
     themselves, unnamed, and WebKit does not make it focusable at all. The attributes this sets
     carry data-tp-scroll, so that a container which fits again loses only what was set here. */
  function scrollerName(box) {
    var t = function (n) { return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; };
    if (box.classList.contains('katex-display')) return 'Equation';
    var table = box.querySelector('table'), sec = box.closest('section');
    var heading = sec ? t(sec.querySelector('h2, h3, h4')) : '';
    var name = table ? t(table.querySelector('caption')) || heading || t(table.querySelector('th')) : heading;
    return name ? (table ? 'Table: ' : '') + name : 'Scrolling content';
  }
  function nameScrollers() {
    each(doc.querySelectorAll('main .scroll, main .katex-display'), function (box) {
      if (box.closest('figure.fig')) return;
      var wide = box.clientWidth > 0 && box.scrollWidth > box.clientWidth + 1;
      var mine = box.hasAttribute('data-tp-scroll');
      if (wide && !mine && !box.hasAttribute('tabindex')) {
        box.setAttribute('tabindex', '0');
        box.setAttribute('role', 'region');
        box.setAttribute('aria-label', scrollerName(box));
        box.setAttribute('data-tp-scroll', '');
      } else if (!wide && mine) {
        box.removeAttribute('tabindex');
        box.removeAttribute('role');
        box.removeAttribute('aria-label');
        box.removeAttribute('data-tp-scroll');
      }
    });
  }
  TP.nameScrollers = nameScrollers;

  /* The standards' items lose their subobjective numbers from the text and keep them in
     data-item (TP.standards.strip, above). A text node directly before a link is the only place a
     number stands. An item that already carries data-item is left as it is. */
  function renderStandardNumbers() {
    each(doc.querySelectorAll('ul.standard > li:not([data-item])'), function (li) {
      var items = [];
      each(li.querySelectorAll('a'), function (a) {
        var t = a.previousSibling;
        if (!t || t.nodeType !== 3) return;
        var r = TP.standards.strip(t.data);
        if (!r.items.length) return;
        t.data = r.text;
        items = items.concat(r.items);
      });
      if (items.length) li.setAttribute('data-item', items.join(' '));
    });
  }
  TP.layoutSidenotes = layoutSidenotes;

  /* ---------- math (KaTeX auto-render, when the vendored scripts are loaded) ---------- */
  /* \htmlClass is the one trusted command, for the symbols a control sets (DS §6.3), and its
     strict-mode notice is silenced, since every other notice still warns. */
  function renderMath(node) {
    if (!node || !isFn(global.renderMathInElement)) return;
    global.renderMathInElement(node, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false,
      trust: function (context) { return context.command === '\\htmlClass'; },
      strict: function (code) { return code === 'htmlExtension' ? 'ignore' : 'warn'; },
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'svg']
    });
    /* keep punctuation that follows an inline formula on the same line as the formula */
    each(node.querySelectorAll('.katex'), function (k) {
      var host = k.parentNode, t = host.nextSibling;
      if (!host || host.classList.contains('katex-display') || host.parentNode.classList.contains('math-nw') || !t || t.nodeType !== 3) return;
      var m = /^[,.;:)]+/.exec(t.data);
      if (!m) return;
      var w = doc.createElement('span'); w.className = 'math-nw'; w.style.whiteSpace = 'nowrap';
      host.parentNode.insertBefore(w, host); w.appendChild(host);
      w.appendChild(doc.createTextNode(m[0])); t.data = t.data.slice(m[0].length);
    });
  }
  TP.renderMath = renderMath;

  /* ---------- figure numbering ---------- */
  function numberFigures() {
    var n = 0;
    each(doc.querySelectorAll('figure.fig:not(.recap), figure.fig.recap[data-numbered="true"], figure.schematic'), function (f) {
      var num = f.querySelector('.fig-num'), label;
      var pb = f.getAttribute('data-playbook-fig');
      if (pb) label = 'Playbook Figure ' + pb;
      else { n += 1; label = 'Figure ' + n; }
      if (num && !num.textContent) num.textContent = label;
      f.setAttribute('data-fignum', label);
      var head = f.querySelector('.fig-head');
      if (head && !head.querySelector('.fig-kind-badge') && !head.querySelector('.chip')) {
        var badgeText = f.classList.contains('schematic') ? 'Conceptual Schematic' :
                        (f.classList.contains('source') || pb) ? 'Playbook Figure' :
                        f.classList.contains('exercise') ? 'Interactive Case' :
                        'Interactive Simulation';
        var badgeCls = 'fig-kind-badge' + (!f.classList.contains('schematic') && !f.classList.contains('source') && !pb ? ' is-interactive' : '');
        head.appendChild(el('span', { class: badgeCls }, badgeText));
      }
    });
    each(doc.querySelectorAll('a.figref'), function (a) {
      var f = doc.getElementById((a.getAttribute('href') || '').replace(/^#/, ''));
      if (f && f.getAttribute('data-fignum') && !a.textContent) a.textContent = f.getAttribute('data-fignum');
    });
  }

  /* ---------- sticky left-margin page TOC rail ---------- */
  function buildPageTOC() {
    var main = doc.querySelector('main.page');
    if (!main || doc.querySelector('.page-toc')) return;
    var headings = Array.prototype.slice.call(main.querySelectorAll('section > h2, .in-practice-header > h2'));
    if (headings.length < 2) return;
    var toc = el('aside', { class: 'page-toc', 'aria-label': 'On this page' });
    toc.appendChild(el('div', { class: 'page-toc-kicker' }, 'On This Page'));
    var list = el('ol', { class: 'page-toc-list' });
    var entries = [];
    headings.forEach(function (h, idx) {
      var sec = h.closest('section') || h;
      var id = sec.id || h.id;
      if (!id) {
        id = 'sec-' + kebab(h.textContent || ('section-' + (idx + 1)));
        sec.id = id;
      }
      var rawText = (h.textContent || '').replace(/\s+/g, ' ').trim();
      var li = el('li');
      var a = el('a', { class: 'page-toc-link', href: '#' + id }, rawText);
      li.appendChild(a);
      list.appendChild(li);
      entries.push({ target: sec, link: a });
    });
    toc.appendChild(list);

    var figs = Array.prototype.slice.call(main.querySelectorAll('figure.fig:not(.recap), figure.schematic'));
    if (figs.length > 0) {
      toc.appendChild(el('div', { class: 'page-toc-kicker page-toc-sub' }, 'Figures & Schematics'));
      var figList = el('ul', { class: 'page-toc-figs' });
      figs.forEach(function (f, fi) {
        if (!f.id) f.id = 'fig-item-' + (fi + 1);
        var fnum = f.getAttribute('data-fignum') || ('Figure ' + (fi + 1));
        var shortNum = fnum.replace(/^Figure\s+/i, 'Fig ').replace(/^Playbook Figure\s+/i, 'PB ');
        var titleNode = f.querySelector('.fig-title');
        var ftitle = titleNode ? titleNode.textContent.replace(/\s+/g, ' ').trim() : fnum;
        var li = el('li');
        var a = el('a', { class: 'page-toc-link page-toc-fig-link', href: '#' + f.id });
        a.appendChild(el('span', { class: 'page-toc-fig-num' }, shortNum));
        a.appendChild(doc.createTextNode(ftitle));
        li.appendChild(a);
        figList.appendChild(li);
      });
      toc.appendChild(figList);
    }

    main.insertBefore(toc, main.firstChild);

    function syncActive() {
      var threshold = (headerH || 58) + 64;
      var activeIdx = 0;
      for (var i = 0; i < entries.length; i++) {
        var r = entries[i].target.getBoundingClientRect();
        if (r.top <= threshold) activeIdx = i;
      }
      entries.forEach(function (en, j) {
        en.link.classList.toggle('is-active', j === activeIdx);
      });
    }
    global.addEventListener('scroll', syncActive, { passive: true });
    syncActive();
  }

  /* "Our addition" and "From the literature" boxes are notes on the text beside them. A bare
     <aside> inside <main> would be exposed as an unnamed complementary landmark. */
  function markNotes() {
    each(doc.querySelectorAll('aside.ours'), function (a) {
      if (!a.hasAttribute('role')) a.setAttribute('role', 'note');
    });
  }

  /* ======================================================================================
     3. TP.ui: the controls (DS §6.3 to §6.6), the data table and text blocks
     ====================================================================================== */

  TP.ui = TP.ui || {};
  var uid = 0;
  function nextId(prefix) { uid += 1; return (prefix || 'tp') + '-' + uid; }
  function same(a, b) { return a === b || String(a) === String(b); }
  var WORDS = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  /* the width of the native range thumb, so a tick sits under the thumb's centre at its value */
  var THUMB = 16;

  TP.ui.range = function (container, opts) {
    var id = opts.id || nextId('range');
    var wrap = el('div', { class: 'ctl' });
    var label = el('label', { for: id }, opts.label || '');
    var out = el('output', { for: id, id: id + '-out' });
    label.appendChild(out);
    var input = el('input', { type: 'range', id: id });
    var values = opts.values ? opts.values.slice() : null;
    if (values) { input.min = '0'; input.max = String(Math.max(0, values.length - 1)); input.step = '1'; }
    else {
      input.min = String(opts.min);
      input.max = String(opts.max);
      input.step = opts.step ? String(opts.step) : 'any';
    }
    var box = el('div', { class: 'range' });
    var ticksEl = el('div', { class: 'range-ticks', 'aria-hidden': 'true' });
    var desc = el('span', { class: 'sr-only', id: id + '-ticks' });
    box.appendChild(input);
    box.appendChild(ticksEl);
    wrap.appendChild(label);
    wrap.appendChild(box);
    wrap.appendChild(desc);
    function current() { return values ? values[+input.value] : +input.value; }
    function text(v) { return isFn(opts.format) ? opts.format(v) : String(v); }
    function show() {
      out.textContent = text(current());
      input.setAttribute('aria-valuetext', out.textContent);
    }
    function fraction(v) {
      if (values) {
        var i = values.indexOf(nearest(values, v, opts.log));
        return values.length > 1 ? i / (values.length - 1) : 0;
      }
      var lo = +input.min, hi = +input.max;
      return hi > lo ? (v - lo) / (hi - lo) : 0;
    }
    function setTicks(ticks) {
      ticksEl.textContent = '';
      var list = (ticks || []).filter(function (t) { return t && finite(t.value); });
      list.forEach(function (t) {
        var f = Math.max(0, Math.min(1, fraction(t.value)));
        var span = el('span', { class: 'range-tick' + (f < 0.25 ? ' start' : f > 0.75 ? ' end' : '') }, t.text);
        span.style.left = 'calc(' + (THUMB / 2) + 'px + ' + (f * 100).toFixed(3) + '% - ' + (f * THUMB).toFixed(2) + 'px)';
        ticksEl.appendChild(span);
      });
      desc.textContent = list.length ? 'Marked on the track: ' + list.map(function (t) { return t.text + ' at ' + text(t.value); }).join('; ') + '.' : '';
      if (list.length) input.setAttribute('aria-describedby', desc.id);
      else input.removeAttribute('aria-describedby');
    }
    function set(v) {
      if (values) input.value = String(values.indexOf(nearest(values, v, opts.log)));
      else input.value = String(v);
      show();
    }
    input.addEventListener('input', function () { show(); if (isFn(opts.onInput)) opts.onInput(current()); });
    input.addEventListener('change', function () { show(); if (isFn(opts.onChange)) opts.onChange(current()); });
    container.appendChild(wrap);
    set(opts.value != null ? opts.value : values ? values[opts.index || 0] : +opts.min);
    setTicks(opts.ticks);
    return { el: wrap, input: input, output: out, value: current, set: set, setTicks: setTicks };
  };

  TP.ui.segment = function (container, opts) {
    var id = opts.id || nextId('seg');
    var wrap = el('div', { class: 'ctl' });
    var lbl = el('span', { class: 'lbl', id: id + '-lbl' }, opts.label || '');
    var seg = el('div', { class: 'seg', role: 'group', 'aria-labelledby': id + '-lbl' });
    var value = opts.value, options = [], buttons = [];
    function mark() {
      buttons.forEach(function (b, i) { b.setAttribute('aria-pressed', String(same(options[i].value, value))); });
    }
    function render(list) {
      seg.textContent = '';
      options = (list || []).slice();
      buttons = options.map(function (o) {
        var b = el('button', { type: 'button', 'aria-pressed': 'false' }, o.label);
        b.addEventListener('click', function () {
          if (same(o.value, value)) return;
          value = o.value;
          mark();
          if (isFn(opts.onChange)) opts.onChange(value);
        });
        seg.appendChild(b);
        return b;
      });
      mark();
    }
    render(opts.options);
    wrap.appendChild(lbl);
    wrap.appendChild(seg);
    container.appendChild(wrap);
    return {
      el: wrap,
      buttons: function () { return buttons.slice(); },
      value: function () { return value; },
      set: function (v) { value = v; mark(); },
      setOptions: function (list) {
        var sameList = list.length === options.length && list.every(function (o, i) { return same(o.value, options[i].value) && o.label === options[i].label; });
        if (!sameList) render(list); else mark();
      }
    };
  };

  TP.ui.toggles = function (container, opts) {
    var id = opts.id || nextId('toggles');
    var wrap = el('div', { class: 'ctl' });
    var options = (opts.options || []).slice();
    var max = opts.max != null ? opts.max : options.length, min = opts.min || 0;
    var text = opts.label || '';
    if (max < options.length && !/at most/i.test(text)) text += ', at most ' + (WORDS[max] || String(max));
    var lbl = el('span', { class: 'lbl', id: id + '-lbl' }, text);
    var row = el('div', { class: 'toggles', role: 'group', 'aria-labelledby': id + '-lbl' });
    var value = (opts.value || []).slice(), buttons = [];
    function has(v) { return indexIn(value, v) >= 0; }
    function mark() {
      var n = value.length;
      buttons.forEach(function (b, i) {
        var on = has(options[i].value);
        b.setAttribute('aria-pressed', String(on));
        if (on ? n <= min : n >= max) b.setAttribute('aria-disabled', 'true');
        else b.removeAttribute('aria-disabled');
      });
    }
    function render(list) {
      row.textContent = '';
      options = list.slice();
      buttons = options.map(function (o) {
        var b = el('button', { type: 'button', class: 'btn', 'aria-pressed': 'false' }, o.label);
        b.addEventListener('click', function () {
          if (b.getAttribute('aria-disabled') === 'true') return;
          var on = !has(o.value);
          value = options.filter(function (x) { return x === o ? on : has(x.value); }).map(function (x) { return x.value; });
          mark();
          if (isFn(opts.onChange)) opts.onChange(value.slice());
        });
        row.appendChild(b);
        return b;
      });
      mark();
    }
    render(options);
    wrap.appendChild(lbl);
    wrap.appendChild(row);
    container.appendChild(wrap);
    return {
      el: wrap,
      buttons: function () { return buttons.slice(); },
      value: function () { return value.slice(); },
      set: function (v) { value = (v || []).slice(); mark(); },
      setOptions: function (list) {
        var sameList = list.length === options.length && list.every(function (o, i) { return same(o.value, options[i].value); });
        if (!sameList) render(list); else mark();
      }
    };
  };

  TP.ui.check = function (container, opts) {
    var id = opts.id || nextId('check');
    var wrap = el('div', { class: 'ctl check' });
    var input = el('input', { type: 'checkbox', id: id });
    input.checked = !!opts.checked;
    var label = el('label', { for: id }, opts.label || '');
    input.addEventListener('change', function () { if (isFn(opts.onChange)) opts.onChange(input.checked); });
    wrap.appendChild(input);
    wrap.appendChild(label);
    container.appendChild(wrap);
    return { el: wrap, input: input, value: function () { return input.checked; }, set: function (v) { input.checked = !!v; } };
  };

  TP.ui.preset = function (container, opts) {
    var b = el('button', { type: 'button', class: 'preset', 'aria-pressed': 'false' }, opts.label);
    b.addEventListener('click', function () { if (isFn(opts.onPress)) opts.onPress(); });
    container.appendChild(b);
    return { el: b, setPressed: function (on) { b.setAttribute('aria-pressed', String(!!on)); } };
  };

  TP.ui.reset = function (container, opts) {
    opts = opts || {};
    var b = el('button', { type: 'button', class: 'reset' }, opts.label || 'Reset');
    b.addEventListener('click', function () { if (isFn(opts.onPress)) opts.onPress(); });
    container.appendChild(b);
    return { el: b };
  };

  TP.ui.drawAgain = function (container, opts) {
    var id = opts.id || nextId('draw');
    var group = el('span', { class: 'btn-group' });
    var b = el('button', { type: 'button', class: 'draw', 'aria-describedby': id + '-seed' }, opts.label || 'Draw again');
    var s = el('span', { class: 'seed', id: id + '-seed' });
    function setSeed(v) { s.textContent = 'seed ' + v; }
    setSeed(opts.seed);
    b.addEventListener('click', function () { if (isFn(opts.onPress)) opts.onPress(); });
    group.appendChild(b);
    group.appendChild(s);
    container.appendChild(group);
    return { el: group, button: b, seed: s, setSeed: setSeed };
  };

  TP.ui.action = function (container, opts) {
    var b = el('button', { type: 'button', class: 'btn' + (opts.cls ? ' ' + opts.cls : '') }, opts.label);
    b.addEventListener('click', function () { if (isFn(opts.onPress)) opts.onPress(); });
    container.appendChild(b);
    return { el: b, setLabel: function (t) { if (b.textContent !== t) b.textContent = t; } };
  };

  /* Data-table twin: columns [{key, label, format}], rows [obj] */
  TP.ui.table = function (details, columns, rows, caption) {
    var holder = details.querySelector('.scroll') || el('div', { class: 'scroll' });
    holder.textContent = '';
    var table = el('table');
    if (caption) table.appendChild(el('caption', { class: 'sr-only' }, caption));
    var thead = el('thead'), tr = el('tr');
    columns.forEach(function (c) { tr.appendChild(el('th', { scope: 'col' }, c.label)); });
    thead.appendChild(tr);
    table.appendChild(thead);
    var tbody = el('tbody');
    rows.forEach(function (r) {
      var row = el('tr');
      columns.forEach(function (c) {
        var v = r[c.key];
        row.appendChild(el('td', null, c.format ? c.format(v, r) : (v == null ? '' : String(v))));
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    holder.appendChild(table);
    if (!holder.parentNode) details.appendChild(holder);
  };

  /* Build text blocks into parent with textContent only (call TP.renderMath on parent afterwards
     for any $...$). A block is a string or an array of inline parts (a paragraph), {math: tex}
     (a displayed equation, in a horizontal scroller), {ul: items} or {ol: items} (each item a
     string or an array of parts). An inline part is a string, {b: text}, {i: text}, {code: text}
     or {a: text, href} (links to other sites open in a new tab). Returns parent. */
  TP.ui.content = function (parent, blocks) {
    function inline(node, parts) {
      (Array.isArray(parts) ? parts : [parts]).forEach(function (q) {
        if (q == null) return;
        if (typeof q === 'string') { node.appendChild(doc.createTextNode(q)); return; }
        if (q.a != null) {
          var ext = /^https?:/.test(q.href || '');
          node.appendChild(el('a', ext ? { href: q.href, target: '_blank', rel: 'noopener' } : { href: q.href }, q.a));
        } else if (q.b != null) node.appendChild(el('strong', null, q.b));
        else if (q.i != null) node.appendChild(el('em', null, q.i));
        else if (q.code != null) node.appendChild(el('code', null, q.code));
      });
      return node;
    }
    blocks.forEach(function (b) {
      if (b && b.math != null) { parent.appendChild(el('div', { class: 'scroll' }, '$$' + b.math + '$$')); return; }
      if (b && (b.ul || b.ol)) {
        var list = el(b.ul ? 'ul' : 'ol');
        (b.ul || b.ol).forEach(function (item) { list.appendChild(inline(el('li'), item)); });
        parent.appendChild(list);
        return;
      }
      parent.appendChild(inline(el('p'), b));
    });
    return parent;
  };

  /* ======================================================================================
     4. TP.state in the browser: the query string at load, and throttled writes (DS §6.7)
     ====================================================================================== */

  var loadQuery = parseQuery(global.location ? global.location.search : '');
  var pendingUrl = {}, urlTimer = 0, lastUrlWrite = -Infinity;
  TP.state.read = function (key) {
    for (var i = loadQuery.length - 1; i >= 0; i--) if (loadQuery[i][0] === key) return parsePairs(loadQuery[i][1]);
    return null;
  };
  function flushUrl() {
    if (urlTimer) { global.clearTimeout(urlTimer); urlTimer = 0; }
    var keys = Object.keys(pendingUrl);
    if (!keys.length) return;
    var loc = global.location, search = loc.search;
    keys.forEach(function (k) { search = setQueryKey(search, k, pendingUrl[k]); });
    pendingUrl = {};
    lastUrlWrite = Date.now();
    if (search === loc.search) return;
    try { global.history.replaceState(global.history.state, '', (search || loc.pathname) + loc.hash); } catch (e) {}
  }
  TP.state.write = function (key, text) {
    pendingUrl[key] = text == null || text === '' ? null : String(text);
    var wait = lastUrlWrite + 250 - Date.now();
    if (wait <= 0 && !urlTimer) flushUrl();
    else if (!urlTimer) urlTimer = global.setTimeout(flushUrl, Math.max(0, wait));
  };
  TP.state.flush = flushUrl;

  /* ======================================================================================
     5. TP.whenNear: one IntersectionObserver for the deferred work of figures, recaps and
        cases, one viewport height above and below the screen (DS §1 item 3)
     ====================================================================================== */

  var nearObserver = null, nearJobs = [];
  function runNear(job) {
    if (job.done) return;
    job.done = true;
    var i = nearJobs.indexOf(job);
    if (i >= 0) nearJobs.splice(i, 1);
    try { job.fn(); } catch (e) { global.console.error(e); }
  }
  function onNear(entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      nearObserver.unobserve(en.target);
      nearJobs.filter(function (j) { return j.el === en.target; }).forEach(runNear);
    });
  }
  TP.whenNear = function (target, fn) {
    var job = { el: target, fn: fn, done: false };
    nearJobs.push(job);
    if (!global.IntersectionObserver || !target) { runNear(job); return; }
    if (!nearObserver) nearObserver = new IntersectionObserver(onNear, { rootMargin: '100% 0px' });
    nearObserver.observe(target);
  };
  function flushNear() { nearJobs.slice().forEach(runNear); }

  /* ======================================================================================
     6. TP.fig: the figure contract (DS §11.1, §11.2; plan WO-I5.1 to WO-I5.5)
     ====================================================================================== */

  var KINDS = ['fixed', 'running', 'static', 'exercise'];
  var FIGURES = [];
  /* printing: between beforeprint and afterprint. quietDepth: while the states are restored
     after printing, when a settle neither speaks nor writes the URL. */
  var printing = false, quietDepth = 0, drawCount = 0;
  TP.figures = TP.figures || {};

  function newSeed(current) {
    drawCount += 1;
    var g = TP.prng && isFn(TP.prng.create) ? TP.prng.create(((Date.now() >>> 0) ^ Math.imul(drawCount, 0x9e3779b9)) >>> 0) : null;
    var s;
    do { s = 1 + (g ? g.int(99999) : Math.floor(Math.random() * 99999)); } while (s === current);
    return s;
  }
  function insertAfter(ref, node) {
    if (ref && ref.parentNode) ref.parentNode.insertBefore(node, ref.nextSibling);
  }
  function obj(k, v) { var o = {}; o[k] = v; return o; }

  figImpl = function (element, contract) {
    if (!element || !element.id) { global.console.error('TP.fig: the element is missing or has no id'); return null; }
    var id = element.id;
    function report(msg) { global.console.error('TP.fig: ' + id + ' ' + msg); }
    if (TP.figures[id] && TP.figures[id].fig) { report('is registered twice'); return TP.figures[id].fig; }
    contract = contract || {};
    var kind = contract.kind || 'fixed';
    if (KINDS.indexOf(kind) < 0) { report('has the unknown kind "' + kind + '"'); kind = 'fixed'; }
    var running = kind === 'running', isStatic = kind === 'static', isExercise = kind === 'exercise';
    function safe(fn) {
      if (!isFn(fn)) return undefined;
      try { return fn.apply(null, Array.prototype.slice.call(arguments, 1)); }
      catch (e) { report('threw in ' + (fn.name || 'a contract function') + ': ' + (e && e.stack || e)); return undefined; }
    }

    /* ---------- the anatomy of DS §3.4 ---------- */
    if (!element.classList.contains('fig')) report('lacks the class "fig"');
    if (isStatic !== element.classList.contains('static')) report('is kind "' + kind + '" and its classes are "' + element.className + '"');
    if (isExercise !== element.classList.contains('exercise')) report('is kind "' + kind + '" and its classes are "' + element.className + '"');
    if (element.getAttribute('role') !== 'group') report('lacks role="group"');
    var kids = Array.prototype.slice.call(element.children);
    function child(sel) { for (var i = 0; i < kids.length; i++) if (kids[i].matches(sel)) return kids[i]; return null; }
    var head = child('figcaption.fig-head'), task = child('p.fig-task'), caption = child('p.fig-caption');
    var model = child('details.fig-model');
    if (head && !head.querySelector('.chip')) report('lacks a provenance chip in figcaption.fig-head');
    if (!isStatic && !task) report('lacks p.fig-task');
    if (!caption) report('lacks p.fig-caption');
    if (head && head.querySelector('.chip.toy') && !model) report('carries .chip.toy and lacks details.fig-model');
    var htmlPanels = child('div.fig-panels');
    if (!isFn(contract.draw)) report('lacks a draw function');
    if (!running && !isFn(contract.apply)) report('lacks an apply function');

    /* ---------- the schema, the defaults, the presets and the URL ---------- */
    var S = normalize(contract.params, { kind: kind, seed: contract.seed, report: report });
    var P = S.entries, ORDER = S.order;
    var raw = {};
    ORDER.forEach(function (n) { raw[n] = P[n]['default']; });
    var defaults = resolveAll(S, raw);
    ORDER.forEach(function (n) {
      if (!sameValue(P[n], raw[n], defaults[n])) report('has a default for ' + n + ' outside its domain or snap');
    });
    var PRESETS = isStatic ? [] : presetList(contract.presets);
    PRESETS.forEach(function (entry) {
      if (isFn(entry.def)) return;
      Object.keys(entry.def || {}).forEach(function (k) {
        if (k !== 'key' && k !== 't' && !P[k]) report('has a preset "' + entry.name + '" that sets the unknown parameter "' + k + '"');
      });
      if (entry.def && entry.def.t != null && !running) report('has a preset "' + entry.name + '" with t, which only a running figure uses');
    });
    var urlMap = isStatic || isExercise ? null : TP.state.read(id);
    var values = urlMap ? decodeValues(S, urlMap, defaults) : copy(defaults);
    var restored = !!urlMap, initialT = decodeT(urlMap);

    /* ---------- the internal state ---------- */
    var derived = null, settledDerived = null, shownState = null, ghost = null, pin = null;
    var dirty = false, runDirty = false, prepared = false, drawnAfterPrepare = false;
    /* the control whose drag is under way, which syncControls leaves alone */
    var activeFrom = null;
    var tr = null, run = null, lastRunState, lastRunCtx = null;
    var exercise = { answers: {}, checked: {} };
    var readyWaiters = [], listeners = { settle: [], prepare: [], draw: [] };
    var controls = {}, presetButtons = [], pinBtn = null, sideMoved = false, tableBuilt = false;

    /* ---------- the parts TP.fig builds ---------- */
    var anchor = task || head;
    var panels = htmlPanels;
    var more = null, dock = null, controlsEl = null, side = null, readoutEl = null, liveEl = null;
    var docked = contract.docked || (isExercise ? ['check', 'reset'] : (contract.pin ? ['pin'] : []));
    function isDocked(name) { return docked.indexOf(name) >= 0; }
    if (!isStatic) {
      more = child('div.fig-controls-more') || el('div', { class: 'fig-controls-more' });
      var needDock = running || isExercise || docked.length > 0 || ORDER.some(function (n) {
        var e = P[n];
        return e.dock && e.control !== 'none' && e.control !== 'handle' && e.place !== 'side' && !e.panel;
      });
      if (needDock) {
        dock = child('div.fig-dock') || el('div', { class: 'fig-dock' });
        controlsEl = dock.querySelector('.fig-controls') || el('div', { class: 'fig-controls' });
        if (!controlsEl.parentNode) dock.insertBefore(controlsEl, dock.firstChild);
      }
    }
    if (!panels) panels = el('div', { class: 'fig-panels' });
    /* place the built parts after the task line, before an existing div.fig-panels */
    if (panels.parentNode === element) {
      if (more && !more.parentNode) element.insertBefore(more, panels);
      if (dock && !dock.parentNode) element.insertBefore(dock, panels);
    } else {
      var at = anchor;
      if (more) { if (at) insertAfter(at, more); else element.insertBefore(more, element.firstChild); at = more; }
      if (dock) { insertAfter(at, dock); at = dock; }
      if (at) insertAfter(at, panels); else element.insertBefore(panels, element.firstChild);
    }
    if (ORDER.some(function (n) { return P[n].place === 'side'; })) {
      side = el('div', { class: 'fig-side' });
      panels.appendChild(side);
    }
    var after = panels;
    if (!isStatic && (isFn(contract.readout) || !isExercise)) {
      readoutEl = el('p', { class: 'fig-readout' });
      liveEl = el('p', { class: 'sr-only', 'aria-live': 'polite' });
      insertAfter(panels, readoutEl);
      insertAfter(readoutEl, liveEl);
      after = liveEl;
    }
    var tableEl = null;
    if (isFn(contract.table)) {
      tableEl = el('details', { class: 'fig-table' }, [el('summary', null, ['Data table'])]);
      var beforeNode = model || caption || null;
      if (beforeNode) element.insertBefore(tableEl, beforeNode);
      else insertAfter(after, tableEl);
    }
    if (caption && model && caption.compareDocumentPosition(model) & Node.DOCUMENT_POSITION_PRECEDING) {
      insertAfter(caption, model);
    }

    /* ---------- the figure object ---------- */
    var fig = {
      id: id, el: element, kind: kind, params: P, order: ORDER.slice(), contract: contract,
      panels: panels, dock: dock, controls: controlsEl, more: more, side: side
    };
    var hooks = TP.figures[id] = { fig: fig, run: null, states: contract.states || {} };

    function emit(name) {
      var args = Array.prototype.slice.call(arguments, 1);
      (listeners[name] || []).slice().forEach(function (fn) {
        try { fn.apply(null, args); } catch (e) { report('threw in a ' + name + ' listener: ' + (e && e.stack || e)); }
      });
    }
    function runValues() {
      var p = run && isFn(run.params) ? safe(run.params) : null;
      if (!p) return copy(values);
      var merged = copy(values);
      for (var k in p) if (P[k]) merged[k] = p[k];
      return resolveAll(S, merged);
    }
    function currentValues() { return running ? runValues() : values; }
    function exerciseState() {
      return { answers: copy(exercise.answers), checked: copy(exercise.checked) };
    }
    function makeCtx(extra) {
      var ctx = {
        fig: fig, values: copy(currentValues()), phone: isPhone(),
        transient: false, transition: false, hold: false, playing: false,
        ghost: ghost, pin: pin, exercise: isExercise ? exerciseState() : null, run: run
      };
      if (extra) for (var k in extra) if (hasOwn.call(extra, k)) ctx[k] = extra[k];
      ctx.hold = !!(ctx.hold || ctx.transient || ctx.transition || ctx.playing);
      return ctx;
    }
    function readoutText(state, ctx) {
      if (!isFn(contract.readout) || state == null) return '';
      var t = safe(contract.readout, state, ctx);
      return t == null ? '' : String(t);
    }
    function checkReady() {
      if (!prepared || !drawnAfterPrepare || tr) return;
      var list = readyWaiters;
      readyWaiters = [];
      list.forEach(function (fn) { fn(); });
    }
    function mountPanelControls() {
      Object.keys(controls).forEach(function (name) {
        var c = controls[name];
        if (!c.panel) return;
        var ph = element.querySelector('.panel[data-panel="' + c.panel + '"] .panel-head');
        if (ph && c.el.parentNode !== ph) ph.appendChild(c.el);
      });
      if (side && !sideMoved && panels.lastElementChild !== side && panels.querySelector('.panel')) {
        sideMoved = true;
        panels.appendChild(side);
      }
    }
    function drawNow(state, extra) {
      var ctx = makeCtx(extra);
      if (isFn(contract.draw)) safe(contract.draw, state, ctx);
      if (state != null) {
        shownState = ctx.transition ? shownState : state;
        if (!ctx.transition && readoutEl) {
          var t = readoutText(state, ctx);
          if (readoutEl.textContent !== t) readoutEl.textContent = t;
        }
        if (prepared) drawnAfterPrepare = true;
      }
      mountPanelControls();
      emit('draw', state, ctx);
      checkReady();
      return ctx;
    }
    function buildTable(state, ctx) {
      if (!tableEl || !isFn(contract.table) || state == null) return;
      var t = safe(contract.table, state, ctx);
      if (t) { TP.ui.table(tableEl, t.columns || [], t.rows || [], t.caption || ''); tableBuilt = true; }
    }
    function writeUrl() {
      if (isStatic || isExercise || printing) return;
      var map = encodeValues(S, currentValues(), defaults);
      /* t is the cursor of a paused run; a playing run's cursor is not a setting */
      if (run && !(isFn(run.playing) && safe(run.playing))) {
        var t = safe(run.t), st = isFn(run.steps) ? safe(run.steps) : null;
        if (finite(t) && t !== st) map.t = String(t);
      }
      TP.state.write(id, formatPairs(map) || null);
    }
    /* Settling (DS §1). opts: finalDraw, a draw with hold false first; live, the live twin
       speaks; url, the URL is written. */
    function settleNow(opts) {
      opts = opts || {};
      if (tr) return;
      var ctx = opts.finalDraw ? drawNow(derived, {}) : makeCtx({});
      if (derived != null) {
        var text = readoutText(derived, ctx);
        if (readoutEl && readoutEl.textContent !== text) readoutEl.textContent = text;
        if (liveEl && opts.live && !printing && !quietDepth) liveEl.textContent = text;
        buildTable(derived, ctx);
      }
      settledDerived = derived;
      dirty = false;
      activeFrom = null;
      syncControls();
      if (opts.url && !quietDepth) writeUrl();
      emit('settle', fig);
      doc.dispatchEvent(new CustomEvent('tp:figure', { detail: id }));
      checkReady();
    }
    function applyValues(v) {
      var st = safe(contract.apply, copy(v));
      if (st == null && !running) report('apply returned no state');
      return st == null ? null : st;
    }
    function ensurePrepared() {
      if (prepared) return;
      prepared = true;
      safe(contract.prepare);
      if (!running) {
        derived = applyValues(values);
        drawNow(derived, {});
        settleNow({ live: false, url: false });
      }
      emit('prepare', fig);
      if (isExercise && isFn(contract.initExercise) && !(global && global.__tpTestExerciseEmpty) && !printing) {
        safe(contract.initExercise, fig);
      }
      checkReady();
    }

    /* ---------- transitions (DS §9) ---------- */
    function startTransition(from, to) {
      var duration = 750;
      if (isFn(contract.largestMove)) {
        var px = safe(contract.largestMove, from, to);
        if (finite(px) && px < 40) duration = 400;
      }
      if (readoutEl) readoutEl.textContent = readoutText(to, makeCtx({}));
      var handle = null;
      handle = TP.fig.transition(from, to, {
        duration: duration,
        draw: function (frame) { drawNow(frame, { transition: true }); },
        done: function (interrupted) {
          if (tr === handle) tr = null;
          drawNow(to, {});
          settleNow({ live: !interrupted, url: true });
        }
      });
      if (handle.running) tr = handle;
    }
    function finishTransition() { if (tr) tr.finish(true); }

    /* ---------- changes (DS §6, §9; plan WO-I5.1) ---------- */
    /* The values given, each clamped over base, with constrain applied; reports what it cannot
       use. Returns {next, names}. */
    function propose(given, base, opts) {
      var next = copy(base), names = [];
      Object.keys(given || {}).forEach(function (name) {
        if (name === 't') return;
        var e = P[name];
        if (!e) { report('has no parameter "' + name + '"'); return; }
        var c = clampValue(e, given[name], next);
        if (c === undefined) {
          report('got ' + JSON.stringify(given[name]) + ' for ' + name + ', which is not a ' + e.type + ' of its domain');
          return;
        }
        next[name] = c;
        names.push(name);
      });
      if (names.length && isFn(contract.constrain) && !(opts && opts.source === 'restore')) {
        var adjusted = safe(contract.constrain, copy(next), copy(base), names.slice());
        if (adjusted && typeof adjusted === 'object') next = copy(adjusted);
      }
      return { next: resolveAll(S, next), names: names };
    }
    function changedNames(a, b) {
      return ORDER.filter(function (n) { return !sameValue(P[n], a[n], b[n]); });
    }
    function setRunning(given, opts) {
      if (!run) { report('is a running figure with no runtime attached'); return; }
      var cur = runValues(), r = propose(given, cur, opts);
      var changed = changedNames(r.next, cur);
      if (!changed.length) {
        if (!opts.transient && runDirty) { runDirty = false; if (isFn(run.settle)) run.settle(); }
        return;
      }
      var delta = {};
      changed.forEach(function (n) { delta[n] = r.next[n]; });
      values = r.next;
      runDirty = !!opts.transient;
      activeFrom = opts.transient ? opts.from || null : null;
      run.setMany(delta, { transient: !!opts.transient });
      syncControls();
      /* a change the run takes while it plays (a redraw or live parameter) settles nothing until
         the run stops, so the key is written now, without t; the run's settle writes it again */
      if (!opts.transient && !quietDepth && isFn(run.playing) && safe(run.playing)) writeUrl();
    }
    function set(given, opts) {
      opts = opts || {};
      if (isStatic) { report('is static and takes no values'); return; }
      if (running) { setRunning(given, opts); return; }
      ensurePrepared();
      if (tr) finishTransition();
      var prev = values, r = propose(given, prev, opts);
      var changed = changedNames(r.next, prev);
      if (!changed.length) {
        if (!opts.transient && dirty) settleNow({ finalDraw: true, live: true, url: true });
        return;
      }
      /* the ghost (DS §4.8): the state before the change, which during a drag is the state at its
         start, since nothing settles until the drag ends. It is decided from the names the reader
         set that changed, so that a parameter constrain adjusts does not clear it; when constrain
         alone changed values, from every changed name. */
      var setNames = r.names.filter(function (n) { return changed.indexOf(n) >= 0; });
      var ghostBasis = setNames.length ? setNames : changed;
      if (ghostBasis.some(function (n) { return !P[n].ghost; })) ghost = null;
      else ghost = settledDerived;
      values = r.next;
      derived = applyValues(values);
      if (opts.transient) {
        dirty = true;
        activeFrom = opts.from || null;
        syncControls();
        drawNow(derived, { transient: true });
        return;
      }
      activeFrom = null;
      syncControls();
      var cut = opts.now || changed.some(function (n) { return P[n].change !== 'transition'; });
      if (!cut && !TP.motion.reduced() && shownState != null && shownState !== derived) startTransition(shownState, derived);
      else {
        drawNow(derived, {});
        settleNow({ live: true, url: true });
      }
    }
    function settle() {
      if (running) { if (run && runDirty) { runDirty = false; if (isFn(run.settle)) run.settle(); } return; }
      if (dirty) settleNow({ finalDraw: true, live: true, url: true });
    }
    function reset(opts) {
      opts = opts || {};
      if (isStatic) return;
      pin = null;
      if (isFn(contract.clear)) safe(contract.clear);
      if (isExercise) {
        clearExercise();
        if (isFn(contract.initExercise) && !(global && global.__tpTestExerciseEmpty) && !printing) {
          safe(contract.initExercise, fig);
        }
      }
      if (running) {
        if (run && isFn(run.reset)) run.reset(opts.now ? { now: true } : undefined);
        syncControls();
        return;
      }
      ensurePrepared();
      if (tr) finishTransition();
      ghost = null;
      var prev = values;
      values = copy(defaults);
      var changed = changedNames(values, prev);
      derived = applyValues(values);
      syncControls();
      var cut = opts.now || !changed.length || changed.some(function (n) { return P[n].change !== 'transition'; });
      if (!cut && !TP.motion.reduced() && shownState != null) startTransition(shownState, derived);
      else {
        drawNow(derived, {});
        settleNow({ live: !printing, url: true });
      }
    }
    function preset(which, opts) {
      var entry = findPreset(PRESETS, which);
      if (!entry) { report('has no preset "' + which + '"'); return false; }
      var r = presetValues(entry, currentValues().seed);
      if (running) {
        if (!run) { report('is a running figure with no runtime attached'); return false; }
        setRunning(r.values, { source: 'preset' });
        if (r.t != null && isFn(run.scrub)) run.scrub(r.t);
        return true;
      }
      set(r.values, { source: 'preset', now: opts && opts.now });
      return true;
    }

    /* ---------- the pin (DS §4.8) ---------- */
    function syncPin() {
      if (!pinBtn) return;
      var cfg = typeof contract.pin === 'object' ? contract.pin : {};
      pinBtn.setLabel(pin ? (cfg.unlabel || 'Unpin') : (cfg.label || 'Pin'));
    }
    function setPin(on) {
      if (isStatic) return;
      ensurePrepared();
      if (tr) finishTransition();
      pin = on ? { values: copy(currentValues()), state: running ? (run ? safe(run.state) : null) : derived } : null;
      syncPin();
      if (running) { redraw({}); return; }
      drawNow(derived, {});
      settleNow({ live: true, url: false });
    }

    /* ---------- exercises (section H) ---------- */
    var itemEls = isExercise ? Array.prototype.slice.call(element.querySelectorAll('.item[data-item]')) : [];
    function itemKey(item) { return item.getAttribute('data-item'); }
    function optionButtons(item) {
      var list = Array.prototype.slice.call(item.querySelectorAll('.options button, button[data-option]'));
      return list.filter(function (b, i) { return list.indexOf(b) === i; });
    }
    function optionOf(b, i) { return b.getAttribute('data-option') || String(i + 1); }
    function feedbackFor(key) {
      var out = [];
      itemEls.forEach(function (it) { if (itemKey(it) === key) each(it.querySelectorAll('.feedback'), function (p) { out.push(p); }); });
      each(element.querySelectorAll('.feedback[data-item]'), function (p) {
        if (p.getAttribute('data-item') === key && out.indexOf(p) < 0) out.push(p);
      });
      return out;
    }
    function markItem(key) {
      itemEls.forEach(function (it) {
        if (itemKey(it) !== key) return;
        optionButtons(it).forEach(function (b, i) { b.setAttribute('aria-pressed', String(optionOf(b, i) === exercise.answers[key])); });
      });
    }
    function answer(item, option) {
      if (!isExercise) { report('is not an exercise and takes no answers'); return; }
      ensurePrepared();
      var key = String(item);
      if (option == null) delete exercise.answers[key]; else exercise.answers[key] = String(option);
      if (contract.instantCheck && !(global && global.__tpTestExerciseEmpty) && option != null) {
        exercise.checked[key] = true;
        markItem(key);
        feedbackFor(key).forEach(function (p) {
          var o = p.getAttribute('data-option');
          p.hidden = !(o == null || o === exercise.answers[key]);
        });
        if (isFn(contract.check)) safe(contract.check, { quiet: true });
      } else {
        delete exercise.checked[key];
        markItem(key);
        feedbackFor(key).forEach(function (p) { p.hidden = true; });
      }
      drawNow(derived, {});
      settleNow({ live: false, url: false });
    }
    function checkExercise(opts) {
      opts = opts || {};
      if (!isExercise) { report('is not an exercise'); return; }
      ensurePrepared();
      var shown = [];
      Object.keys(exercise.answers).forEach(function (key) {
        exercise.checked[key] = true;
        feedbackFor(key).forEach(function (p) {
          var o = p.getAttribute('data-option');
          var show = o == null || o === exercise.answers[key];
          p.hidden = !show;
          if (show) shown.push(p);
        });
      });
      if (isFn(contract.check)) safe(contract.check, opts);
      drawNow(derived, {});
      settleNow({ live: !opts.quiet, url: false });
      if (shown.length && !opts.quiet && !opts.noFocus) {
        if (!shown[0].hasAttribute('tabindex')) shown[0].setAttribute('tabindex', '-1');
        shown[0].focus();
      }
    }
    function clearExercise() {
      exercise = { answers: {}, checked: {} };
      itemEls.forEach(function (it) {
        optionButtons(it).forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        each(it.querySelectorAll('.feedback'), function (p) { p.hidden = true; });
      });
      each(element.querySelectorAll('.feedback[data-item]'), function (p) { p.hidden = true; });
    }
    itemEls.forEach(function (it) {
      var key = itemKey(it);
      optionButtons(it).forEach(function (b, i) {
        b.setAttribute('type', 'button');
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () { answer(key, optionOf(b, i)); });
      });
    });
    if (isExercise) clearExercise();

    /* ---------- snapshots, printing and redrawing ---------- */
    function snapshot() {
      return {
        values: copy(currentValues()), ghost: ghost, pin: pin,
        exercise: isExercise ? exerciseState() : null,
        run: run && isFn(run.snapshot) ? safe(run.snapshot) : null,
        extra: isFn(contract.snapshot) ? safe(contract.snapshot) : undefined
      };
    }
    function restore(snap) {
      if (!snap) return;
      ensurePrepared();
      if (tr) finishTransition();
      pin = snap.pin || null;
      if (isFn(contract.restore)) safe(contract.restore, snap.extra);
      if (running) {
        if (run && snap.run && isFn(run.restore)) run.restore(snap.run);
        syncControls();
        return;
      }
      values = resolveAll(S, snap.values || defaults);
      ghost = snap.ghost || null;
      if (isExercise && snap.exercise) {
        clearExercise();
        exercise = { answers: copy(snap.exercise.answers), checked: copy(snap.exercise.checked) };
        Object.keys(exercise.answers).forEach(function (key) {
          markItem(key);
          if (exercise.checked[key]) feedbackFor(key).forEach(function (p) {
            var o = p.getAttribute('data-option');
            p.hidden = !(o == null || o === exercise.answers[key]);
          });
        });
      }
      derived = applyValues(values);
      drawNow(derived, {});
      settleNow({ live: false, url: false });
    }
    function printDefault() {
      if (isStatic) { ensurePrepared(); return; }
      reset({ now: true });
      if (running && run && isFn(run.finish)) safe(run.finish);
    }
    function redraw(opts) {
      opts = opts || {};
      if (running) {
        if (lastRunCtx) drawNow(lastRunState, lastRunCtx);
        if (opts.settle) onRunSettle({ quiet: false });
        return;
      }
      ensurePrepared();
      if (tr) finishTransition();
      if (opts.apply) derived = applyValues(values);
      drawNow(derived, {});
      if (opts.settle) settleNow({ live: true, url: true });
    }
    function relayout() {
      if (!prepared || running) { if (running && lastRunCtx) drawNow(lastRunState, lastRunCtx); return; }
      if (!tr) drawNow(derived, {});
    }
    /* A panel redrawn for a new width (chart.js, 'tp:panel-resize') ran its draw function alone.
       The figure is drawn again once in the next frame, so that a figure which settles its labels
       for the panel's size settles them at this size too, and the labels at a size do not depend
       on which sizes the panel was drawn at before (print finding O3). */
    var resizeFrame = 0;
    element.addEventListener('tp:panel-resize', function () {
      if (resizeFrame || !isFn(global.requestAnimationFrame)) return;
      resizeFrame = global.requestAnimationFrame(function () { resizeFrame = 0; relayout(); });
    });

    /* ---------- the controls (DS §6; plan WO-I5.4) ---------- */
    function valueText(e, v) {
      if (isFn(e.format)) return String(e.format(v));
      if (e.type === 'number' && finite(v) && TP.fmt && isFn(TP.fmt.sig)) return TP.fmt.sig(v, 3);
      return String(v);
    }
    function optionText(e, v) {
      if (e.labels && e.labels[v] != null) return String(e.labels[v]);
      return valueText(e, v);
    }
    function optionsFor(e, vals) {
      var list;
      if (e.type === 'number') {
        if (Array.isArray(e.snap)) list = e.snap;
        else {
          var d = domainOf(e, vals) || [0, 0], step = e.snap || 1;
          list = [];
          for (var x = d[0]; x <= d[1] + step * 1e-9 && list.length < 200; x = +(x + step).toFixed(decimalsOf(step))) list.push(x);
        }
      } else list = members(e, vals);
      return list.map(function (v) { return { value: v, label: optionText(e, v) }; });
    }
    function sliderValues(e, vals) {
      if (Array.isArray(e.snap)) return e.snap;
      if (e.scale !== 'log') return null;
      var d = domainOf(e, vals) || [1, 10], a = Math.log10(d[0]), b = Math.log10(d[1]), out = [];
      for (var i = 0; i <= 100; i++) out.push(+Math.pow(10, a + (b - a) * i / 100).toPrecision(6));
      return out;
    }
    function linkSymbol(name, node) {
      function mark(on) {
        each(element.querySelectorAll('.hp-' + name), function (s) { s.classList.toggle('on', on); });
      }
      node.addEventListener('pointerenter', function () { mark(true); });
      node.addEventListener('pointerleave', function () { if (!node.contains(doc.activeElement)) mark(false); });
      node.addEventListener('focusin', function () { mark(true); });
      node.addEventListener('focusout', function (ev) { if (!node.contains(ev.relatedTarget)) mark(false); });
    }
    function hostFor(e, dockIt) {
      if (e.place === 'side' && side) return side;
      /* a panel control is built into a fragment; mountPanelControls moves its .ctl into the
         panel's head, so no empty wrapper is left behind */
      if (e.panel) return doc.createDocumentFragment();
      return dockIt && controlsEl ? controlsEl : more;
    }
    function buildControls() {
      if (isStatic) return;
      ORDER.forEach(function (name) {
        var e = P[name], kindC = e.control;
        if (name === 'seed' || kindC === 'none' || kindC === 'handle') return;
        var host = hostFor(e, e.dock), cid = id + '-' + name, api = null;
        var label = e.label || name;
        if (kindC === 'slider' && e.type === 'number') {
          var list = sliderValues(e, values), d = domainOf(e, values) || [0, 1];
          api = TP.ui.range(host, {
            id: cid, label: label, values: list, log: e.scale === 'log',
            min: d[0], max: d[1], step: e.snap || (d[1] - d[0]) / 100,
            value: values[name], format: function (v) { return valueText(e, v); },
            ticks: isFn(e.ticks) ? safe(e.ticks, copy(values)) : e.ticks,
            onInput: function (v) { fig.set(obj(name, v), { transient: true, from: name }); },
            onChange: function (v) { fig.set(obj(name, v), { from: name }); }
          });
        } else if (kindC === 'segment' && (e.type === 'choice' || e.type === 'number')) {
          api = TP.ui.segment(host, {
            id: cid, label: label, options: optionsFor(e, values), value: values[name],
            onChange: function (v) { fig.set(obj(name, v), { from: name }); }
          });
        } else if (kindC === 'toggles' && e.type === 'set') {
          api = TP.ui.toggles(host, {
            id: cid, label: label, options: optionsFor(e, values), value: values[name],
            max: setMax(e, values), min: e.min || 0,
            onChange: function (v) { fig.set(obj(name, v), { from: name }); }
          });
        } else if (kindC === 'check' && e.type === 'bool') {
          api = TP.ui.check(host, {
            id: cid, label: label, checked: values[name],
            onChange: function (v) { fig.set(obj(name, v), { from: name }); }
          });
        } else {
          report('gives ' + name + ' the control "' + kindC + '", which a ' + e.type + ' cannot take');
          return;
        }
        controls[name] = { kind: kindC, api: api, el: api.el, panel: e.panel || null };
        linkSymbol(name, api.el);
      });
      (contract.actions || []).forEach(function (a) {
        var host = (a.dock || isDocked(a.name)) && controlsEl ? controlsEl : more;
        TP.ui.action(host, {
          label: a.label || a.name,
          onPress: function () {
            if (isFn(a.press)) safe(a.press, fig);
            else if (run && isFn(run.act)) run.act(a.name);
            else report('has the action "' + a.name + '" with no press function and no runtime');
          }
        });
      });
      if (contract.pin) {
        pinBtn = TP.ui.action(isDocked('pin') && controlsEl ? controlsEl : more, {
          label: 'Pin', cls: 'pin', onPress: function () { setPin(!pin); }
        });
        syncPin();
      }
      PRESETS.forEach(function (entry) {
        var api = TP.ui.preset((isDocked('presets') || isDocked('preset:' + entry.key)) && controlsEl ? controlsEl : more, {
          label: entry.name, onPress: function () { preset(entry.name); }
        });
        presetButtons.push({ entry: entry, api: api });
      });
      if (P.seed) {
        var sd = TP.ui.drawAgain((P.seed.dock || isDocked('draw')) && controlsEl ? controlsEl : more, {
          id: id + '-draw', label: P.seed.label, seed: values.seed,
          onPress: function () { set({ seed: newSeed(currentValues().seed) }); }
        });
        controls.seed = { kind: 'draw', api: sd, el: sd.el, panel: null };
      }
      if (isExercise) {
        TP.ui.action(isDocked('check') && controlsEl ? controlsEl : more, { label: 'Check', cls: 'check', onPress: checkExercise });
      }
      TP.ui.reset(isDocked('reset') && controlsEl ? controlsEl : more, { onPress: function () { reset(); } });
    }
    /* Sets every control to the current values. A running figure calls it after every draw
       (opts.fromDraw); there, when the values and the control a drag holds are those of the last
       call, only the preset buttons and the pin are set, since the sliders, their ticks and the
       `when` of each control depend on those alone (frame cost, Batch 5). Every other caller sets
       every control. */
    var syncSig = null;
    function syncControls(opts) {
      if (isStatic) return;
      var vals = currentValues();
      var skip = dirty || runDirty ? activeFrom : null;
      var sig = null;
      if (opts && opts.fromDraw) {
        try { sig = String(skip) + '|' + JSON.stringify(vals); } catch (e) { sig = null; }
        if (sig != null && sig === syncSig) {
          var t0 = run ? safe(run.t) : null;
          presetButtons.forEach(function (pb) { pb.api.setPressed(presetMatches(S, pb.entry, vals, t0)); });
          syncPin();
          return;
        }
      }
      syncSig = sig;
      Object.keys(controls).forEach(function (name) {
        var c = controls[name], e = P[name], v = vals[name];
        if (c.kind === 'draw') c.api.setSeed(v);
        else if (name !== skip) {
          if (c.kind === 'slider') {
            if (isFn(e.ticks)) c.api.setTicks(safe(e.ticks, copy(vals)));
            c.api.set(v);
          } else if (c.kind === 'segment' || c.kind === 'toggles') {
            if (isFn(e.domain)) c.api.setOptions(optionsFor(e, vals));
            c.api.set(v);
          } else if (c.kind === 'check') c.api.set(v);
        }
        if (isFn(e.when)) c.el.hidden = !safe(e.when, copy(vals));
      });
      var t = run ? safe(run.t) : null;
      presetButtons.forEach(function (pb) { pb.api.setPressed(presetMatches(S, pb.entry, vals, t)); });
      syncPin();
    }

    /* ---------- running figures (section I) ---------- */
    /* info.quiet: the runtime's settle at load of a reduced-motion or restored figure, which
       fills the data table and leaves the live twin and the URL as they are */
    function onRunSettle(info) {
      if (printing) return;
      var quiet = !!(info && info.quiet) || quietDepth > 0;
      runDirty = false;
      activeFrom = null;
      values = runValues();
      syncControls();
      var st = safe(run.state);
      var ctx = makeCtx(lastRunCtx ? copy(lastRunCtx) : { t: safe(run.t), run: run });
      ctx.hold = false;
      if (st != null) {
        var text = readoutText(st, ctx);
        if (readoutEl && readoutEl.textContent !== text) readoutEl.textContent = text;
        if (liveEl && !quiet) liveEl.textContent = text;
        buildTable(st, ctx);
      }
      if (!quiet) writeUrl();
      emit('settle', fig);
      doc.dispatchEvent(new CustomEvent('tp:figure', { detail: id }));
      checkReady();
    }

    /* ---------- the public object ---------- */
    fig.set = set;
    fig.settle = settle;
    fig.reset = function (opts) { reset(opts); };
    fig.preset = preset;
    fig.redraw = redraw;
    fig.values = function () { return copy(currentValues()); };
    fig.defaults = function () { return copy(defaults); };
    fig.state = function () { return running ? (run ? safe(run.state) : null) : derived; };
    fig.control = function (name) { return controls[name] ? controls[name].el : null; };
    fig.pin = function (on) { setPin(on == null ? !pin : !!on); };
    fig.pinned = function () { return pin ? { values: copy(pin.values), state: pin.state } : null; };
    fig.answer = answer;
    fig.check = checkExercise;
    fig.exercise = function () { return exerciseState(); };
    fig.snapshot = snapshot;
    fig.restore = restore;
    fig.prepared = function () { return prepared; };
    fig.whenReady = function () {
      return new Promise(function (resolve) { readyWaiters.push(resolve); checkReady(); });
    };
    fig.on = function (name, fn) {
      if (!listeners[name] || !isFn(fn)) { report('has no event "' + name + '"'); return fig; }
      listeners[name].push(fn);
      if (name === 'prepare' && prepared) { try { fn(fig); } catch (e) { report('threw in a prepare listener: ' + e); } }
      return fig;
    };
    fig.linkSymbol = linkSymbol;
    fig.initial = function () { return { values: copy(values), t: initialT, restored: restored }; };
    fig.attach = function (r) {
      if (!running) report('is not a running figure, and a runtime attached to it');
      if (run) report('has a runtime attached twice');
      run = r;
      hooks.run = r;
      if (r && isFn(r.on)) r.on('settle', onRunSettle);
      return fig;
    };
    fig.draw = function (state, rctx) {
      lastRunState = state;
      lastRunCtx = rctx || {};
      var ctx = drawNow(state, lastRunCtx);
      if (running) {
        syncControls({ fromDraw: true });
        /* an autoplaying figure settles only when its run stops, so its data table is filled from
           the first state it draws after prepare; nothing is written to the URL */
        if (!tableBuilt && prepared && state != null) buildTable(state, makeCtx(lastRunCtx));
      }
      return ctx;
    };
    fig._printDefault = printDefault;
    fig._relayout = relayout;

    /* ---------- the test hooks (section J) ---------- */
    hooks.state = function () {
      ensurePrepared();
      var vals = copy(currentValues());
      var st = running ? (run ? safe(run.state) : null) : derived;
      var ctx = running ? makeCtx(lastRunCtx ? copy(lastRunCtx) : { run: run }) : makeCtx({});
      var q = isFn(contract.quantities) && st != null ? (safe(contract.quantities, st, ctx) || {}) : {};
      var params = copy(vals);
      delete params.seed;
      return {
        params: params, seed: vals.seed != null ? vals.seed : null,
        t: running && run ? safe(run.t) : null, quantities: q,
        readout: readoutEl ? readoutEl.textContent : null,
        pinned: pin ? copy(pin.values) : null,
        answers: isExercise ? copy(exercise.answers) : null,
        checked: isExercise ? copy(exercise.checked) : null
      };
    };
    hooks.set = function (v) { set(v, { now: true, source: 'test' }); };
    hooks.preset = function (name) { ensurePrepared(); return preset(name); };
    hooks.reset = function () { ensurePrepared(); reset(); };
    hooks.whenReady = fig.whenReady;
    hooks.setting = function (name) {
      ensurePrepared();
      if (name === 'default') reset({ now: true });
      else if (hasOwn.call(hooks.states, name)) set(hooks.states[name], { now: true, source: 'test' });
      else if (findPreset(PRESETS, name)) preset(name, { now: true });
      else if (name !== 'model' && !/^seed/.test(name)) report('has no setting "' + name + '"');
      if (running && run && isFn(run.finish)) safe(run.finish);
      return fig.whenReady();
    };

    /* ---------- start ---------- */
    buildControls();
    FIGURES.push(fig);
    drawNow(null, {});
    syncControls();
    TP.whenNear(element, ensurePrepared);
    return fig;
  };

  /* TP.fig.transition(from, to, {duration, draw, done, ease}): section E of the header. */
  TP.fig.transition = function (from, to, opts) {
    opts = opts || {};
    var ease = opts.ease || (global.d3 && global.d3.easeCubicInOut) || easeCubicInOut;
    var duration = opts.duration == null ? 750 : opts.duration;
    var finished = false, raf = 0, start = null;
    var h = { running: true };
    function end(interrupted) {
      if (finished) return;
      finished = true;
      h.running = false;
      if (raf) global.cancelAnimationFrame(raf);
      raf = 0;
      if (isFn(opts.done)) opts.done(!!interrupted);
    }
    h.finish = function (interrupted) { end(interrupted); };
    h.cancel = function () {
      if (finished) return;
      finished = true;
      h.running = false;
      if (raf) global.cancelAnimationFrame(raf);
    };
    /* chart.js loads after site.js, so its transition is looked up at each call. It draws the
       frames and the target; TP.fig's done() draws the target again with labels from scratch. */
    var C = TP.chart;
    if (C && isFn(C.transition)) {
      var ctl = C.transition(from, to, {
        duration: opts.duration == null ? undefined : (duration > 0 ? duration : 0),
        draw: function (state, ctx) { if (!(ctx && ctx.end) && isFn(opts.draw)) opts.draw(state, ctx && ctx.t); },
        onEnd: function () { end(false); }
      });
      h.finish = function (interrupted) {
        if (finished) return;
        if (interrupted) { ctl.cancel(); end(true); } else ctl.finish();
      };
      h.cancel = function () { if (!finished) { finished = true; h.running = false; ctl.cancel(); } };
      return h;
    }
    if (TP.motion.reduced() || !(duration > 0)) { end(false); return h; }
    function frame(now) {
      raf = 0;
      if (finished) return;
      if (start === null) start = now;
      var u = (now - start) / duration;
      if (u >= 1) { end(false); return; }
      if (isFn(opts.draw)) opts.draw(interpolate(from, to, ease(Math.max(0, u))), u);
      raf = global.requestAnimationFrame(frame);
    }
    raf = global.requestAnimationFrame(frame);
    return h;
  };

  /* ---------- printing (DS §6.7, plan WO-I5.5) ---------- */
  var printSnaps = null;
  var printOpened = [];
  function beforePrint() {
    if (printing) return;
    /* the paper layout first (site.css section 17), so that every deferred draw and every default
       state below is measured at the paper's column width */
    doc.documentElement.classList.add('tp-print');
    /* the model notes print open (DS §6.7); afterprint closes the ones opened here */
    printOpened = [];
    each(doc.querySelectorAll('details.fig-model'), function (d) {
      if (!d.open) { d.open = true; printOpened.push(d); }
    });
    each(doc.querySelectorAll('.fig-model-pane'), function (mp) {
      if (mp.hasAttribute('hidden')) { mp.removeAttribute('hidden'); printOpened.push(mp); }
    });
    /* every existing panel measures its paper width before any figure draws: a draw otherwise
       takes the width its ResizeObserver last reported, the screen's, and settles its labels for
       that width (print finding O3) */
    renderPanels();
    loadLazyImages();
    loadMathFonts();
    flushNear();
    printing = true;
    printSnaps = FIGURES.map(function (f) {
      var s = null;
      try { s = f.snapshot(); f._printDefault(); } catch (e) { global.console.error('TP.fig: ' + f.id + ' could not print its default state: ' + e); }
      return s;
    });
    /* a panel keeps the width its ResizeObserver last reported, which arrives after the print
       layout is taken; every panel is measured and drawn again now */
    renderPanels();
  }
  function renderPanels() {
    if (!TP.chart || !isFn(TP.chart.renderAll)) return;
    try { TP.chart.renderAll(doc); } catch (e) { global.console.error('TP.fig: the panels could not be drawn again for printing: ' + e); }
  }
  function afterPrint() {
    if (!printing) return;
    var snaps = printSnaps || [];
    printSnaps = null;
    printing = false;
    quietDepth += 1;
    doc.documentElement.classList.remove('tp-print');
    printOpened.forEach(function (d) {
      if (d.classList && d.classList.contains('fig-model-pane')) d.setAttribute('hidden', 'hidden');
      else d.open = false;
    });
    printOpened = [];
    FIGURES.forEach(function (f, i) {
      try { if (snaps[i]) f.restore(snaps[i]); } catch (e) { global.console.error('TP.fig: ' + f.id + ' could not restore its state after printing: ' + e); }
    });
    renderPanels();
    quietDepth -= 1;
  }
  global.addEventListener('beforeprint', beforePrint);
  global.addEventListener('afterprint', afterPrint);
  /* Chromium prints a lazy image that has not loaded as an empty box, and the print layout does
     not wait for it. The playbook's figures are small, so every lazy image loads once the page is
     idle after its load event. */
  function loadLazyImages() {
    each(doc.querySelectorAll('img[loading="lazy"]'), function (img) { img.loading = 'eager'; });
  }
  /* A browser loads a web font when text first uses it, and the print layout does not wait for
     one: math that no reader had scrolled to printed as blank glyphs (the Batch 7 print pass, the
     model notes opened for printing). The KaTeX faces are vendored and small, so they load once the
     page is idle, beside the lazy images. */
  function loadMathFonts() {
    if (!doc.fonts || !isFn(doc.fonts.forEach)) return;
    doc.fonts.forEach(function (f) {
      if (f.status === 'unloaded' && /^["']?KaTeX_/.test(f.family)) { try { f.load().catch(function () {}); } catch (e) { /* ignored */ } }
    });
  }
  function loadWhenIdle() { loadLazyImages(); loadMathFonts(); }
  function loadLazyWhenIdle() {
    if (isFn(global.requestIdleCallback)) global.requestIdleCallback(loadWhenIdle, { timeout: 3000 });
    else global.setTimeout(loadWhenIdle, 1500);
  }
  if (doc.readyState === 'complete') loadLazyWhenIdle();
  else global.addEventListener('load', loadLazyWhenIdle);

  /* ---------- preset links in the prose (DS §6.5) ---------- */
  function onPresetLink(ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest('button.preset-link') : null;
    if (!b) return;
    var figId = b.getAttribute('data-figure'), name = b.getAttribute('data-preset');
    var h = TP.figures[figId];
    if (!h || !h.fig) { global.console.error('TP.fig: a preset link names the figure "' + figId + '", which no script registered'); return; }
    if (!h.fig.preset(name)) return;
    var f = h.fig, target = f.dock || f.panels || f.el;
    var r = (f.panels || f.el).getBoundingClientRect();
    var vh = global.innerHeight || html.clientHeight;
    if (r.bottom <= headerH || r.top >= vh) {
      target.scrollIntoView({ block: 'start', behavior: TP.motion.reduced() ? 'auto' : 'smooth' });
    }
  }
  function checkPresetLinks() {
    each(doc.querySelectorAll('button.preset-link'), function (b) {
      var figId = b.getAttribute('data-figure'), name = b.getAttribute('data-preset');
      var h = figId ? TP.figures[figId] : null;
      if (!figId || name == null) global.console.error('TP.fig: a preset link lacks data-figure or data-preset');
      else if (!h || !h.fig) global.console.error('TP.fig: a preset link names the figure "' + figId + '", which no script registered');
      else if (!findPreset(presetList(h.fig.contract.presets), name)) global.console.error('TP.fig: ' + figId + ' has no preset "' + name + '", which a preset link names');
    });
  }

  /* ---------- recaps (plan WO-I5.8) ---------- */
  function parseSetting(s) {
    var out = {};
    if (!s) return out;
    String(s).split('&').forEach(function (p) {
      var i = p.indexOf('=');
      if (i > 0) out[safeDecode(p.slice(0, i))] = safeDecode(p.slice(i + 1));
    });
    return out;
  }
  TP.recaps.parseSetting = parseSetting;
  /* The fixed sentence that ends the caption of every recap of a toy figure (DS §3.4, after the
     lead's ruling on the page 4 reads): a recap carries no chip, so its caption says the data are
     synthetic. A recap of a figure that draws the playbook's data would carry data-toy="false". */
  var RECAP_SYNTHETIC = '';
  TP.recaps.SYNTHETIC = RECAP_SYNTHETIC;
  function markSynthetic() {}
  function initRecaps() {
    each(doc.querySelectorAll('figure.fig.recap'), function (f) {
      var name = f.getAttribute('data-recap');
      var label = f.id || 'a recap';
      markSynthetic(f);
      if (!name) { global.console.error('TP.recaps: ' + label + ' lacks data-recap'); return; }
      TP.whenNear(f, function () {
        var fn = TP.recaps[name];
        if (!isFn(fn)) { global.console.error('TP.recaps: no function is registered as "' + name + '" for ' + label); return; }
        var body = f.querySelector('.recap-body');
        if (!body) { body = el('div', { class: 'recap-body' }); f.insertBefore(body, f.firstChild); }
        try { fn(body, parseSetting(f.getAttribute('data-setting'))); f.setAttribute('data-drawn', 'true'); }
        catch (e) { global.console.error('TP.recaps: "' + name + '" threw ' + (e && e.stack || e)); }
      });
    });
  }

  /* After tp:ready: every figure that should call TP.fig did, and every running figure has its
     runtime. */
  function checkRegistrations() {
    each(doc.querySelectorAll('figure.fig'), function (f) {
      if (f.classList.contains('recap') || f.classList.contains('source') || f.hasAttribute('data-playbook-fig') || f.hasAttribute('data-design-specimen')) return;
      if (!f.id) { global.console.error('TP.fig: a figure.fig has no id'); return; }
      var h = TP.figures[f.id];
      if (!h || !h.fig) global.console.error('TP.fig: ' + f.id + ' was not registered by any script');
      else if (h.fig.kind === 'running' && !h.run) global.console.error('TP.fig: ' + f.id + ' is a running figure with no runtime attached');
    });
  }

  /* ======================================================================================
     7. Page components outside figures (DS §13.5, §13.6, §13.9; plan WO-I5.6)
     ====================================================================================== */

  function reportCheck(box, msg) {
    global.console.error('self-check ' + (box.getAttribute('data-task') || '(no data-task)') + ' ' + msg);
  }
  function prepareReveal(reveal) {
    if (!reveal.hasAttribute('tabindex')) reveal.setAttribute('tabindex', '-1');
    reveal.hidden = true;
  }
  function showReveal(reveal) {
    reveal.hidden = false;
    reveal.focus();
  }
  function initSelfCheck(box) {
    var reveal = null;
    each(box.querySelectorAll('.reveal'), function (r) { if (!reveal) reveal = r; });
    if (!reveal) { reportCheck(box, 'lacks div.reveal'); return; }
    prepareReveal(reveal);
    var itemsBox = box.querySelector('.items');
    var clauseItems = Array.prototype.filter.call(box.querySelectorAll('button.clause[data-item]'), function (b) { return !reveal.contains(b); });
    if (itemsBox || clauseItems.length) initItemsCheck(box, reveal, itemsBox, clauseItems);
    else initSingleCheck(box, reveal);
  }
  function feedbackShow(reveal, pick) {
    each(reveal.querySelectorAll('.feedback'), function (p) { p.hidden = !pick(p); });
  }
  function initSingleCheck(box, reveal) {
    var buttons = Array.prototype.filter.call(box.querySelectorAll('.options button, button.clause'), function (b) {
      return !reveal.contains(b);
    });
    if (!buttons.length) { reportCheck(box, 'has no options'); return; }
    buttons.forEach(function (b, i) {
      b.setAttribute('type', 'button');
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        var opt = b.getAttribute('data-option') || String(i + 1);
        buttons.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        feedbackShow(reveal, function (p) {
          var o = p.getAttribute('data-option');
          return o == null || o === opt;
        });
        showReveal(reveal);
      });
    });
  }
  function initItemsCheck(box, reveal, itemsBox, clauseItems) {
    var items = [], chosen = {}, committed = false;
    clauseItems.forEach(function (b) {
      items.push({ key: b.getAttribute('data-item'), buttons: [b], toggle: true, el: null });
    });
    if (itemsBox) each(itemsBox.querySelectorAll('.item'), function (it, i) {
      items.push({
        key: it.getAttribute('data-item') || String(i + 1), toggle: false, el: it,
        buttons: Array.prototype.slice.call(it.querySelectorAll('.options button, button[data-option]'))
          .filter(function (b, j, list) { return list.indexOf(b) === j; })
      });
    });
    function feedbackOf(item) {
      var out = [];
      each(reveal.querySelectorAll('.feedback[data-item]'), function (p) { if (p.getAttribute('data-item') === item.key) out.push(p); });
      if (item.el) each(item.el.querySelectorAll('.feedback'), function (p) { if (out.indexOf(p) < 0) out.push(p); });
      return out;
    }
    items.forEach(function (item) {
      item.buttons.forEach(function (b, i) {
        b.setAttribute('type', 'button');
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () {
          if (item.toggle) {
            var on = b.getAttribute('aria-pressed') !== 'true';
            b.setAttribute('aria-pressed', String(on));
            chosen[item.key] = on;
          } else {
            item.buttons.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
            chosen[item.key] = b.getAttribute('data-option') || String(i + 1);
          }
          if (committed) feedbackOf(item).forEach(function (p) { p.hidden = true; });
        });
      });
      feedbackOf(item).forEach(function (p) { p.hidden = true; });
    });
    var check = Array.prototype.filter.call(box.querySelectorAll('button.check'), function (b) { return !reveal.contains(b); })[0];
    if (!check) { reportCheck(box, 'has several items and no button.check'); return; }
    check.setAttribute('type', 'button');
    check.addEventListener('click', function () {
      committed = true;
      items.forEach(function (item) {
        feedbackOf(item).forEach(function (p) {
          var show;
          if (item.toggle) show = chosen[item.key] === true || p.hasAttribute('data-overclaims');
          else {
            var o = p.getAttribute('data-option');
            show = chosen[item.key] != null && (o == null || o === chosen[item.key]);
          }
          p.hidden = !show;
        });
      });
      showReveal(reveal);
    });
  }
  function initRulePrompt(box) {
    var reveal = box.querySelector('.reveal');
    if (!reveal) { global.console.error('rule prompt lacks p.reveal'); return; }
    prepareReveal(reveal);
    var buttons = Array.prototype.filter.call(box.querySelectorAll('button'), function (b) {
      return !reveal.contains(b) && !b.classList.contains('preset-link');
    });
    var right = buttons.filter(function (b) { return b.hasAttribute('data-right'); });
    if (right.length !== 1) global.console.error('rule prompt "' + ((box.querySelector('p') || box).textContent || '').trim().slice(0, 60) +
      '" has ' + right.length + ' buttons with data-right, where it needs one');
    function markRight() {
      if (right.length !== 1 || right[0].querySelector('.rule-mark')) return;
      right[0].appendChild(doc.createTextNode(' '));
      right[0].appendChild(el('span', { class: 'rule-mark' }, '(the rule)'));
    }
    buttons.forEach(function (b) {
      b.setAttribute('type', 'button');
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        buttons.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        markRight();
        showReveal(reveal);
      });
    });
  }
  function templateFor(btn) {
    var named = btn.getAttribute('data-template');
    if (named) return doc.getElementById(named);
    for (var n = btn.previousElementSibling; n; n = n.previousElementSibling) if (n.matches('pre.template')) return n;
    var box = btn.closest('section.task') || btn.closest('section') || btn.parentNode;
    return box ? box.querySelector('pre.template') : null;
  }
  function selectText(node) {
    try {
      var range = doc.createRange();
      range.selectNodeContents(node);
      var sel = global.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      return sel;
    } catch (e) { return null; }
  }
  function initCopy(btn) {
    var live = el('span', { class: 'sr-only', 'aria-live': 'polite' });
    insertAfter(btn, live);
    var label = btn.textContent, timer = 0;
    function say(text) {
      live.textContent = '';
      global.setTimeout(function () { live.textContent = text; }, 40);
    }
    btn.setAttribute('type', 'button');
    btn.addEventListener('click', function () {
      var pre = templateFor(btn);
      if (!pre) { global.console.error('copy: no pre.template for "' + label.trim() + '"'); return; }
      var text = pre.textContent;
      function copied() {
        btn.textContent = 'Copied';
        say('Template copied');
        if (timer) global.clearTimeout(timer);
        timer = global.setTimeout(function () { btn.textContent = label; timer = 0; }, 2000);
      }
      function refused() {
        selectText(pre);
        say('Template selected. Copy it with the copy command of your browser.');
      }
      function legacy() {
        var sel = selectText(pre), ok = false;
        try { ok = !!sel && doc.execCommand('copy'); } catch (e) { ok = false; }
        if (ok) { if (sel) sel.removeAllRanges(); copied(); } else refused();
      }
      try {
        var nav = global.navigator;
        if (nav && nav.clipboard && isFn(nav.clipboard.writeText)) nav.clipboard.writeText(text).then(copied, legacy);
        else legacy();
      } catch (e) { refused(); }
    });
  }
  /* A ledger number in the exp10dec form, "10^−1.5", is drawn with a superscript exponent, and its
     printed text stays in data-print for the data-num checks. */
  function renderPowers() {
    each(doc.querySelectorAll('[data-num]'), function (n) {
      if (n.hasAttribute('data-print') || n.children.length) return;
      var t = n.textContent.trim(), m = /^10\^([\u2212-]?[0-9.]+)$/.exec(t);
      if (!m) return;
      n.setAttribute('data-print', t);
      n.textContent = '10';
      n.appendChild(el('sup', null, m[1]));
    });
  }
  function initConceptPopovers() {
    var concepts = TP.concepts;
    if (!concepts) return;
    var targets = doc.querySelectorAll('a[data-concept], dfn[data-concept], span[data-concept]');
    if (!targets.length) return;
    var pop = el('div', { 'class': 'concept-popover', role: 'tooltip', hidden: '' });
    var head = el('div', { 'class': 'concept-popover-head' });
    var titleEl = el('span', { 'class': 'concept-popover-title' });
    var badgeEl = el('span', { 'class': 'concept-popover-badge' });
    var bodyEl = el('p', { 'class': 'concept-popover-body' });
    var footEl = el('div', { 'class': 'concept-popover-foot' });
    head.appendChild(titleEl);
    head.appendChild(badgeEl);
    pop.appendChild(head);
    pop.appendChild(bodyEl);
    pop.appendChild(footEl);
    doc.body.appendChild(pop);

    var active = null;
    var hideTimer = 0;

    function clearTimer() {
      if (hideTimer) { global.clearTimeout(hideTimer); hideTimer = 0; }
    }
    function restoreTitle(node) {
      if (!node) return;
      var saved = node.getAttribute('data-saved-title');
      if (saved != null) {
        node.setAttribute('title', saved);
        node.removeAttribute('data-saved-title');
      }
    }
    function closePop() {
      clearTimer();
      restoreTitle(active);
      active = null;
      pop.hidden = true;
    }
    function scheduleClose() {
      clearTimer();
      hideTimer = global.setTimeout(closePop, 160);
    }
    function openPop(node) {
      var id = node.getAttribute('data-concept');
      var c = id && concepts[id];
      if (!c || c.prior) return;
      clearTimer();
      if (active && active !== node) restoreTitle(active);
      active = node;
      if (node.hasAttribute('title')) {
        node.setAttribute('data-saved-title', node.getAttribute('title'));
        node.removeAttribute('title');
      }
      titleEl.textContent = c.name;
      var gloss = c.gloss || '';
      var m = /\s*\(([^()]+)\)\.$/.exec(gloss);
      bodyEl.textContent = m ? gloss.slice(0, m.index) + '.' : gloss;
      badgeEl.textContent = 'Glossary Term';
      badgeEl.hidden = false;

      footEl.innerHTML = '';
      var LEGACY_MAP = {
        '01-the-tuning-loop.html': '01-the-tuning-loop.html',
        '02-starting-a-project.html': '02-starting-a-project.html',
        '03-batch-size.html': '03-batch-size.html',
        '04-designing-a-round.html': '01-the-tuning-loop.html',
        '05-searching-the-space.html': '04-searching-the-space.html',
        '06-reading-the-results.html': '05-reading-the-results.html',
        '07-adopting-a-change.html': '06-adopting-a-change.html',
        '08-how-long-to-train.html': '07-training-horizon.html',
        '09-training-instabilities.html': '08-training-instabilities.html',
        '10-a-whole-round.html': '06-adopting-a-change.html',
        '11-pipeline-practice.html': '09-pipeline-practice.html'
      };
      var home = c.home || '';
      var hash = home.indexOf('#');
      var rawFile = hash >= 0 ? home.slice(0, hash) : home;
      var pageFile = LEGACY_MAP[rawFile] || rawFile;
      var secId = hash >= 0 ? home.slice(hash + 1) : '';
      var pageEntry = (TP.pages || []).find(function (p) { return p.file === 'pages/' + pageFile; });
      var isDfn = node.tagName.toLowerCase() === 'dfn';

      var linksWrap = el('div', { style: 'display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;align-items:center;' });
      if (isDfn) {
        linksWrap.appendChild(el('span', null, 'Defined in this section'));
      } else if (pageFile) {
        var prefix = siteRoot ? '' : 'pages/';
        var cleanTitle = pageEntry ? pageEntry.title.replace(/^Post\s+\d+\s+[\u2014\-:]\s*/i, '') : pageFile;
        var hrefTarget = prefix + pageFile + (secId ? '#' + secId : '');
        var spanLeft = el('span');
        spanLeft.appendChild(doc.createTextNode('Section: '));
        spanLeft.appendChild(el('a', { href: hrefTarget }, cleanTitle + ' \u2192'));
        linksWrap.appendChild(spanLeft);
      }
      if (c.src && srcUrl(c.src)) {
        linksWrap.appendChild(el('a', {
          href: srcUrl(c.src),
          target: '_blank',
          rel: 'noopener'
        }, 'Playbook source \u2197'));
      }
      footEl.appendChild(linksWrap);

      pop.hidden = false;
      var rects = node.getClientRects && node.getClientRects();
      var r = (rects && rects.length) ? rects[0] : node.getBoundingClientRect();
      var pr = pop.getBoundingClientRect();
      var vw = global.innerWidth || 1024;
      var vh = global.innerHeight || 768;
      var left = Math.max(8, Math.min(vw - pr.width - 8, r.left));
      var top = r.bottom + 8 + pr.height <= vh - 8 ? r.bottom + 8 : Math.max(8, r.top - pr.height - 8);
      pop.style.left = Math.round(left) + 'px';
      pop.style.top = Math.round(top) + 'px';
    }

    pop.addEventListener('pointerenter', clearTimer);
    pop.addEventListener('pointerleave', scheduleClose);
    each(targets, function (node) {
      /* Prevent inline concept terms from looking or acting like navigation hyperlinks */
      if (node.tagName.toLowerCase() === 'a' && node.hasAttribute('href')) {
        node.setAttribute('data-saved-href', node.getAttribute('href'));
        node.removeAttribute('href');
      }
      if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '0');
      node.setAttribute('role', 'button');
      node.addEventListener('pointerenter', function (e) {
        if (e.pointerType === 'touch') return;
        openPop(node);
      });
      node.addEventListener('pointerleave', function (e) {
        if (e.pointerType === 'touch') return;
        scheduleClose();
      });
      node.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (active === node && !pop.hidden) closePop();
        else openPop(node);
      });
      node.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (active === node && !pop.hidden) closePop();
          else openPop(node);
        }
      });
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !pop.hidden) closePop();
    });
    doc.addEventListener('click', function (e) {
      if (!pop.hidden && !pop.contains(e.target) && (!active || !active.contains(e.target))) closePop();
    });
  }

  function initPracticeChecklists() {
    each(doc.querySelectorAll('.practice-card[data-check-id]'), function (card) {
      var cid = 'tp-check-' + card.getAttribute('data-check-id');
      var box = card.querySelector('.practice-check');
      function sync(on) {
        card.classList.toggle('is-checked', !!on);
        if (box) box.setAttribute('aria-checked', String(!!on));
      }
      sync(read(cid) === '1');
      if (box) {
        box.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var next = !card.classList.contains('is-checked');
          sync(next);
          store(cid, next ? '1' : null);
        });
      }
    });
  }

  /* ======================================================================================
     7b. v4 Medium-Native Interactive Components
         - In-Frame Figure Evidence Tabs (initFigureTabs)
         - Interactive Figure Guided Walkthroughs (initFigureTutorials)
         - Synchronized 2-Column Scrollytelling (initScrollyStages)
         - Tangle-Style Scrubbable Inline Numbers (initScrubNumbers)
         - Interactive Symptom-to-Action Decision Trees (initDecisionTrees)
         - Scikit-Learn-Style Playbook Decision Flowchart (initPlaybookMap)
     ====================================================================================== */

  /* ---------- figure tools: one toolbar per figure (2026-11 review) ----------
     A figure keeps its interactive view on screen at all times. Secondary material (the guided
     tour, the Playbook's own figure, the model and assumptions, the data table) opens in a single
     drawer under the toolbar, one item at a time, so the reader can compare it with the plot. */
  function initFigureTabs(scope) {
    var rootEl = scope || doc;
    var rootPrefix = (doc.body && doc.body.getAttribute('data-root')) || '';
    each(rootEl.querySelectorAll('figure.fig, figure.schematic'), function (figEl) {
      if (figEl.querySelector(':scope > .fig-tools')) return;
      var pbImg = figEl.getAttribute('data-playbook-img');
      var pbImg2 = figEl.getAttribute('data-playbook-img2');
      var pbAlt2 = figEl.getAttribute('data-playbook-alt2') || '';
      var pbQuote = figEl.getAttribute('data-playbook-quote');
      var pbCap = figEl.getAttribute('data-playbook-caption') || '';
      var pbSrc = figEl.getAttribute('data-playbook-src') || '';
      var modelDetails = figEl.querySelector(':scope > details.fig-model');
      var tableDetails = figEl.querySelector(':scope > details.fig-table');
      var tutEl = figEl.querySelector(':scope > .fig-tutorial[data-figure]');
      if (!pbImg && !pbQuote && !modelDetails && !tableDetails && !tutEl) return;

      var tools = el('div', { class: 'fig-tools', role: 'group', 'aria-label': 'Figure extras' });
      var drawer = el('div', { class: 'fig-drawer' });
      var items = [];

      function addItem(key, label, pane, onOpen, onClose) {
        var pid = nextId('fig-pane');
        pane.id = pid;
        pane.classList.add('fig-pane');
        pane.setAttribute('hidden', 'hidden');
        pane.setAttribute('data-pane', key);
        var b = el('button', { type: 'button', class: 'fig-tool fig-tool-' + key, 'aria-expanded': 'false', 'aria-controls': pid }, label);
        tools.appendChild(b);
        drawer.appendChild(pane);
        var item = { key: key, btn: b, pane: pane, onOpen: onOpen, onClose: onClose, open: false };
        items.push(item);
        b.addEventListener('click', function () { toggle(item, !item.open); });
        return item;
      }
      function toggle(item, on) {
        items.forEach(function (it) {
          var want = it === item ? on : false;
          if (want === it.open) return;
          it.open = want;
          it.btn.setAttribute('aria-expanded', want ? 'true' : 'false');
          it.btn.classList.toggle('is-active', want);
          if (want) { it.pane.removeAttribute('hidden'); renderMath(it.pane); if (it.onOpen) it.onOpen(); }
          else { it.pane.setAttribute('hidden', 'hidden'); if (it.onClose) it.onClose(); }
        });
        figEl.classList.toggle('drawer-open', items.some(function (it) { return it.open; }));
        scheduleLayout();
      }

      if (tutEl) {
        var tour = buildTour(figEl, tutEl, function () { toggle(tourItem, false); });
        var tourItem = addItem('tour', 'Guided tour · ' + tour.count + ' steps', tutEl, tour.start, tour.stop);
      }
      if (pbImg || pbQuote) {
        var body = el('div', { class: 'fig-pb' });
        if (pbImg && pbImg2) {
          var pair = el('div', { class: 'fig-pb-pair' });
          var imgSrc1 = /^(https?:|\/|\.)/.test(pbImg) ? pbImg : rootPrefix + pbImg;
          var imgSrc2 = /^(https?:|\/|\.)/.test(pbImg2) ? pbImg2 : rootPrefix + pbImg2;
          pair.appendChild(el('img', { src: imgSrc1, alt: pbCap || 'Figure from the Deep Learning Tuning Playbook', loading: 'lazy' }));
          pair.appendChild(el('img', { src: imgSrc2, alt: pbAlt2 || pbCap || 'Second figure from the Deep Learning Tuning Playbook', loading: 'lazy' }));
          body.appendChild(pair);
        } else if (pbImg) {
          var imgSrc = /^(https?:|\/|\.)/.test(pbImg) ? pbImg : rootPrefix + pbImg;
          body.appendChild(el('img', { src: imgSrc, alt: pbCap || 'Figure from the Deep Learning Tuning Playbook', loading: 'lazy' }));
        }
        if (pbQuote) body.appendChild(el('blockquote', { class: 'fig-pb-quote' }, [pbQuote]));
        var cap = el('p', { class: 'fig-pb-caption' });
        if (pbCap) cap.appendChild(doc.createTextNode(pbCap + ' '));
        cap.appendChild(doc.createTextNode('From Godbole et al. (2023), '));
        cap.appendChild(el('em', null, 'Deep Learning Tuning Playbook'));
        cap.appendChild(doc.createTextNode(', CC BY 4.0.'));
        if (pbSrc && srcUrl(pbSrc)) {
          cap.appendChild(doc.createTextNode(' '));
          cap.appendChild(el('a', { href: srcUrl(pbSrc), target: '_blank', rel: 'noopener' }, 'Read the section ↗'));
        }
        body.appendChild(cap);
        addItem('playbook', pbImg ? 'The Playbook’s figure' : 'What the Playbook says', body);
      }
      if (modelDetails) {
        var mp = el('div', { class: 'fig-model-pane' });
        Array.prototype.slice.call(modelDetails.childNodes).forEach(function (n) {
          if (n.nodeName && n.nodeName.toLowerCase() === 'summary') return;
          mp.appendChild(n);
        });
        modelDetails.remove();
        addItem('model', 'How this toy works', mp);
      }
      if (tableDetails) {
        var tp = el('div', { class: 'fig-table-pane' });
        /* the runtime refills this details element on every draw, so it moves whole */
        tableDetails.open = true;
        tp.appendChild(tableDetails);
        addItem('table', 'Data table', tp);
      }

      var anchor = figEl.querySelector(':scope > p.fig-task') || figEl.querySelector(':scope > .fig-head');
      if (anchor) { insertAfter(anchor, tools); insertAfter(tools, drawer); }
      else { figEl.insertBefore(drawer, figEl.firstChild); figEl.insertBefore(tools, drawer); }
    });
  }

  /* The guided tour: closed on load, so the figure's default state and the prose agree. Opening the
     tour applies step 1; closing it restores the figure's defaults. */
  function buildTour(figEl, tutEl, requestClose) {
    var figId = tutEl.getAttribute('data-figure');
    var stepNodes = Array.prototype.slice.call(tutEl.querySelectorAll('.fig-tut-step-data'));
    var steps = stepNodes.map(function (sn, idx) {
      return {
        label: sn.getAttribute('data-label') || ('Step ' + (idx + 1)),
        preset: sn.getAttribute('data-preset') || '',
        params: sn.getAttribute('data-params') || '',
        t: sn.getAttribute('data-t'),
        html: sn.innerHTML
      };
    });
    stepNodes.forEach(function (sn) { sn.remove(); });
    tutEl.innerHTML = '';
    tutEl.classList.add('fig-tour');
    tutEl.setAttribute('aria-live', 'polite');
    var cur = 0;
    var head = el('div', { class: 'fig-tour-head' });
    var dots = el('ol', { class: 'fig-tour-dots', 'aria-label': 'Tour steps' });
    var dotBtns = steps.map(function (st, i) {
      var b = el('button', { type: 'button', class: 'fig-tour-dot', 'aria-label': 'Step ' + (i + 1) + ': ' + st.label, title: st.label }, String(i + 1));
      b.addEventListener('click', function () { go(i); });
      var li = el('li'); li.appendChild(b); dots.appendChild(li);
      return b;
    });
    var label = el('span', { class: 'fig-tour-label' });
    head.appendChild(dots); head.appendChild(label);
    var text = el('div', { class: 'fig-tour-text' });
    var nav = el('div', { class: 'fig-tour-nav' });
    var prev = el('button', { type: 'button', class: 'fig-tour-btn' }, '← Back');
    var next = el('button', { type: 'button', class: 'fig-tour-btn is-primary' }, 'Next →');
    var done = el('button', { type: 'button', class: 'fig-tour-btn fig-tour-exit' }, 'End tour');
    prev.addEventListener('click', function () { if (cur > 0) go(cur - 1); });
    next.addEventListener('click', function () { if (cur < steps.length - 1) go(cur + 1); else requestClose(); });
    done.addEventListener('click', requestClose);
    nav.appendChild(prev); nav.appendChild(next); nav.appendChild(done);
    tutEl.appendChild(head); tutEl.appendChild(text); tutEl.appendChild(nav);
    tutEl.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowRight' && cur < steps.length - 1) { go(cur + 1); ev.preventDefault(); }
      else if (ev.key === 'ArrowLeft' && cur > 0) { go(cur - 1); ev.preventDefault(); }
      else if (ev.key === 'Escape') { requestClose(); ev.preventDefault(); }
    });
    function entry() { return TP.figures && TP.figures[figId]; }
    function go(i) {
      cur = Math.max(0, Math.min(steps.length - 1, i));
      var st = steps[cur];
      dotBtns.forEach(function (b, j) {
        b.classList.toggle('is-active', j === cur);
        b.classList.toggle('is-done', j < cur);
        if (j === cur) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      label.textContent = 'Step ' + (cur + 1) + ' of ' + steps.length + ' · ' + st.label;
      prev.disabled = cur === 0;
      next.textContent = cur === steps.length - 1 ? 'Finish' : 'Next →';
      text.innerHTML = st.html;
      renderMath(text);
      var en = entry();
      var fig = en && (en.fig || en);
      if (!fig) return;
      try {
        if (isFn(fig.defaults) && isFn(fig.set) && (st.params || (!st.preset && st.t != null))) {
          var base = fig.defaults();
          if (st.preset && isFn(fig.preset)) fig.preset(st.preset, { now: false });
          if (st.params) {
            var parsed = JSON.parse(st.params);
            var target = st.preset ? parsed : Object.assign(base, parsed);
            fig.set(target, { now: false });
          } else if (!st.preset) {
            fig.set(base, { now: false });
          }
        } else {
          if (st.preset && isFn(fig.preset)) fig.preset(st.preset, { now: false });
          else if (st.preset && isFn(en.preset)) en.preset(st.preset);
          if (st.params && isFn(fig.set)) fig.set(JSON.parse(st.params), { now: false });
          else if (st.params && isFn(en.set)) en.set(JSON.parse(st.params));
        }
        if (st.t != null && st.t !== '' && en.run && isFn(en.run.scrub)) {
          var lim = isFn(en.run.limit) ? en.run.limit() : en.run.limit;
          if (finite(lim) && +st.t > lim && global.console) console.error('TP.tour: ' + figId + ' step ' + (cur + 1) + ' data-t=' + st.t + ' exceeds the run limit ' + lim + ' (data-t counts run steps, not training steps)');
          en.run.scrub(+st.t);
        }
      } catch (e) { if (global.console) console.warn('tour step failed', figId, e); }
    }
    function pulseStepOne() {
      var targets = figEl.querySelectorAll('.fig-dock, .fig-controls-more, .fig-side, .fig-readout, .p03-controls, .p03-readout');
      each(targets, function (n) {
        n.classList.remove('is-tour-pulse');
        void n.offsetWidth;
        n.classList.add('is-tour-pulse');
      });
    }
    return {
      count: steps.length,
      start: function () { go(0); pulseStepOne(); var fb = dotBtns[0]; if (fb) fb.focus({ preventScroll: true }); },
      stop: function () {
        var en = entry();
        try { if (en && isFn(en.reset)) en.reset(); } catch (e) {}
      }
    };
  }

  /* kept for the test hooks and older pages: the tour is built by initFigureTabs */
  function initFigureTutorials() {}


  function initScrollyStages(scope) {
    var rootEl = scope || doc;
    each(rootEl.querySelectorAll('.scrolly-stage[data-figure]'), function (stage) {
      var figId = stage.getAttribute('data-figure');
      var steps = Array.prototype.slice.call(stage.querySelectorAll('.scrolly-step'));
      if (!steps.length) return;

      function triggerStep(stepEl) {
        steps.forEach(function (s) {
          var active = s === stepEl;
          s.classList.toggle('is-active', active);
          s.setAttribute('aria-current', active ? 'step' : 'false');
        });
        var entry = TP.figures && TP.figures[figId];
        var fig = entry && (entry.fig || entry);
        if (!fig) return;
        var preset = stepEl.getAttribute('data-step-preset');
        var paramsJson = stepEl.getAttribute('data-step-params');
        var runT = stepEl.getAttribute('data-step-t');
        if (preset && isFn(fig.preset)) {
          fig.preset(preset);
        }
        if (paramsJson && isFn(fig.set)) {
          try {
            var parsed = JSON.parse(paramsJson);
            fig.set(parsed);
          } catch (e) {}
        }
        if (runT != null && entry.run && isFn(entry.run.scrub)) {
          entry.run.scrub(+runT);
        }
      }

      steps.forEach(function (stepEl) {
        if (!stepEl.hasAttribute('tabindex')) stepEl.setAttribute('tabindex', '0');
        stepEl.addEventListener('click', function (ev) {
          if (ev.target && ev.target.closest && ev.target.closest('a, button')) return;
          triggerStep(stepEl);
        });
        stepEl.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            triggerStep(stepEl);
          }
        });
      });

      if ('IntersectionObserver' in global) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting && en.intersectionRatio >= 0.45) {
              triggerStep(en.target);
            }
          });
        }, { rootMargin: '-22% 0px -38% 0px', threshold: [0.45, 0.65] });
        steps.forEach(function (s) { io.observe(s); });
      }
    });
  }

  function initScrubNumbers(scope) {
    var rootEl = scope || doc;
    each(rootEl.querySelectorAll('.scrub-calculator'), function (calc) {
      var vars = {};
      var scrubEls = Array.prototype.slice.call(calc.querySelectorAll('.scrub-num[data-var]'));
      var outEls = Array.prototype.slice.call(calc.querySelectorAll('.scrub-out[data-formula]'));
      if (!scrubEls.length) return;

      function formatVal(val, fmtKind) {
        if (!isFinite(val)) return '\u2014';
        if (fmtKind === 'int') return Math.round(val).toLocaleString('en-US');
        if (fmtKind === 'pct0') return Math.round(val * 100) + '%';
        if (fmtKind === 'pct1') return (val * 100).toFixed(1) + '%';
        if (fmtKind === 'fixed1') return val.toFixed(1);
        if (fmtKind === 'fixed2') return val.toFixed(2);
        if (fmtKind === 'fixed3') return val.toFixed(3);
        if (fmtKind === 'sig3') return Number(val.toPrecision(3)).toLocaleString('en-US');
        return Number(val.toFixed(2)).toLocaleString('en-US');
      }

      scrubEls.forEach(function (sEl) {
        if (sEl.querySelector('.scrub-val-text')) return;
        sEl.innerHTML = '';
        var decBtn = el('button', { type: 'button', class: 'scrub-step-btn scrub-dec', 'aria-label': 'Decrease value', title: 'Click to decrease' }, '\u2212');
        var dragSpan = el('span', { class: 'scrub-val-drag', title: 'Drag left/right or click \u2212/+ buttons to adjust' }, [
          el('span', { class: 'scrub-grip', 'aria-hidden': 'true' }, '\u21c4'),
          el('span', { class: 'scrub-val-text' })
        ]);
        var incBtn = el('button', { type: 'button', class: 'scrub-step-btn scrub-inc', 'aria-label': 'Increase value', title: 'Click to increase' }, '+');
        sEl.appendChild(decBtn);
        sEl.appendChild(dragSpan);
        sEl.appendChild(incBtn);
      });

      function updateAll() {
        scrubEls.forEach(function (sEl) {
          var name = sEl.getAttribute('data-var');
          var v = parseFloat(sEl.getAttribute('data-value'));
          var min = parseFloat(sEl.getAttribute('data-min') || '1');
          var max = parseFloat(sEl.getAttribute('data-max') || '100');
          vars[name] = isFinite(v) ? v : 0;
          var fmtKind = sEl.getAttribute('data-format') || 'int';
          var unit = sEl.getAttribute('data-unit') || '';
          var txtNode = sEl.querySelector('.scrub-val-text') || sEl;
          txtNode.textContent = formatVal(vars[name], fmtKind) + (unit ? ' ' + unit : '');
          sEl.setAttribute('aria-valuenow', String(vars[name]));
          var pct = max > min ? Math.max(4, Math.min(100, ((vars[name] - min) / (max - min)) * 100)) : 50;
          sEl.style.setProperty('--scrub-pct', pct.toFixed(1) + '%');
        });
        outEls.forEach(function (oEl) {
          var expr = oEl.getAttribute('data-formula');
          var fmtKind = oEl.getAttribute('data-format') || 'fixed1';
          var unit = oEl.getAttribute('data-unit') || '';
          try {
            var keys = Object.keys(vars);
            var vals = keys.map(function (k) { return vars[k]; });
            var fn = new Function(keys.join(','), 'return (' + expr + ');');
            var res = fn.apply(null, vals);
            oEl.textContent = formatVal(res, fmtKind) + (unit ? ' ' + unit : '');
          } catch (e) {}
        });
      }

      scrubEls.forEach(function (sEl) {
        sEl.setAttribute('tabindex', '0');
        sEl.setAttribute('role', 'spinbutton');
        var min = parseFloat(sEl.getAttribute('data-min') || '1');
        var max = parseFloat(sEl.getAttribute('data-max') || '100');
        var step = parseFloat(sEl.getAttribute('data-step') || '1');
        sEl.setAttribute('aria-valuemin', String(min));
        sEl.setAttribute('aria-valuemax', String(max));

        function setVal(next) {
          var snapped = Math.round((next - min) / step) * step + min;
          var clamped = Math.max(min, Math.min(max, Number(snapped.toFixed(6))));
          sEl.setAttribute('data-value', String(clamped));
          updateAll();
        }

        var decBtn = sEl.querySelector('.scrub-dec');
        var incBtn = sEl.querySelector('.scrub-inc');
        var dragZone = sEl.querySelector('.scrub-val-drag') || sEl;

        if (decBtn) {
          decBtn.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            var cur = parseFloat(sEl.getAttribute('data-value') || String(min));
            setVal(cur - step);
          });
        }
        if (incBtn) {
          incBtn.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            var cur = parseFloat(sEl.getAttribute('data-value') || String(min));
            setVal(cur + step);
          });
        }

        sEl.addEventListener('keydown', function (ev) {
          var cur = parseFloat(sEl.getAttribute('data-value') || String(min));
          if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') {
            ev.preventDefault();
            setVal(cur + step);
          } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') {
            ev.preventDefault();
            setVal(cur - step);
          }
        });

        var startX = 0, startVal = 0, dragging = false;
        dragZone.addEventListener('pointerdown', function (ev) {
          ev.preventDefault();
          dragging = true;
          startX = ev.clientX;
          startVal = parseFloat(sEl.getAttribute('data-value') || String(min));
          sEl.classList.add('is-scrubbing');
          if (dragZone.setPointerCapture) {
            try { dragZone.setPointerCapture(ev.pointerId); } catch (e) {}
          }
        });
        dragZone.addEventListener('pointermove', function (ev) {
          if (!dragging) return;
          var dx = ev.clientX - startX;
          var stepsMoved = Math.round(dx / 8);
          setVal(startVal + stepsMoved * step);
        });
        function endDrag() {
          if (!dragging) return;
          dragging = false;
          sEl.classList.remove('is-scrubbing');
        }
        dragZone.addEventListener('pointerup', endDrag);
        dragZone.addEventListener('pointercancel', endDrag);
      });

      updateAll();
    });
  }

  function initDecisionTrees(scope) {
    var rootEl = scope || doc;
    each(rootEl.querySelectorAll('.decision-tree'), function (tree) {
      var options = Array.prototype.slice.call(tree.querySelectorAll('.dt-option[data-target]'));
      var outcomes = Array.prototype.slice.call(tree.querySelectorAll('.dt-outcome[id]'));
      if (!options.length || !outcomes.length) return;

      function selectOption(btn) {
        var targetId = btn.getAttribute('data-target');
        var group = btn.closest('.dt-step') || tree;
        each(group.querySelectorAll('.dt-option'), function (b) {
          var on = b === btn;
          b.classList.toggle('is-selected', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        outcomes.forEach(function (out) {
          var match = out.id === targetId;
          out.classList.toggle('is-active', match);
          if (match) out.removeAttribute('hidden');
          else out.setAttribute('hidden', 'hidden');
        });
        var figId = btn.getAttribute('data-figure');
        var preset = btn.getAttribute('data-preset');
        if (figId && preset && TP.figures && TP.figures[figId] && TP.figures[figId].fig) {
          TP.figures[figId].fig.preset(preset);
        }
      }

      options.forEach(function (btn) {
        btn.addEventListener('click', function () { selectOption(btn); });
      });
    });
  }

  /* the decision flowchart lives in js/components/playbook-map.js, which registers
     TP.initPlaybookMap; pages without the map do not load it */
  function initPlaybookMap(scope) { if (isFn(TP.initPlaybookMapImpl)) TP.initPlaybookMapImpl(scope); }

  TP._helpers = { siteRoot: siteRoot, el: el, each: each, srcUrl: srcUrl, renderMath: renderMath, link: link, nextId: nextId };
  TP.initFigureTabs = initFigureTabs;
  TP.initFigureTutorials = initFigureTutorials;
  TP.initScrollyStages = initScrollyStages;
  TP.initScrubNumbers = initScrubNumbers;
  TP.initDecisionTrees = initDecisionTrees;
  TP.initPlaybookMap = initPlaybookMap;

  function initComponents() {
    renderPowers();
    each(doc.querySelectorAll('div.self-check'), initSelfCheck);
    each(doc.querySelectorAll('div.rule-prompt'), initRulePrompt);
    each(doc.querySelectorAll('button.copy'), initCopy);
    initConceptPopovers();
    initPracticeChecklists();
    initScrubNumbers();
    initDecisionTrees();
    initPlaybookMap();
  }

  /* ======================================================================================
     8. Boot
     ====================================================================================== */

  doc.addEventListener('DOMContentLoaded', function () {
    markNotes();
    buildHeader();
    buildSourceMarks();
    buildCitations();
    buildSidenotes();
    numberFigures();
    buildPageTOC();
    buildPager();
    renderMath(doc.querySelector('main'));
    initComponents();
    doc.addEventListener('click', onPresetLink);
    renderStandardNumbers();
    doc.dispatchEvent(new CustomEvent('tp:ready'));
    initFigureTabs();
    initFigureTutorials();
    initScrollyStages();
    checkRegistrations();
    checkPresetLinks();
    initRecaps();
    layoutSidenotes();
    nameScrollers();
    /* figures render after tp:ready and change the page height; lay the notes out again */
    global.setTimeout(layoutSidenotes, 50);
    global.setTimeout(layoutSidenotes, 400);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(layoutSidenotes);
    global.addEventListener('resize', function () {
      if (degenerateViewport()) return;
      scheduleLayout(); measureHeader();
    });
    global.addEventListener('scroll', schedulePadding, { passive: true });
    listenMQ(phoneQuery, function () {
      if (degenerateViewport()) return;
      FIGURES.forEach(function (f) { f._relayout(); });
      measureHeader();
    });
    if (global.ResizeObserver) new ResizeObserver(scheduleLayout).observe(doc.body);
    /* details toggles and figure updates change heights */
    doc.addEventListener('toggle', scheduleLayout, true);
    doc.addEventListener('tp:figure', scheduleLayout);
    measureHeader();
  });
})(typeof window !== 'undefined' ? window : globalThis);
