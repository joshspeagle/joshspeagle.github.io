/* Process flowchart data for Notes on the Deep Learning Tuning Playbook.
 * Consumed by /assets/blog/js/flowmap.js.
 */
(function (global) {
  'use strict';
  var Blog = global.Blog = global.TP = global.Blog || global.TP || {};
  var PB = 'https://github.com/google-research/tuning_playbook#';
  var PHASES = [
    { id: 'setup', n: 1, name: 'Set up the project' },
    { id: 'plan', n: 2, name: 'Plan a round of experiments' },
    { id: 'read', n: 3, name: 'Read the results' },
    { id: 'decide', n: 4, name: 'Decide, then start the next round' }
  ];

  /* Each step: phase, kind (action or decision), the label drawn in the chart (two short lines),
     a title, a plain-English explanation, one sentence on the Playbook's position with its
     section anchor, links into the posts, and the next steps. posts[0] is the post whose number
     the badge shows. */
  var STEPS = [
    { id: 's_arch', phase: 'setup', kind: 'action', posts: [2],
      label: ['Start from a proven', 'architecture'],
      title: 'Start from an architecture that already works',
      what: 'Reuse a well-established model family for your kind of problem, ideally one from a paper that tackles a closely related task. A known architecture gives you a baseline whose behavior other people have already characterized. You can build a custom model later.',
      pb: { text: 'The Playbook recommends reusing a model that already works when a project starts.', anchor: 'choosing-the-model-architecture' },
      links: [{ post: 2, hash: 'architecture', label: 'Choosing the architecture' }],
      next: [{ target: 's_opt' }] },
    { id: 's_opt', phase: 'setup', kind: 'action', posts: [2],
      label: ['Use a popular', 'optimizer'],
      title: 'Use the most popular optimizer for the problem',
      what: 'Pick an optimizer that is widely used for the same type of problem, such as SGD with momentum or Adam. Every hyperparameter of the optimizer can matter, so in the early rounds an optimizer with fewer free hyperparameters takes less tuning effort.',
      pb: { text: 'The Playbook recommends well-established, popular optimizers and asks you to be prepared to tune all of their hyperparameters.', anchor: 'choosing-the-optimizer' },
      links: [{ post: 2, hash: 'optimizer', label: 'Choosing the optimizer' }],
      next: [{ target: 's_batch' }] },
    { id: 's_batch', phase: 'setup', kind: 'action', posts: [3],
      label: ['Pick the batch size', 'for training speed'],
      title: 'Choose the batch size for training speed',
      what: 'The batch size sets how fast training runs and how much compute it uses. With the other hyperparameters re-tuned and enough training steps, any batch size should reach the same final validation performance, so you choose it for speed and leave it out of tuning for validation error.',
      pb: { text: 'The Playbook states that the batch size governs training speed and should not be tuned to improve validation performance directly.', anchor: 'choosing-the-batch-size' },
      links: [{ post: 3, hash: 'controls', label: 'What the batch size controls' }, { post: 3, hash: 'feasible', label: 'Finding the feasible batch sizes' }],
      next: [{ target: 's_init' }] },
    { id: 's_init', phase: 'setup', kind: 'action', posts: [2, 7],
      label: ['Set a simple first', 'configuration'],
      title: 'Set a simple, fast first configuration',
      what: 'Before tuning, fix a starting point: the model size, the optimizer hyperparameters and a provisional number of training steps. Keep it simple (a constant learning rate and no optional features) and cheap enough to run many times. It needs to do much better than chance on the validation set.',
      pb: { text: 'The Playbook’s guiding principle is a simple, relatively fast, low-resource configuration that obtains a reasonable result.', anchor: 'choosing-the-initial-configuration' },
      links: [{ post: 2, hash: 'initial', label: 'The initial configuration' }, { post: 2, hash: 'step-budget', label: 'A provisional step budget' }, { post: 7, hash: 'regimes', label: 'How long to train' }],
      next: [{ target: 's_pipe' }] },
    { id: 's_pipe', phase: 'setup', kind: 'action', posts: [9],
      label: ['Check the pipeline', 'and evaluation'],
      title: 'Check the pipeline and the evaluation',
      what: 'Make sure the input pipeline is not the bottleneck, periodic evaluation runs on a sensible sample, the best checkpoints are saved and every run is tracked. A bug at this stage affects every comparison made later.',
      pb: { text: 'The Playbook collects this advice in its additional guidance for the training pipeline.', anchor: 'additional-guidance-for-the-training-pipeline' },
      links: [{ post: 9, hash: 'pipeline', label: 'Verifying the pipeline' }, { post: 9, hash: 'evaluation', label: 'Setting up evaluation' }],
      next: [{ target: 'p_goal', label: 'Plan the first round' }] },

    { id: 'p_goal', phase: 'plan', kind: 'action', posts: [1],
      label: ['Pick one goal', 'for the round'],
      title: 'Pick one narrow goal for the round',
      what: 'Each round of experiments answers one question, such as whether a new regularizer helps or how much the activation function matters. If a round tries several changes at once, their effects cannot be separated.',
      pb: { text: 'The Playbook asks that each round have a clear goal, narrow enough that the experiments can make progress toward it.', anchor: 'choosing-the-goal-for-the-next-round-of-experiments' },
      links: [{ post: 1, hash: 'incremental', label: 'The incremental tuning loop' }],
      next: [{ target: 'p_roles' }] },
    { id: 'p_roles', phase: 'plan', kind: 'action', posts: [1],
      label: ['Assign roles to', 'hyperparameters'],
      title: 'Sort the hyperparameters into roles',
      what: 'The scientific hyperparameters are the ones whose effect the round measures. The nuisance hyperparameters, such as the learning rate, are re-tuned for each scientific value so the comparison is fair. The fixed hyperparameters are held constant, which limits how far the conclusion generalizes.',
      pb: { text: 'The Playbook calls these scientific, nuisance and fixed hyperparameters.', anchor: 'identifying-scientific-nuisance-and-fixed-hyperparameters' },
      links: [{ post: 1, hash: 'roles', label: 'Scientific, nuisance and fixed roles' }],
      next: [{ target: 'p_space' }] },
    { id: 'p_space', phase: 'plan', kind: 'action', posts: [1],
      label: ['Choose the search', 'space and budget'],
      title: 'Choose the search space and the trial budget',
      what: 'Decide the range of each nuisance hyperparameter (the learning rate is usually searched on a log scale) and how many trials each scientific value gets. Wider ranges and more nuisance hyperparameters make the comparison more trustworthy and cost more trials.',
      pb: { text: 'The Playbook describes this as a balance between informative and affordable experiments.', anchor: 'striking-a-balance-between-informative-and-affordable-experiments' },
      links: [{ post: 1, hash: 'budget', label: 'Sizing the search space and budget' }],
      next: [{ target: 'p_search' }] },
    { id: 'p_search', phase: 'plan', kind: 'action', posts: [4],
      label: ['Run a quasi-random', 'search'],
      title: 'Run the study with quasi-random search',
      what: 'Quasi-random search spreads trials across the search space more evenly than random search, without the repeated values of a grid. It samples non-adaptively, so you can change the scoring metric afterwards without re-running anything, and its even coverage makes the results easier to interpret.',
      pb: { text: 'The Playbook prefers quasi-random search while exploring and Bayesian optimization once exploration is over.', anchor: 'why-use-quasi-random-search-instead-of-more-sophisticated-black-box-optimization-algorithms-during-the-exploration-phase-of-tuning' },
      links: [{ post: 4, hash: 'quasi-random', label: 'Grid, random and quasi-random search' }, { post: 4, hash: 'trials', label: 'How many trials a study needs' }],
      next: [{ target: 'r_score', label: 'Read the results' }] },

    { id: 'r_score', phase: 'read', kind: 'action', posts: [1, 9],
      label: ['Score each trial at', 'its best checkpoint'],
      title: 'Score each trial at its best checkpoint',
      what: 'Train each run for a fixed number of steps, keep the few best checkpoints seen along the way, and score the run by the best one. The final checkpoint is often worse, because validation error fluctuates or rises late in training.',
      pb: { text: 'The Playbook calls this retrospective optimal checkpoint selection.', anchor: 'saving-checkpoints-and-retrospectively-selecting-the-best-checkpoint' },
      links: [{ post: 1, hash: 'trial-result', label: 'Scoring a single run' }, { post: 9, hash: 'checkpoints', label: 'Checkpoints and tracking' }],
      next: [{ target: 'r_curves' }] },
    { id: 'r_curves', phase: 'read', kind: 'decision', posts: [5],
      label: ['Are the training', 'curves healthy?'],
      title: 'Are the training curves healthy?',
      what: 'Before reading off the winner, look at the training and validation curves of the best trials. Loss that rises during training, runs that diverge, or many failed trials point to an optimization problem. Overfitting and noisy curves late in training also show up here.',
      pb: { text: 'The Playbook’s checklist asks whether the model shows optimization issues and what the curves of the best trials reveal.', anchor: 'examining-the-training-curves' },
      links: [{ post: 5, hash: 'curves', label: 'Reading training curves' }],
      next: [{ answer: 'Yes', target: 'r_space', label: 'The curves look healthy' }, { answer: 'No', target: 'r_instab', label: 'Training is unstable' }] },
    { id: 'r_instab', phase: 'read', kind: 'action', posts: [8],
      label: ['Fix the instability', '(warmup, clipping)'],
      title: 'Fix the instability first',
      what: 'Instability matters when it forces you to use a learning rate that is too small. Learning-rate warmup helps with instability early in training, and gradient clipping helps both early and in the middle of training. Lowering the learning rate is the last resort. Re-run the study once training is stable.',
      pb: { text: 'The Playbook advises fixing optimization difficulties before trying other changes.', anchor: 'how-can-optimization-failures-be-debugged-and-mitigated' },
      links: [{ post: 8, hash: 'what', label: 'When instability matters' }, { post: 8, hash: 'warmup', label: 'Learning-rate warmup' }, { post: 8, hash: 'clipping', label: 'Gradient clipping' }],
      next: [{ target: 'p_search', label: 'Re-run the study' }] },
    { id: 'r_space', phase: 'read', kind: 'decision', posts: [5],
      label: ['Is the search', 'space adequate?'],
      title: 'Is the search space adequate?',
      what: 'Check that the best trials sit away from the edges of the search space, that the space was sampled densely enough and that most trials completed. When the best point is near a boundary, the optimum may lie outside the space.',
      pb: { text: 'The Playbook recommends a new study with an expanded search space when the best point is near a boundary.', anchor: 'identifying-bad-search-space-boundaries' },
      links: [{ post: 5, hash: 'boundaries', label: 'Search-space boundaries' }, { post: 5, hash: 'density', label: 'Sampling density' }],
      next: [{ answer: 'Yes', target: 'r_iso', label: 'The space contains the optimum' }, { answer: 'No', target: 'p_space', label: 'Widen or resample the space' }] },
    { id: 'r_iso', phase: 'read', kind: 'action', posts: [5],
      label: ['Compare candidates', 'with isolation plots'],
      title: 'Compare candidates with isolation plots',
      what: 'An isolation plot shows, for each value of the scientific hyperparameter, the best validation error once the nuisance hyperparameters have been tuned for that value. Comparing these best cases is fairer than comparing runs that share a single learning rate.',
      pb: { text: 'The Playbook uses isolation plots to decide whether a change is useful.', anchor: 'detecting-whether-a-change-is-useful-with-isolation-plots' },
      links: [{ post: 5, hash: 'isolation', label: 'Isolation plots' }],
      next: [{ target: 'd_adopt', label: 'Decide' }] },

    { id: 'd_adopt', phase: 'decide', kind: 'decision', posts: [6],
      label: ['Is the gain real', 'and worth it?'],
      title: 'Is the improvement real and worth it?',
      what: 'Two runs with the same hyperparameters and different random seeds give different results, so a small gain can be chance. Re-running the best trial a few times shows how large this run-to-run variation is. Adopt the change if it beats the baseline once that variation is accounted for and the gain outweighs the complexity it adds.',
      pb: { text: 'The Playbook recommends adopting a change that beats the baseline after accounting for retrain variance, provided the improvement outweighs the added complexity.', anchor: 'determining-whether-to-adopt-a-training-pipeline-change-or-hyperparameter-configuration' },
      links: [{ post: 6, hash: 'variance', label: 'Sources of variation' }, { post: 6, hash: 'reruns', label: 'Re-running the best trial' }],
      next: [{ answer: 'Yes', target: 'd_yes', label: 'Adopt the change' }, { answer: 'No', target: 'd_no', label: 'Keep the baseline' }] },
    { id: 'd_yes', phase: 'decide', kind: 'action', posts: [6],
      label: ['Adopt it as the', 'new baseline'],
      title: 'Adopt the change as the new baseline',
      what: 'The improved configuration becomes the baseline that the next round compares against. The Playbook calls each update of the best configuration a launch.',
      pb: { text: 'The Playbook asks for strong evidence behind each launch, so that unnecessary complexity does not accumulate.', anchor: 'the-incremental-tuning-strategy' },
      links: [{ post: 6, hash: 'after', label: 'The complexity tax' }],
      next: [{ target: 'd_explore' }] },
    { id: 'd_no', phase: 'decide', kind: 'action', posts: [6],
      label: ['Keep the current', 'baseline'],
      title: 'Keep the current baseline',
      what: 'A change that does not clear the bar is left out, which keeps the pipeline simple. The round still produced information about which hyperparameters mattered and where the good region of the search space lies.',
      pb: { text: 'The Playbook stresses that most rounds aim at insight into the problem.', anchor: 'exploration-vs-exploitation' },
      links: [{ post: 1, hash: 'incremental', label: 'Why every round teaches something' }, { post: 6, hash: 'after', label: 'The complexity tax' }],
      next: [{ target: 'd_explore' }] },
    { id: 'd_explore', phase: 'decide', kind: 'decision', posts: [6],
      label: ['Keep exploring?'],
      title: 'Keep exploring?',
      what: 'Most rounds are exploration: they establish which hyperparameters matter, which interact and which can be fixed. Once those questions are answered and the search space is well understood, the priority shifts to producing the single best configuration.',
      pb: { text: 'The Playbook advises spending most of the time on exploration and comparatively little on exploitation.', anchor: 'exploration-vs-exploitation' },
      links: [{ post: 6, hash: 'after', label: 'When exploration ends' }],
      next: [{ answer: 'Yes', target: 'p_goal', label: 'Start the next round' }, { answer: 'No', target: 'd_final', label: 'Exploration is done' }] },
    { id: 'd_final', phase: 'decide', kind: 'action', posts: [4, 7],
      label: ['Final tuning and', 'the longest runs'],
      title: 'Final tuning and the longest runs',
      what: 'With a refined search space, a Bayesian optimization tool searches for the best configuration with as large a budget as you can afford. When training is compute-bound, the last round uses the longest runs. This is also the point to check performance on the test set.',
      pb: { text: 'The Playbook recommends Bayesian optimization tools once exploration is done.', anchor: 'after-exploration-concludes' },
      links: [{ post: 4, hash: 'why-not-bo', label: 'When Bayesian optimization fits' }, { post: 7, hash: 'bound', label: 'Tuning in rounds of increasing length' }],
      next: [] }
  ];

  /* ---------- geometry of the wide view (SVG user units; drawn at about 1:1) ---------- */
  var VBW = 1000, VBH = 664;
  var COLS = [124, 314, 504, 694, 884];
  var NW = 166, NH = 56, TIP = 13;
  var BANDS = {
    setup: { top: 0, bottom: 100 },
    plan: { top: 128, bottom: 228 },
    read: { top: 256, bottom: 428 },
    decide: { top: 456, bottom: 628 }
  };
  function rowA(ph) { return BANDS[ph].top + 60; }
  function rowB(ph) { return BANDS[ph].top + 132; }
  function mid(ph) { return BANDS[ph].top + 96; }
  /* x centres: the setup and plan bands use even columns; the read and decide bands spread their
     nodes so that the Yes/No labels between decisions have room */
  var POS = {
    s_arch: [COLS[0], rowA('setup')], s_opt: [COLS[1], rowA('setup')], s_batch: [COLS[2], rowA('setup')], s_init: [COLS[3], rowA('setup')], s_pipe: [COLS[4], rowA('setup')],
    p_goal: [COLS[0], rowA('plan')], p_roles: [COLS[1], rowA('plan')], p_space: [COLS[2], rowA('plan')], p_search: [COLS[3], rowA('plan')],
    r_score: [124, rowA('read')], r_curves: [324, rowA('read')], r_space: [544, rowA('read')], r_iso: [764, rowA('read')], r_instab: [324, rowB('read')],
    d_adopt: [124, mid('decide')], d_yes: [354, rowA('decide')], d_no: [354, rowB('decide')], d_explore: [584, mid('decide')], d_final: [854, mid('decide')]
  };
  /* return markers: small labelled tags that send the reader back up the chart */
  var RETURNS = [
    { id: 'ret_rerun', from: 'r_instab', target: 'p_search', x: 124, y: rowB('read'), text: '\u21BA Re-run the study' },
    { id: 'ret_space', from: 'r_space', target: 'p_space', x: 544, y: rowB('read'), text: '\u21BA Revise the space' }
  ];

  function xy(id) { var p = POS[id]; return { x: p[0], y: p[1] }; }
  function L(id) { return xy(id).x - NW / 2; }
  function R(id) { return xy(id).x + NW / 2; }
  function T(id) { return xy(id).y - NH / 2; }
  function B(id) { return xy(id).y + NH / 2; }
  function pts(list) { return list.map(function (p) { return p[0] + ',' + p[1]; }).join(' '); }

  /* edges: from, to, points, optional label and label position */
  function buildEdges() {
    var E = [];
    function e(from, to, points, label, lx, ly, cls) { E.push({ from: from, to: to, points: points, label: label || '', lx: lx, ly: ly, cls: cls || '' }); }
    function right(a, b, label) {
      var y = xy(a).y;
      e(a, b, [[R(a), y], [L(b) - 2, y]], label, (R(a) + L(b)) / 2, y - 8);
    }
    function wrap(a, b, yGap) {
      e(a, b, [[xy(a).x, B(a)], [xy(a).x, yGap], [xy(b).x, yGap], [xy(b).x, T(b) - 2]], '', 0, 0, 'is-wrap');
    }
    right('s_arch', 's_opt'); right('s_opt', 's_batch'); right('s_batch', 's_init'); right('s_init', 's_pipe');
    wrap('s_pipe', 'p_goal', 114);
    right('p_goal', 'p_roles'); right('p_roles', 'p_space'); right('p_space', 'p_search');
    wrap('p_search', 'r_score', 242);
    right('r_score', 'r_curves'); right('r_curves', 'r_space', 'Yes'); right('r_space', 'r_iso', 'Yes');
    e('r_curves', 'r_instab', [[xy('r_curves').x, B('r_curves')], [xy('r_instab').x, T('r_instab') - 2]], 'No', xy('r_curves').x + 18, (B('r_curves') + T('r_instab')) / 2 + 4);
    var rr = RETURNS[0], rs = RETURNS[1];
    e('r_instab', rr.id, [[L('r_instab'), xy('r_instab').y], [rr.x + 76 + 2, rr.y]], '', 0, 0, 'is-return');
    e('r_space', rs.id, [[xy('r_space').x, B('r_space')], [rs.x, rs.y - 17 - 2]], 'No', xy('r_space').x + 18, (B('r_space') + rs.y - 17) / 2 + 4, 'is-return');
    wrap('r_iso', 'd_adopt', 442);
    var ax = (R('d_adopt') + L('d_yes')) / 2;
    e('d_adopt', 'd_yes', [[R('d_adopt'), xy('d_adopt').y], [ax, xy('d_adopt').y], [ax, xy('d_yes').y], [L('d_yes') - 2, xy('d_yes').y]], 'Yes', (ax + L('d_yes')) / 2, xy('d_yes').y - 7);
    e('d_adopt', 'd_no', [[R('d_adopt'), xy('d_adopt').y], [ax, xy('d_adopt').y], [ax, xy('d_no').y], [L('d_no') - 2, xy('d_no').y]], 'No', (ax + L('d_no')) / 2, xy('d_no').y - 7);
    var cx = (R('d_yes') + L('d_explore')) / 2;
    e('d_yes', 'd_explore', [[R('d_yes'), xy('d_yes').y], [cx, xy('d_yes').y], [cx, xy('d_explore').y], [L('d_explore') - 2, xy('d_explore').y]]);
    e('d_no', 'd_explore', [[R('d_no'), xy('d_no').y], [cx, xy('d_no').y], [cx, xy('d_explore').y], [L('d_explore') - 2, xy('d_explore').y]]);
    right('d_explore', 'd_final', 'Done');
    /* the round-to-round loop: down from "Keep exploring?", along the left margin, into "Pick one goal" */
    e('d_explore', 'p_goal', [[xy('d_explore').x, B('d_explore')], [xy('d_explore').x, 648], [12, 648], [12, xy('p_goal').y], [L('p_goal') - 2, xy('p_goal').y]],
      'Yes: start the next round', 300, 642, 'is-loop');
    return E;
  }


  global.BLOG_FLOWMAP = Blog.flowmapData = {
    storeKey: 'tp-posts-opened',
    sourceBaseUrl: PB,
    sourceLinkLabel: 'Read the Playbook’s section ↗',
    vbW: VBW,
    vbH: VBH,
    nw: NW,
    nh: NH,
    tip: TIP,
    phases: PHASES,
    steps: STEPS,
    bands: BANDS,
    pos: POS,
    returns: RETURNS,
    edges: buildEdges()
  };
})(typeof window !== 'undefined' ? window : globalThis);
