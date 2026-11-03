/* The reader model's manifest: TP.concepts, TP.sections, TP.pointers, TP.questions and
   TP.symptoms (notes/revamp/reader-model.md §6, implementation-plan.md WO-I7).

   This file is generated, and nobody edits it by hand. It is written by
   notes/revamp/tools/reader-model/emit_manifest.py from model.py (the concepts, the gloss register,
   the pointer overrides, the questions and the symptoms), computed.json (fluentAt) and headings.py
   (TP.sections). The commands run from notes/revamp/tools/reader-model. After a heading changes in
   headings.py:

     python3 emit_manifest.py

   and then, from the repository root, `npm run fix:titles`, which rewrites the title of every
   concept link on the built pages. After model.py changes, the reader model is regenerated first:

     python3 compute.py && python3 gen.py && python3 assemble.py && python3 emit_manifest.py

   `python3 emit_manifest.py --check` writes nothing and exits 1 when this file differs from what
   the script would write.

   TP.concepts   id -> {name, aliases, home, gloss, phrase, deps, src, kind, ours, fluentAt} for a
                 site concept, with fluentAt absent where no task makes the concept fluent, and
                 id -> {name, aliases, prior: true} for prior knowledge. home is "page#section", and
                 src is empty for the site's additions.
   TP.sections   page -> {section id: heading}, in document order.
   TP.openings   page file -> the page files its opening names beyond those its tasks use (OPENING_ADDS)
   TP.pointers   "page#section" -> the concepts its forward pointer names, for each section that
                 leaves its other concepts to the glosses at their callbacks (reader-model.md §4,
                 rule 5).
   TP.questions  [{outcome, outcomeName, text, targets}], in the contents page's order.
   TP.symptoms   [{text, targets}].

   Every page file, home and target is relative to site/pages/, as the pages' links are. */

(function (global) {
  var TP = global.TP = global.TP || {};
  TP.concepts = {
    "incremental-strategy": {
      name: "incremental tuning strategy",
      aliases: [],
      home: "01-the-tuning-loop.html#incremental",
      gloss: "Starting with a simple configuration and incrementally making improvements while building up insight into the problem.",
      phrase: "starting simple and improving incrementally while building up insight into the problem",
      deps: [],
      src: "L440-L465",
      kind: "concept",
      ours: false,
      fluentAt: "SC1.6"
    },
    "round": {
      name: "round (of experiments)",
      aliases: ["round of experiments", "round of tuning"],
      home: "01-the-tuning-loop.html#incremental",
      gloss: "One pass of the incremental strategy, in which a goal is chosen, experiments are designed and run toward it, their results are read, and the new best configuration is considered for launch.",
      phrase: "one cycle of choosing a goal, running experiments toward it and deciding what to adopt",
      deps: ["incremental-strategy"],
      src: "L464, L474-L480",
      kind: "concept",
      ours: false,
      fluentAt: "SC4.3"
    },
    "launch": {
      name: "launch",
      aliases: [],
      home: "01-the-tuning-loop.html#incremental",
      gloss: "An update of the best configuration, which may or may not correspond to an actual launch of a production model, made only on strong evidence.",
      phrase: "an update of the best configuration, made on strong evidence",
      deps: ["round"],
      src: "L466-L472",
      kind: "concept",
      ours: false,
      fluentAt: "PT2-loop"
    },
    "round-goal": {
      name: "the goal of a round",
      aliases: ["goal of a round"],
      home: "01-the-tuning-loop.html#round-goal",
      gloss: "A clear goal for the next round, narrow enough that its experiments can actually make progress towards it.",
      phrase: "a clear goal, narrow enough that the experiments can make progress toward it",
      deps: ["round"],
      src: "L517-L532",
      kind: "concept",
      ours: false,
      fluentAt: "PT2-loop"
    },
    "exploration-exploitation": {
      name: "exploration and exploitation",
      aliases: ["exploration", "exploitation", "exploration phase"],
      home: "01-the-tuning-loop.html#exploration",
      gloss: "Most tuning time goes to exploration, gaining insight into the problem, and a small amount to exploitation, greedily minimizing the validation error.",
      phrase: "exploration, which seeks insight into the problem, and exploitation, which greedily lowers validation error",
      deps: ["round-goal"],
      src: "L485-L515",
      kind: "concept",
      ours: false,
      fluentAt: "PT2-loop"
    },
    "periodic-evaluation": {
      name: "periodic evaluation",
      aliases: ["periodic evaluations"],
      home: "01-the-tuning-loop.html#trial-result",
      gloss: "Metrics collected during training, as a proxy for the offline evaluation or on a subset of its data, used to select checkpoints and to draw the training curves.",
      phrase: "metrics collected during training, on a subset of the evaluation data or as its proxy",
      deps: [],
      src: "L1418-L1420, L1439-L1455",
      kind: "concept",
      ours: false,
      fluentAt: "F9.1"
    },
    "retrospective-selection": {
      name: "retrospective optimal checkpoint selection",
      aliases: ["retrospective checkpoint selection"],
      home: "01-the-tuning-loop.html#trial-result",
      gloss: "Keeping the N best checkpoints seen during a run of a fixed number of steps and choosing the best of them at the end.",
      phrase: "keeping the best checkpoints of a fixed-length run and choosing the best at the end",
      deps: ["periodic-evaluation"],
      src: "L1508-L1527",
      kind: "concept",
      ours: false,
      fluentAt: "F8.2"
    },
    "trial-result": {
      name: "a trial's result (its best value over training)",
      aliases: ["run's result", "trial's result"],
      home: "01-the-tuning-loop.html#trial-result",
      gloss: "The validation value a trial is judged by, which should usually be the best value it achieved over the course of training.",
      phrase: "its validation value, usually the best it reached over training",
      deps: ["retrospective-selection"],
      src: "L858-L859, L1683-L1685",
      kind: "concept",
      ours: false,
      fluentAt: "F1.2"
    },
    "buffer": {
      name: "the buffer of best checkpoints",
      aliases: ["buffer", "checkpoint buffer"],
      home: "01-the-tuning-loop.html#trial-result",
      gloss: "The few checkpoints of a run with the lowest periodic evaluations so far, kept up to a fixed number, from which retrospective checkpoint selection takes the best at the end (the site's name; the Playbook describes keeping the best checkpoints).",
      phrase: "the few checkpoints with the lowest evaluations so far in a run",
      deps: ["periodic-evaluation"],
      src: "",
      kind: "concept",
      ours: true
    },
    "curve-family": {
      name: "the site's curve family",
      aliases: ["curve family"],
      home: "01-the-tuning-loop.html#trial-result",
      gloss: "The site's hand-shaped validation curves, which fall to a floor and then rise slowly after it, drawn wherever a figure or the worked case needs training curves (our addition).",
      phrase: "hand-shaped validation curves that fall to a floor and rise slowly after it",
      deps: [],
      src: "",
      kind: "concept",
      ours: true
    },
    "search-space": {
      name: "search space",
      aliases: [],
      home: "01-the-tuning-loop.html#studies",
      gloss: "The values the hyperparameters varied in a study can take on.",
      phrase: "the values the varied hyperparameters can take",
      deps: [],
      src: "L458-L460, L702-L704",
      kind: "concept",
      ours: false,
      fluentAt: "F4.2"
    },
    "trial": {
      name: "trial",
      aliases: [],
      home: "01-the-tuning-loop.html#studies",
      gloss: "One of the hyperparameter configurations a study runs for later analysis.",
      phrase: "one hyperparameter configuration run for later analysis",
      deps: ["search-space"],
      src: "L700-L701",
      kind: "concept",
      ours: false,
      fluentAt: "F4.2"
    },
    "study": {
      name: "study",
      aliases: [],
      home: "01-the-tuning-loop.html#studies",
      gloss: "A set of trials sampled from a search space by an automated search algorithm, or specified by hand, to make progress towards a round's goal.",
      phrase: "a set of hyperparameter configurations run for later analysis",
      deps: ["trial", "search-space"],
      src: "L697-L707",
      kind: "concept",
      ours: false,
      fluentAt: "SC3.3"
    },
    "best-trial": {
      name: "a study's best trial",
      aliases: ["best trial"],
      home: "01-the-tuning-loop.html#studies",
      gloss: "The trial with the best result in a study, which stands for the study when studies are compared.",
      phrase: "the best-scoring configuration in a study",
      deps: ["study", "trial-result"],
      src: "L721-L722, L926-L930",
      kind: "concept",
      ours: false,
      fluentAt: "SC3.3"
    },
    "axis-plot": {
      name: "basic hyperparameter axis plot",
      aliases: ["axis plot", "hyperparameter axis plot"],
      home: "01-the-tuning-loop.html#axis-plot",
      gloss: "A plot of each trial's validation objective, usually its best value over training, against one hyperparameter, one point per trial.",
      phrase: "the validation objective of each configuration plotted against one hyperparameter",
      deps: ["study", "trial-result"],
      src: "L854-L859",
      kind: "concept",
      ours: false,
      fluentAt: "F5.1"
    },
    "once-decisions": {
      name: "decisions made once per project",
      aliases: [],
      home: "02-starting-a-project.html#assumptions",
      gloss: "Decisions that can be made once at the beginning of a project and only occasionally revisited when circumstances change.",
      phrase: "decisions that can be made once at the start of a project",
      deps: [],
      src: "L113-L117",
      kind: "concept",
      ours: false
    },
    "model-hyperparameters": {
      name: "model hyperparameters",
      aliases: ["architecture hyperparameters"],
      home: "02-starting-a-project.html#architecture",
      gloss: "The hyperparameters that determine a model's size and other details within an architecture family, such as the number of layers, layer width and activation function.",
      phrase: "the hyperparameters that set a model's size and details, such as depth and width",
      deps: [],
      src: "L138-L146",
      kind: "concept",
      ours: false,
      fluentAt: "SC1.6"
    },
    "reuse-architecture": {
      name: "reuse an established architecture",
      aliases: [],
      home: "02-starting-a-project.html#architecture",
      gloss: "Starting from a well-established, commonly used architecture and, when possible, reproducing the model of a paper that tackles the closest problem.",
      phrase: "starting from an established architecture, reproducing the closest paper's model when possible",
      deps: ["model-hyperparameters", "once-decisions"],
      src: "L133-L137, L147-L149",
      kind: "procedure",
      ours: false,
      fluentAt: "SC1.6"
    },
    "optimizer-hyperparameters": {
      name: "optimizer hyperparameters (all of them)",
      aliases: ["optimizer hyperparameters"],
      home: "02-starting-a-project.html#optimizer",
      gloss: "Every hyperparameter an optimizer introduces, all of which deserve attention, such as Adam's four, which can all matter.",
      phrase: "every hyperparameter the optimizer introduces, such as Adam's four",
      deps: [],
      src: "L164-L176, L181-L183",
      kind: "concept",
      ours: false,
      fluentAt: "SC1.6"
    },
    "optimizer-choice": {
      name: "the most popular optimizer for the problem, possibly a simpler variant at first",
      aliases: ["choice of optimizer"],
      home: "02-starting-a-project.html#optimizer",
      gloss: "Starting with the most popular optimizer for the type of problem at hand, possibly in a simpler form such as SGD with fixed momentum, which the playbook says may be preferable in the initial stages.",
      phrase: "the most popular optimizer for the problem type, possibly in a simpler form at first",
      deps: ["optimizer-hyperparameters", "once-decisions"],
      src: "L153-L176",
      kind: "concept",
      ours: false,
      fluentAt: "SC1.6"
    },
    "sharpness": {
      name: "sharpness, the top eigenvalue of the loss's Hessian",
      aliases: ["sharpness"],
      home: "02-starting-a-project.html#optimizer",
      gloss: "The largest eigenvalue of the training loss's Hessian, the loss's largest curvature, which sets the divergence bound of gradient descent at 2 divided by the sharpness (our addition, after Cohen et al.).",
      phrase: "the largest curvature of the loss, the top eigenvalue of its Hessian",
      deps: [],
      src: "",
      kind: "concept",
      ours: true,
      fluentAt: "F9.2"
    },
    "divergence-bound": {
      name: "stability limit of an update rule",
      aliases: ["stability limit", "divergence bound"],
      home: "02-starting-a-project.html#optimizer",
      gloss: "The learning rate above which an SGD-family update rule diverges on a quadratic loss, 2 divided by the sharpness for plain gradient descent. It falls as the loss's curvature rises (the site's addition).",
      phrase: "the learning rate above which an update rule diverges, set by the loss's curvature",
      deps: ["optimizer-hyperparameters", "sharpness"],
      src: "",
      kind: "concept",
      ours: true,
      fluentAt: "F9.2"
    },
    "simple-config": {
      name: "simple initial configuration",
      aliases: ["initial configuration"],
      home: "02-starting-a-project.html#initial",
      gloss: "A simple, relatively fast, low-resource starting configuration that obtains a reasonable result, such as a constant learning rate and a smaller model.",
      phrase: "a simple, fast, low-resource starting configuration that obtains a reasonable result",
      deps: ["incremental-strategy", "model-hyperparameters"],
      src: "L390-L412",
      kind: "concept",
      ours: false,
      fluentAt: "PT1"
    },
    "provisional-budget": {
      name: "initial number of training steps",
      aliases: ["provisional training budget"],
      home: "02-starting-a-project.html#step-budget",
      gloss: "The first number of training steps, which balances the better results and easier tuning of longer runs against faster turnaround and might be hard to change later if chosen unnecessarily large.",
      phrase: "the first number of training steps, balancing longer runs against faster turnaround",
      deps: ["simple-config"],
      src: "L413-L423",
      kind: "concept",
      ours: false,
      fluentAt: "PT1"
    },
    "retuning": {
      name: "changing the batch size requires re-tuning",
      aliases: ["re-tuning"],
      home: "03-batch-size.html#controls",
      gloss: "The best values of most hyperparameters are sensitive to the batch size, so changing it typically requires re-tuning, above all the optimizer and regularization hyperparameters, and possibly the number of training steps.",
      phrase: "re-tuning the optimizer and regularization hyperparameters when the batch size changes",
      deps: ["optimizer-hyperparameters"],
      src: "L358-L373, L276-L279, L2019-L2024",
      kind: "concept",
      ours: false,
      fluentAt: "PT1"
    },
    "batch-for-speed": {
      name: "the batch size governs training speed",
      aliases: [],
      home: "03-batch-size.html#controls",
      gloss: "The batch size governs training speed and should not be tuned for validation performance, since with the other hyperparameters re-tuned and enough steps the same final performance should be attainable at any batch size.",
      phrase: "a batch size that governs training speed and is not tuned for validation performance",
      deps: ["retuning", "once-decisions"],
      src: "L189-L212, L2014-L2026",
      kind: "concept",
      ours: false,
      fluentAt: "PT1"
    },
    "throughput": {
      name: "training throughput",
      aliases: [],
      home: "03-batch-size.html#feasible",
      gloss: "The number of examples processed per second during training.",
      phrase: "examples processed per second during training",
      deps: [],
      src: "L229-L232",
      kind: "concept",
      ours: false,
      fluentAt: "PT1"
    },
    "time-per-step": {
      name: "time per step",
      aliases: [],
      home: "03-batch-size.html#feasible",
      gloss: "The batch size divided by the training throughput, which should be nearly constant as the batch size grows while the accelerators are not saturated.",
      phrase: "the batch size divided by the training throughput",
      deps: ["throughput"],
      src: "L234-L241",
      kind: "concept",
      ours: false,
      fluentAt: "F3.2"
    },
    "doubling-procedure": {
      name: "running increasing powers of two to find the feasible batch sizes",
      aliases: ["doubling", "run the next size"],
      home: "03-batch-size.html#feasible",
      gloss: "Running training for a small number of steps at increasing powers of two until one job exceeds the available memory, measuring each size's throughput, and considering only batch sizes up to where throughput stops increasing.",
      phrase: "short runs at doubling batch sizes, measuring each size's throughput",
      deps: ["throughput", "batch-for-speed"],
      src: "L221-L256",
      kind: "procedure",
      ours: false,
      fluentAt: "PT1"
    },
    "bottleneck": {
      name: "a bottleneck such as I/O or synchronization",
      aliases: ["input-bound"],
      home: "03-batch-size.html#feasible",
      gloss: "A limit elsewhere in the pipeline, such as I/O or synchronization between compute nodes, that stops throughput from doubling with the batch size.",
      phrase: "a limit such as I/O or synchronization that stops throughput doubling with the batch size",
      deps: ["throughput"],
      src: "L242-L250",
      kind: "concept",
      ours: false
    },
    "gradient-accumulation": {
      name: "gradient accumulation",
      aliases: [],
      home: "03-batch-size.html#feasible",
      gloss: "Simulating a larger batch size than the hardware supports, which provides no throughput benefit.",
      phrase: "simulating a larger batch than the hardware supports, with no throughput benefit",
      deps: ["throughput"],
      src: "L251-L253",
      kind: "concept",
      ours: false
    },
    "perfect-scaling": {
      name: "perfect scaling",
      aliases: [],
      home: "03-batch-size.html#training-time",
      gloss: "The regime in which doubling the batch size halves the number of steps to a fixed performance goal, with all relevant hyperparameters re-tuned.",
      phrase: "the regime where doubling the batch size halves the steps needed",
      deps: ["retuning"],
      src: "L276-L285",
      kind: "concept",
      ours: false,
      fluentAt: "F3.3"
    },
    "critical-batch-size": {
      name: "critical batch size",
      aliases: [],
      home: "03-batch-size.html#training-time",
      gloss: "The batch size up to which perfect scaling holds and beyond which larger batches give diminishing reductions in steps.",
      phrase: "the batch size beyond which larger batches give diminishing returns in steps",
      deps: ["perfect-scaling"],
      src: "L282-L291",
      kind: "concept",
      ours: false
    },
    "training-time": {
      name: "training time as time per step times steps",
      aliases: ["training time"],
      home: "03-batch-size.html#training-time",
      gloss: "Time per step multiplied by the number of steps, usually minimized by the largest batch size that still reduces the number of steps required when the time per step is about constant.",
      phrase: "time per step multiplied by the number of steps",
      deps: ["time-per-step", "perfect-scaling", "critical-batch-size", "doubling-procedure"],
      src: "L267-L306",
      kind: "judgment",
      ours: false,
      fluentAt: "PT1"
    },
    "epoch-step-budgets": {
      name: "epoch budget and step budget",
      aliases: ["epoch budget", "step budget"],
      home: "03-batch-size.html#budgets",
      gloss: "An epoch budget fixes the training examples each run sees and a step budget fixes its steps, and comparing batch sizes under an epoch budget probes only the perfect-scaling regime.",
      phrase: "a fixed number of training examples, or of steps, for every compared run",
      deps: ["perfect-scaling"],
      src: "L292-L300",
      kind: "judgment",
      ours: false,
      fluentAt: "SC-A"
    },
    "scientific-hp": {
      name: "scientific hyperparameter",
      aliases: [],
      home: "01-the-tuning-loop.html#roles",
      gloss: "A hyperparameter whose effect on the model's performance the experiments are trying to measure.",
      phrase: "a hyperparameter whose effect on performance the experiments try to measure",
      deps: ["round-goal"],
      src: "L548-L552",
      kind: "concept",
      ours: false,
      fluentAt: "SC3.3"
    },
    "nuisance-hp": {
      name: "nuisance hyperparameter",
      aliases: [],
      home: "01-the-tuning-loop.html#roles",
      gloss: "A hyperparameter that must be optimized over so that different values of the scientific hyperparameters are compared fairly.",
      phrase: "a hyperparameter optimized over so that scientific values are compared fairly",
      deps: ["scientific-hp", "study"],
      src: "L553-L556, L708-L712",
      kind: "concept",
      ours: false,
      fluentAt: "SC3.3"
    },
    "fixed-hp": {
      name: "fixed hyperparameter",
      aliases: [],
      home: "01-the-tuning-loop.html#roles",
      gloss: "A hyperparameter held at one value for the current round of experiments.",
      phrase: "a hyperparameter held at one value throughout the current experiments",
      deps: ["scientific-hp"],
      src: "L557-L560",
      kind: "concept",
      ours: false
    },
    "caveat": {
      name: "the caveat a fixed hyperparameter creates",
      aliases: [],
      home: "01-the-tuning-loop.html#roles",
      gloss: "The limit a fixed hyperparameter puts on a conclusion, which might not be valid for other settings of it.",
      phrase: "the limit on a conclusion from a hyperparameter held at one value",
      deps: ["fixed-hp"],
      src: "L561-L565",
      kind: "concept",
      ours: false,
      fluentAt: "PT3-design"
    },
    "role-assignment": {
      name: "assigning the roles for a goal",
      aliases: [],
      home: "01-the-tuning-loop.html#roles",
      gloss: "Identifying the scientific hyperparameters first, treating the rest as nuisance, and fixing a nuisance hyperparameter when its caveats cost less than tuning it, less readily the more it interacts with the scientific ones.",
      phrase: "classifying each hyperparameter as scientific, nuisance or fixed for the goal",
      deps: ["scientific-hp", "nuisance-hp", "fixed-hp", "caveat", "optimizer-hyperparameters", "model-hyperparameters"],
      src: "L566-L667",
      kind: "procedure",
      ours: false,
      fluentAt: "PT3-design"
    },
    "conditional-hp": {
      name: "conditional hyperparameter",
      aliases: [],
      home: "01-the-tuning-loop.html#conditional",
      gloss: "A hyperparameter present only for some values of a scientific hyperparameter, which should not be assumed to be the same hyperparameter under each value just because the name is the same.",
      phrase: "a hyperparameter present only for some values of the one being compared",
      deps: ["scientific-hp", "optimizer-hyperparameters"],
      src: "L668-L686",
      kind: "concept",
      ours: false,
      fluentAt: "SC3.3"
    },
    "study-design": {
      name: "one study per scientific value, or a joint study",
      aliases: [],
      home: "01-the-tuning-loop.html#studies",
      gloss: "One study per value of the scientific hyperparameter, each tuning the nuisance hyperparameters and compared by its best trial, or one joint study that samples the scientific values uniformly.",
      phrase: "one study per compared value, or one joint study sampling those values uniformly",
      deps: ["nuisance-hp", "best-trial", "conditional-hp"],
      src: "L690-L749",
      kind: "concept",
      ours: false,
      fluentAt: "F4.2"
    },
    "three-desiderata": {
      name: "the three desiderata of a study's number of trials",
      aliases: ["three desiderata"],
      home: "01-the-tuning-loop.html#budget",
      gloss: "A study's limited number of trials has to cover enough scientific values, a large enough nuisance search space and dense enough sampling, and improving any one costs more trials or a saving in another.",
      phrase: "enough compared values, a large enough nuisance space and dense enough sampling",
      deps: ["study-design", "search-space"],
      src: "L753-L798",
      kind: "judgment",
      ours: false,
      fluentAt: "PT3-design"
    },
    "adam-rule": {
      name: "Adam's hyperparameters by the number of trials",
      aliases: [],
      home: "01-the-tuning-loop.html#budget",
      gloss: "The playbook's rules of thumb for Adam by number of trials: the learning rate alone below 10, then beta1 from 10, epsilon from 25, and beta2 with substantially more than 25.",
      phrase: "the playbook's rules for which of Adam's hyperparameters to tune at each number of trials",
      deps: ["three-desiderata", "optimizer-hyperparameters"],
      src: "L1645-L1659",
      kind: "concept",
      ours: false
    },
    "decade": {
      name: "decade (of a log-scaled range)",
      aliases: ["decade", "decades"],
      home: "01-the-tuning-loop.html#budget",
      gloss: "A factor of ten in a hyperparameter on a log scale, the unit in which the site counts a range's width and a density of trials (our addition).",
      phrase: "a factor of ten in a hyperparameter on a log scale",
      deps: ["search-space"],
      src: "",
      kind: "concept",
      ours: true
    },
    "random-search": {
      name: "(pseudo) random uniform search",
      aliases: ["random search"],
      home: "04-searching-the-space.html#quasi-random",
      gloss: "Trials sampled uniformly at random from the search space, a substitute for quasi-random search that is likely to be slightly less efficient.",
      phrase: "configurations sampled uniformly at random",
      deps: ["search-space", "trial"],
      src: "L1674-L1677, L1764-L1766",
      kind: "concept",
      ours: false
    },
    "grid-search": {
      name: "grid search, and where the playbook accepts it",
      aliases: [],
      home: "04-searching-the-space.html#quasi-random",
      gloss: "Trials placed on a grid of values, which the playbook accepts in one or two dimensions, and not in higher ones, as a substitute where no quasi-random search implementation is available.",
      phrase: "configurations on a grid, acceptable in one or two dimensions when no quasi-random implementation exists",
      deps: ["search-space", "trial"],
      src: "L1674-L1677, L1764-L1769",
      kind: "concept",
      ours: false
    },
    "quasi-random": {
      name: "quasi-random search",
      aliases: [],
      home: "04-searching-the-space.html#quasi-random",
      gloss: "Search based on a randomly shifted low-discrepancy sequence, which can be thought of as jittered, shuffled grid search because it explores the space uniformly and spreads its points out more than random search.",
      phrase: "search along a low-discrepancy sequence, which explores the space uniformly but randomly",
      deps: ["random-search"],
      src: "L1667-L1677, L1757-L1763",
      kind: "concept",
      ours: false,
      fluentAt: "SC3.5"
    },
    "adaptive-search": {
      name: "adaptive black-box optimization, such as Bayesian optimization",
      aliases: ["Bayesian optimization", "black box optimization"],
      home: "04-searching-the-space.html#why-not-bo",
      gloss: "A search algorithm, such as Bayesian optimization, that uses the results of earlier trials to choose later ones.",
      phrase: "a search, such as Bayesian optimization, that adapts to earlier results",
      deps: ["study", "trial-result"],
      src: "L1667-L1673, L1678-L1680, L1705-L1737",
      kind: "concept",
      ours: false,
      fluentAt: "SC4.3"
    },
    "search-choice": {
      name: "quasi-random search during exploration, Bayesian optimization after it",
      aliases: [],
      home: "04-searching-the-space.html#why-not-bo",
      gloss: "The playbook's preference for quasi-random search during exploration and Bayesian optimization during exploitation, with non-adaptive, uniform sampling and a fit to many parallel trials among its reasons.",
      phrase: "quasi-random search while exploring and Bayesian optimization while exploiting, parallelism among the playbook's reasons",
      deps: ["quasi-random", "adaptive-search", "exploration-exploitation"],
      src: "L1663-L1737",
      kind: "judgment",
      ours: false,
      fluentAt: "PT3-design"
    },
    "study-variance": {
      name: "study variance (hyperparameter search variance)",
      aliases: ["study variance", "hyperparameter search variance"],
      home: "04-searching-the-space.html#trials",
      gloss: "The variation in results caused by the procedure that selects the hyperparameters, which depends on the number of trials and the search space.",
      phrase: "the variation in results caused by the procedure that selects the hyperparameters",
      deps: ["best-trial", "trial-result"],
      src: "L1076-L1080, L1089-L1093, L1786-L1796",
      kind: "concept",
      ours: false,
      fluentAt: "SC4.2"
    },
    "trial-variance": {
      name: "trial variance (retrain variance)",
      aliases: ["trial variance", "retrain variance", "training procedure variance"],
      home: "04-searching-the-space.html#trials",
      gloss: "The variation between training runs that use the same hyperparameters and different random seeds.",
      phrase: "the variation between runs with the same hyperparameters and different seeds",
      deps: ["trial-result"],
      src: "L1069-L1075, L1792-L1796",
      kind: "concept",
      ours: false,
      fluentAt: "SC4.2"
    },
    "checklist": {
      name: "the questions to ask before analyzing a study",
      aliases: [],
      home: "05-reading-the-results.html#checklist",
      gloss: "The questions asked of a finished study before its evidence toward the goal is analyzed, about the search space's size, the sampling density, the infeasible fraction, optimization issues and the best trials' training curves.",
      phrase: "the questions asked of a finished study before its comparison is read",
      deps: ["study", "round-goal"],
      src: "L816-L842",
      kind: "procedure",
      ours: false,
      fluentAt: "PT3-reading"
    },
    "infeasible-trial": {
      name: "infeasible trial",
      aliases: ["divergent trial"],
      home: "05-reading-the-results.html#checklist",
      gloss: "A trial that diverges, gets \"really bad loss values\" or fails to run, and the playbook describes divergent points as those with NaN training loss or one many standard deviations worse than the mean.",
      phrase: "a configuration that diverges, reaches extreme loss values or fails to run",
      deps: ["trial"],
      src: "L825-L832, L873-L874, L1134-L1136, L1886",
      kind: "concept",
      ours: false,
      fluentAt: "SC3.8"
    },
    "boundary-check": {
      name: "checking the search-space boundaries",
      aliases: [],
      home: "05-reading-the-results.html#boundaries",
      gloss: "Checking whether the best trials cluster near an edge of the search space, in which case the search is probably not wide enough and another study runs with the space expanded in that direction.",
      phrase: "checking whether the best results cluster near an edge of the searched range",
      deps: ["axis-plot", "best-trial"],
      src: "L819-L822, L844-L879",
      kind: "judgment",
      ours: false,
      fluentAt: "PT3-reading"
    },
    "density-check": {
      name: "judging sampling density and the infeasible fraction",
      aliases: [],
      home: "05-reading-the-results.html#density",
      gloss: "Judging from the axis plots whether enough trials fell in the good region, running more or narrowing the goal if not, and whether the infeasible fraction calls for adjusting or reparameterizing the search space.",
      phrase: "judging whether enough results fell in the good region and how many failed",
      deps: ["axis-plot", "infeasible-trial"],
      src: "L823-L832, L883-L897",
      kind: "judgment",
      ours: false,
      fluentAt: "PT3-reading"
    },
    "training-curves": {
      name: "training curves and the questions asked of them",
      aliases: ["training curves"],
      home: "05-reading-the-results.html#curves",
      gloss: "Training and validation error plotted against step for at least the best few trials, read for problematic overfitting, late step-to-step variance, trials still improving and early saturation.",
      phrase: "training and validation error against step for at least the best few trials",
      deps: ["best-trial", "scientific-hp", "nuisance-hp"],
      src: "L901-L992",
      kind: "procedure",
      ours: false,
      fluentAt: "PT3-reading"
    },
    "isolation-plot": {
      name: "isolation plot",
      aliases: [],
      home: "05-reading-the-results.html#isolation",
      gloss: "An axis plot whose points are each the best trial across some or all of the nuisance hyperparameters, approximated from (quasi)random search data by taking the best trial in each bucket of the axis.",
      phrase: "an axis plot of the best result at each value, nuisance hyperparameters optimized away",
      deps: ["axis-plot", "best-trial", "nuisance-hp", "quasi-random"],
      src: "L996-L1032",
      kind: "concept",
      ours: false,
      fluentAt: "PT3-reading"
    },
    "fair-baseline": {
      name: "a baseline tuned equally well",
      aliases: [],
      home: "05-reading-the-results.html#isolation",
      gloss: "A baseline whose learning rate is tuned as well as the candidate's, which a fair comparison with the best point of an isolation plot requires.",
      phrase: "a baseline whose learning rate is tuned as well as the candidate's",
      deps: ["isolation-plot", "nuisance-hp"],
      src: "L1019-L1027",
      kind: "concept",
      ours: false,
      fluentAt: "PT3-reading"
    },
    "bucket": {
      name: "bucket (of an isolation plot)",
      aliases: ["bucket", "buckets", "bucketing"],
      home: "05-reading-the-results.html#isolation",
      gloss: "One of the intervals into which the horizontal axis of an axis plot is divided, whose best trial gives one point of the approximate isolation plot.",
      phrase: "one interval of the plotted axis, whose best result gives one point of the curve",
      deps: ["axis-plot"],
      src: "L1028-L1032",
      kind: "concept",
      ours: false
    },
    "data-variance": {
      name: "data collection and sampling variance (data variance, the site's short name)",
      aliases: ["data variance", "data collection and sampling variance"],
      home: "06-adopting-a-change.html#variance",
      gloss: "The variance from random splits into training, validation and test data or from how the training data are generated, which the site calls data variance for the playbook's data collection and sampling variance.",
      phrase: "the variance from how the data were split and generated",
      deps: [],
      src: "L1081-L1083",
      kind: "concept",
      ours: false,
      fluentAt: "PT4"
    },
    "variance-sources": {
      name: "the sources of variation in results",
      aliases: ["sources of variation"],
      home: "06-adopting-a-change.html#variance",
      gloss: "The broad categories of variation that can make a candidate's advantage inconsistent when the experiment is repeated, which are trial variance, study variance, and data collection and sampling variance.",
      phrase: "variance from seeds, search and data, which can make an advantage vanish on repetition",
      deps: ["trial-variance", "study-variance", "data-variance"],
      src: "L1057-L1093",
      kind: "concept",
      ours: false,
      fluentAt: "PT4"
    },
    "adoption": {
      name: "adopting a change",
      aliases: [],
      home: "06-adopting-a-change.html#variance",
      gloss: "A change that gets a better result than the baseline, taking into account the retrain variance of both as best we can, which should probably be adopted if its improvement outweighs its complexity.",
      phrase: "probably adopting a change beating the baseline, allowing for both variances, if gains outweigh complexity",
      deps: ["variance-sources", "launch"],
      src: "L1101-L1109",
      kind: "judgment",
      ours: false,
      fluentAt: "TP4.2"
    },
    "rerun": {
      name: "rerunning the best trial",
      aliases: ["rerun", "reruns", "rerun of the best trial"],
      home: "06-adopting-a-change.html#reruns",
      gloss: "Running a candidate's best trial several times to characterize the run-to-run trial variance, which the playbook says to consider before adopting a change and usually to repeat only after major pipeline changes.",
      phrase: "running the best configuration several times to characterize its run-to-run variance",
      deps: ["variance-sources", "best-trial", "adoption"],
      src: "L1094-L1100",
      kind: "procedure",
      ours: false,
      fluentAt: "PT4"
    },
    "final-study": {
      name: "the final study after exploration",
      aliases: [],
      home: "06-adopting-a-change.html#after",
      gloss: "The final automated study once exploration ends, using Bayesian optimization over a refined search space with as large a budget as possible, followed by a considered check of the test set.",
      phrase: "a last study with Bayesian optimization over a refined space, once exploration ends",
      deps: ["exploration-exploitation", "adaptive-search", "search-choice", "boundary-check", "density-check", "infeasible-trial", "launch"],
      src: "L1111-L1147",
      kind: "concept",
      ours: false,
      fluentAt: "PT4"
    },
    "compute-bound": {
      name: "compute-bound and not compute-bound",
      aliases: ["compute-bound", "not compute-bound", "compute-limited"],
      home: "07-training-horizon.html#regimes",
      gloss: "Training that is limited by how long we are willing to wait, so that training longer should keep improving it, as against training where longer runs eventually stop helping much.",
      phrase: "training limited by how long we are willing to wait",
      deps: [],
      src: "L1151-L1176",
      kind: "concept",
      ours: false,
      fluentAt: "PT5"
    },
    "regime-classification": {
      name: "classifying the workload from its curves",
      aliases: [],
      home: "07-training-horizon.html#regimes",
      gloss: "Classifying a workload as compute-bound when its trials are still improving at the end of training, and as not compute-bound when training and validation performance saturated long before the end.",
      phrase: "reading the regime from whether the curves still improve at the end",
      deps: ["compute-bound", "training-curves"],
      src: "L977-L988, L1151-L1169",
      kind: "judgment",
      ours: false,
      fluentAt: "PT5"
    },
    "max-train-steps": {
      name: "max_train_steps",
      aliases: [],
      home: "07-training-horizon.html#not-bound",
      gloss: "The number of training steps given to every trial of a study, picked once and never tuned within the study.",
      phrase: "the training steps every trial of a study runs, never tuned within it",
      deps: ["study", "provisional-budget"],
      src: "L1194-L1197, L1203-L1204, L1218-L1226",
      kind: "concept",
      ours: false,
      fluentAt: "F8.2"
    },
    "sweep": {
      name: "learning-rate sweep",
      aliases: ["learning rate sweep"],
      home: "07-training-horizon.html#sweep",
      gloss: "A grid search over the learning rate, as in the playbook's constant learning rate sweep.",
      phrase: "a grid search over the learning rate",
      deps: ["study"],
      src: "L1240, L1827",
      kind: "concept",
      ours: false,
      fluentAt: "F9.1"
    },
    "sweep-to-fit": {
      name: "an initial max_train_steps from a learning-rate sweep",
      aliases: [],
      home: "07-training-horizon.html#sweep",
      gloss: "The initial max_train_steps, taken as the steps the fastest trial of a constant-learning-rate sweep needs to fit the training set, with the fastest rate checked to be off the sweep's edge.",
      phrase: "the steps the fastest run of a learning-rate sweep needs to fit the training set",
      deps: ["sweep", "max-train-steps", "boundary-check", "compute-bound"],
      src: "L1205-L1251",
      kind: "procedure",
      ours: false,
      fluentAt: "PT5"
    },
    "best-step-fraction": {
      name: "where the best checkpoint falls in the run",
      aliases: [],
      home: "07-training-horizon.html#refine",
      gloss: "Where each trial's best step falls in max_train_steps: always in the first 10% means far too many steps, and consistently in the last 25% suggests training longer and re-tuning the schedule may help.",
      phrase: "where each run's best step falls within the training budget",
      deps: ["retrospective-selection", "max-train-steps", "compute-bound"],
      src: "L1191-L1202",
      kind: "procedure",
      ours: false,
      fluentAt: "PT5"
    },
    "gradient-noise": {
      name: "revisiting max_train_steps when the gradient noise changes",
      aliases: ["gradient noise", "gradient variance"],
      home: "07-training-horizon.html#revisit",
      gloss: "The effect of gradient noise on the budget, where more variance across batches, as from a smaller batch, augmentation or dropout, may raise the steps needed and a better-tuned optimizer or schedule may lower them.",
      phrase: "how a change's gradient noise moves the number of training steps needed",
      deps: ["max-train-steps"],
      src: "L1177-L1184, L1203-L1204, L1218-L1226",
      kind: "concept",
      ours: false,
      fluentAt: "PT5"
    },
    "rounds-increasing": {
      name: "tuning in rounds of increasing length",
      aliases: ["Round 1", "Round 2", "stage"],
      home: "07-training-horizon.html#rounds",
      gloss: "Tuning a compute-bound workload in multiple rounds with increasing per-trial training step limits, which the site calls stages where the playbook's two senses of round meet in one sentence.",
      phrase: "tuning in stages of increasing per-trial training length",
      deps: ["compute-bound", "max-train-steps", "round"],
      src: "L1255-L1336",
      kind: "concept",
      ours: false,
      fluentAt: "SC5.5"
    },
    "schedule-family": {
      name: "adding a learning-rate decay schedule, and its family",
      aliases: ["decay schedule", "schedule family"],
      home: "07-training-horizon.html#schedule",
      gloss: "A non-constant learning-rate schedule, which the playbook is confident matters, with linear or cosine decay as its preference, tuned as a nuisance hyperparameter and not adjusted by hand against the validation set.",
      phrase: "a non-constant decay schedule, linear or cosine by the playbook's preference",
      deps: ["round", "nuisance-hp", "max-train-steps"],
      src: "L404-L405, L621-L624, L1170-L1176, L1589-L1643",
      kind: "procedure",
      ours: false,
      fluentAt: "SC5.5"
    },
    "schedule-extension": {
      name: "extending the schedule for Round 2",
      aliases: [],
      home: "07-training-horizon.html#extend",
      gloss: "Spending Round 2's extra steps at a high learning rate, by extending a linear schedule's constant phase or a cosine schedule's max_train_steps, which the playbook marks as speculation.",
      phrase: "spending Round 2's extra steps at a high learning rate, marked as speculation",
      deps: ["rounds-increasing", "schedule-family"],
      src: "L1285-L1288, L1339-L1352",
      kind: "procedure",
      ours: false,
      fluentAt: "PT5"
    },
    "instability": {
      name: "training instability",
      aliases: [],
      home: "08-training-instabilities.html#what",
      gloss: "Any workload becomes unstable at a large enough learning rate, and instability is an issue only when it forces us to use a learning rate that is too small.",
      phrase: "a loss that rises during periods of training",
      deps: [],
      src: "L1800-L1824",
      kind: "concept",
      ours: false,
      fluentAt: "F9.1"
    },
    "instability-types": {
      name: "the two types of instability",
      aliases: ["early instability", "mid-training instability"],
      home: "08-training-instabilities.html#what",
      gloss: "The two types of training instability the playbook distinguishes, instability at initialization or early in training and sudden instability in the middle of training.",
      phrase: "instability early in training and sudden instability in the middle of training",
      deps: ["instability"],
      src: "L1822-L1824",
      kind: "concept",
      ours: false,
      fluentAt: "F9.1"
    },
    "gradient-norm": {
      name: "gradient norm",
      aliases: [],
      home: "08-training-instabilities.html#diagnosis",
      gloss: "The L2 norm of the full loss gradient, logged during training, whose outlier values can cause spurious instability in the middle of training.",
      phrase: "the L2 norm of the full loss gradient, logged unclipped during training",
      deps: [],
      src: "L1832-L1834, L1967-L1971",
      kind: "concept",
      ours: false,
      fluentAt: "SC6.5"
    },
    "feasible-region": {
      name: "the edge of the feasible learning rates",
      aliases: [],
      home: "08-training-instabilities.html#diagnosis",
      gloss: "The learning rates whose trials neither produce NaNs nor uncharacteristically high loss, which the site calls the feasible region, with an unstable model's best learning rate at the edge of that range.",
      phrase: "the learning rates whose runs stay feasible, with an unstable model's best at their edge",
      deps: ["infeasible-trial", "axis-plot", "best-trial", "instability"],
      src: "L873-L879, L1886, L1894-L1896",
      kind: "concept",
      ours: false
    },
    "instability-diagnosis": {
      name: "identifying an unstable workload",
      aliases: [],
      home: "08-training-instabilities.html#diagnosis",
      gloss: "The Playbook's check for instability: sweep the learning rate to find the best rate, then plot the training loss for rates just above it. Loss that rises during training there suggests fixing the instability will help. A short run of about 500 steps at twice the best rate, evaluated every step, catches early instability that ordinary evaluation schedules miss.",
      phrase: "a learning-rate sweep, then the loss curves just above the best rate",
      deps: ["feasible-region", "sweep", "periodic-evaluation", "instability-types"],
      src: "L1825-L1848, L1894-L1901",
      kind: "procedure",
      ours: false,
      fluentAt: "SC6.5"
    },
    "unstable-base-lr": {
      name: "unstable_base_learning_rate",
      aliases: ["unstable base learning rate"],
      home: "08-training-instabilities.html#diagnosis",
      gloss: "The learning rate at which the diagnosis finds the model becomes unstable, which the playbook calls unstable_base_learning_rate and against which warmup's base rate is set at least ten times larger.",
      phrase: "the learning rate at which the model becomes unstable",
      deps: ["instability-diagnosis"],
      src: "L1911-L1920",
      kind: "concept",
      ours: false,
      fluentAt: "F9.2"
    },
    "fix-order": {
      name: "the potential fixes for instability",
      aliases: [],
      home: "08-training-instabilities.html#fixes",
      gloss: "The playbook's potential fixes for instability: warmup, best for early instability, gradient clipping, good for early and mid-training instability, a new optimizer, architectural best practices, and a lower learning rate as the last resort.",
      phrase: "warmup for early instability, clipping for early or mid-training, a lower rate last",
      deps: ["instability-types"],
      src: "L1850-L1869",
      kind: "judgment",
      ours: false,
      fluentAt: "PT6"
    },
    "warmup": {
      name: "learning-rate warmup",
      aliases: ["learning rate warmup"],
      home: "08-training-instabilities.html#warmup",
      gloss: "A ramp of the learning rate from zero to a base rate over the first steps of training.",
      phrase: "a ramp of the learning rate from zero to a base rate early in training",
      deps: ["unstable-base-lr", "fix-order", "max-train-steps", "retrospective-selection"],
      src: "L1871-L1946",
      kind: "procedure",
      ours: false,
      fluentAt: "PT6"
    },
    "workload-b": {
      name: "workload B of Toy D",
      aliases: ["workload B"],
      home: "08-training-instabilities.html#warmup",
      gloss: "The one setting of Toy D's sharpness dynamics that the site's Toy D figures and the worked case run, in which the sharp direction's curvature relaxes toward its target at a fixed rate (our addition).",
      phrase: "the one setting of Toy D that the site's figures and worked case run",
      deps: ["sharpness"],
      src: "",
      kind: "concept",
      ours: true
    },
    "stability-limit": {
      name: "the stability limit set by sharpness",
      aliases: ["stability limit"],
      home: "08-training-instabilities.html#warmup",
      gloss: "The largest stable learning rate at each step, 2 divided by the current sharpness for gradient descent, which rises as warmup's increasing learning rate drives the sharpness down and has no clear analogue for Adam (our addition, after Cohen et al. and Gilmer et al.).",
      phrase: "the largest stable learning rate at each step, set by the current sharpness",
      deps: ["divergence-bound", "sharpness", "warmup"],
      src: "",
      kind: "concept",
      ours: true,
      fluentAt: "SC-A"
    },
    "clipping": {
      name: "gradient clipping",
      aliases: ["clipping threshold"],
      home: "08-training-instabilities.html#clipping",
      gloss: "Rescaling each gradient whose norm exceeds a threshold, starting near the 90th percentile of logged norms, where clipping over half the updates usually counts as extremely aggressive, in essence a learning-rate cut.",
      phrase: "rescaling gradients whose norm exceeds a threshold near the 90th percentile of norms",
      deps: ["gradient-norm", "fix-order"],
      src: "L1948-L1983",
      kind: "procedure",
      ours: false,
      fluentAt: "PT6"
    },
    "input-pipeline": {
      name: "input-bound pipeline",
      aliases: ["input pipeline"],
      home: "09-pipeline-practice.html#pipeline",
      gloss: "A pipeline limited by its input, from causes such as data read over a network, expensive online preprocessing or synchronization barriers, diagnosed with a profiler.",
      phrase: "a pipeline limited by how fast it reads and prepares examples",
      deps: ["bottleneck"],
      src: "L1370-L1398",
      kind: "concept",
      ours: false
    },
    "instrumentation": {
      name: "a pipeline that records every study",
      aliases: [],
      home: "09-pipeline-practice.html#evaluation",
      gloss: "The site's name for a pipeline in which every study produces its axis plots and training curves automatically, logs the unclipped gradient norm, evaluates at regular step intervals and is recorded in a tracking table.",
      phrase: "a pipeline where every study produces its plots, logs and evaluations and is recorded",
      deps: ["axis-plot", "training-curves", "gradient-norm", "periodic-evaluation"],
      src: "L1042-L1049, L1451-L1504, L1535-L1547, L1832-L1834, L1967-L1969",
      kind: "procedure",
      ours: false
    },
    "evaluation-sample": {
      name: "sample for periodic evaluation",
      aliases: [],
      home: "09-pipeline-practice.html#sample",
      gloss: "The subset of the offline evaluation data used for periodic evaluation, small enough to evaluate quickly and large enough to measure improvements, with no skew from the full set.",
      phrase: "the subset of evaluation data evaluated during training, checked against the full set",
      deps: ["periodic-evaluation"],
      src: "L1474-L1506",
      kind: "concept",
      ours: false
    },
    "experiment-tracking": {
      name: "experiment tracking",
      aliases: ["tracking table"],
      home: "09-pipeline-practice.html#tracking",
      gloss: "A record of every study, with its name, config link, description, number of trials, the validation performance of its best checkpoint and its reproduction notes.",
      phrase: "a table recording each study's name, config, trials, best result and reproduction notes",
      deps: ["study", "best-trial"],
      src: "L1529-L1547",
      kind: "concept",
      ours: false
    },
    "ghost-batch-norm": {
      name: "batch norm statistics and ghost batch norm",
      aliases: ["ghost batch norm"],
      home: "09-pipeline-practice.html#batchnorm",
      gloss: "Computing batch norm statistics over a fixed number of examples decoupled from the total batch size, about 64 by anecdotal reports mostly on ImageNet.",
      phrase: "batch norm statistics over a fixed number of examples, decoupled from the batch size",
      deps: [],
      src: "L1549-L1571",
      kind: "concept",
      ours: false
    },
    "multi-host": {
      name: "multi-host pipelines",
      aliases: [],
      home: "09-pipeline-practice.html#multihost",
      gloss: "In multi-host training, logging and checkpointing on one host, synchronizing batch norm statistics, and using the same seeds for initialization and different seeds for data shuffling across hosts.",
      phrase: "logging and checkpointing on one host, with seeds shared for initialization only",
      deps: [],
      src: "L1573-L1585",
      kind: "concept",
      ours: false
    },
    "loss": {
      name: "loss",
      aliases: [],
      prior: true
    },
    "gradient": {
      name: "gradient",
      aliases: [],
      prior: true
    },
    "learning-rate": {
      name: "learning rate",
      aliases: [],
      prior: true
    },
    "epoch": {
      name: "epoch",
      aliases: [],
      prior: true
    },
    "step": {
      name: "training step",
      aliases: [],
      prior: true
    },
    "validation-set": {
      name: "validation set and validation error",
      aliases: [],
      prior: true
    },
    "overfitting": {
      name: "overfitting",
      aliases: [],
      prior: true
    },
    "checkpoint": {
      name: "checkpoint",
      aliases: [],
      prior: true
    },
    "hyperparameter": {
      name: "hyperparameter",
      aliases: [],
      prior: true
    },
    "batch-size": {
      name: "batch size",
      aliases: [],
      prior: true
    },
    "random-seed": {
      name: "random seed",
      aliases: [],
      prior: true
    },
    "regularization": {
      name: "regularization and data augmentation",
      aliases: [],
      prior: true
    },
    "lr-schedule": {
      name: "learning-rate schedule and decay",
      aliases: [],
      prior: true
    },
    "test-set": {
      name: "test set",
      aliases: [],
      prior: true
    },
    "optimizer": {
      name: "optimizer",
      aliases: [],
      prior: true
    },
    "architecture": {
      name: "model architecture",
      aliases: [],
      prior: true
    },
    "accelerator": {
      name: "accelerator and its memory",
      aliases: [],
      prior: true
    },
    "loss-curve": {
      name: "loss curve",
      aliases: [],
      prior: true
    },
    "baseline": {
      name: "baseline",
      aliases: [],
      prior: true
    },
    "warmup-name": {
      name: "learning-rate warmup",
      aliases: [],
      prior: true
    },
    "clipping-name": {
      name: "gradient clipping",
      aliases: [],
      prior: true
    },
    "grid-search-name": {
      name: "grid search",
      aliases: [],
      prior: true
    }
  };
  TP.sections = {
    "01-the-tuning-loop.html": {
      "incremental": "The incremental strategy",
      "round-goal": "One goal per round",
      "exploration": "Exploration and exploitation",
      "trial-result": "A run's result",
      "studies": "Studies",
      "axis-plot": "Axis plots",
      "roles": "Scientific, nuisance and fixed hyperparameters",
      "rules": "Rules of thumb by category",
      "conditional": "Conditional hyperparameters",
      "budget": "Splitting the trials",
      "practice": "In practice",
      "recall": "Recall",
      "what-to-do": "What to do",
      "task": "Your round plan",
      "limits": "Limits"
    },
    "02-starting-a-project.html": {
      "assumptions": "Decisions made once",
      "architecture": "Architecture",
      "optimizer": "Optimizer",
      "initial": "The initial configuration",
      "step-budget": "A provisional training budget",
      "practice": "In practice",
      "recall": "Recall",
      "what-to-do": "What to do",
      "limits": "Limits"
    },
    "03-batch-size.html": {
      "controls": "What the batch size controls",
      "feasible": "Finding the feasible batch sizes",
      "training-time": "Training time",
      "budgets": "Epoch budgets and step budgets",
      "resources": "Resource consumption",
      "practice": "In practice",
      "recall": "Recall",
      "what-to-do": "What to do",
      "task": "Your starting configuration",
      "limits": "Limits"
    },
    "04-searching-the-space.html": {
      "quasi-random": "Quasi-random search",
      "why-not-bo": "Choosing the search algorithm",
      "trials": "How many trials",
      "practice": "In practice",
      "recall": "Recall",
      "what-to-do": "What to do",
      "task": "Your study design",
      "limits": "Limits"
    },
    "05-reading-the-results.html": {
      "checklist": "Checking a study before reading it",
      "boundaries": "Search-space boundaries",
      "density": "Sampling density and infeasible trials",
      "curves": "Training curves",
      "isolation": "Isolation plots",
      "practice": "In practice",
      "recall": "Recall",
      "what-to-do": "What to do",
      "task": "Your reading of a finished study",
      "limits": "Limits"
    },
    "06-adopting-a-change.html": {
      "variance": "Sources of variation",
      "reruns": "Rerunning the best trial",
      "study-variance": "Study variance",
      "adopt": "Adopting a change",
      "after": "When exploration ends",
      "practice": "In practice",
      "recall": "Recall",
      "what-to-do": "What to do",
      "task": "Your adoption decision",
      "limits": "Limits"
    },
    "07-training-horizon.html": {
      "regimes": "Compute-bound and not compute-bound",
      "not-bound": "The budget when training is not compute-bound",
      "sweep": "A first estimate from a learning-rate sweep",
      "refine": "Refining the budget from the best checkpoints",
      "revisit": "Revisiting the budget when the pipeline changes",
      "bound": "When training is compute-bound",
      "schedule": "Learning-rate schedules",
      "short-horizon": "Short-horizon bias",
      "rounds": "Tuning in rounds of increasing length",
      "extend": "Extending the schedule",
      "practice": "In practice",
      "recall": "Recall",
      "what-to-do": "What to do",
      "task": "Your budget statement",
      "limits": "Limits"
    },
    "08-training-instabilities.html": {
      "what": "When instability matters",
      "diagnosis": "Diagnosing instability",
      "fixes": "Choosing a fix",
      "warmup": "Learning-rate warmup",
      "clipping": "Gradient clipping",
      "practice": "In practice",
      "recall": "Recall",
      "what-to-do": "What to do",
      "task": "Your diagnosis and fix plan",
      "limits": "Limits"
    },
    "09-pipeline-practice.html": {
      "smoke": "Smoke tests",
      "pipeline": "The input pipeline",
      "evaluation": "Evaluation during training",
      "sample": "The evaluation sample",
      "checkpoints": "Checkpoints",
      "tracking": "Experiment tracking",
      "batchnorm": "Batch normalization",
      "multihost": "Multi-host pipelines",
      "practice": "In practice",
      "recall": "Recall",
      "what-to-do": "What to do",
      "limits": "Limits"
    },
    "reference.html": {
      "rules": "Rules of thumb",
      "notation": "Notation",
      "glossary": "Glossary",
      "update-rules": "Update rules",
      "terminology": "\"Hyperparameter\" and \"metaparameter\"",
      "source-map": "Source map",
      "added": "Additions to the playbook",
      "discrepancies": "Where the playbook and its sources differ",
      "attribution": "Attribution and license"
    },
    "../index.html": {
      "promise": "What the site offers",
      "outline": "The pages",
      "questions": "Questions",
      "symptoms": "Symptoms",
      "reading-the-figures": "Reading the figures"
    }
  };
  TP.pointers = {
    "01-the-tuning-loop.html#studies": ["axis-plot"]
  };
  TP.openings = {
    "06-adopting-a-change.html": ["02-starting-a-project.html", "01-the-tuning-loop.html"],
    "09-pipeline-practice.html": ["03-batch-size.html"]
  };
  TP.questions = [
    {
      outcome: 1,
      outcomeName: "Start a project",
      text: "Which decisions do I make once, and which do I keep tuning?",
      targets: ["02-starting-a-project.html#assumptions"]
    },
    {
      outcome: 1,
      outcomeName: "Start a project",
      text: "Why should I not tune the batch size for accuracy, and how do I choose it?",
      targets: ["03-batch-size.html#controls", "03-batch-size.html#feasible", "03-batch-size.html#training-time"]
    },
    {
      outcome: 1,
      outcomeName: "Start a project",
      text: "What does \"simple\" leave out at the start, and why?",
      targets: ["02-starting-a-project.html#initial"]
    },
    {
      outcome: 1,
      outcomeName: "Start a project",
      text: "How long should my first runs be?",
      targets: ["02-starting-a-project.html#step-budget"]
    },
    {
      outcome: 2,
      outcomeName: "Run tuning as rounds",
      text: "What is the next round trying to find out, in one sentence?",
      targets: ["01-the-tuning-loop.html#round-goal"]
    },
    {
      outcome: 2,
      outcomeName: "Run tuning as rounds",
      text: "What is a study, and what does one trial measure?",
      targets: ["01-the-tuning-loop.html#studies", "01-the-tuning-loop.html#trial-result"]
    },
    {
      outcome: 2,
      outcomeName: "Run tuning as rounds",
      text: "Why is insight worth more than a lower validation error this week?",
      targets: ["01-the-tuning-loop.html#exploration"]
    },
    {
      outcome: 2,
      outcomeName: "Run tuning as rounds",
      text: "When does exploration end, and what changes then?",
      targets: ["06-adopting-a-change.html#after"]
    },
    {
      outcome: 3,
      outcomeName: "Design and read a study",
      text: "For this goal, which hyperparameters must be searched over for the comparison to be fair, and which are held fixed at the cost of a caveat?",
      targets: ["01-the-tuning-loop.html#roles"]
    },
    {
      outcome: 3,
      outcomeName: "Design and read a study",
      text: "How many trials, over how wide a space?",
      targets: ["01-the-tuning-loop.html#budget", "04-searching-the-space.html#trials"]
    },
    {
      outcome: 3,
      outcomeName: "Design and read a study",
      text: "Which of Adam's hyperparameters should I tune?",
      targets: ["01-the-tuning-loop.html#budget"]
    },
    {
      outcome: 3,
      outcomeName: "Design and read a study",
      text: "Was the search wide enough and dense enough?",
      targets: ["05-reading-the-results.html#boundaries", "05-reading-the-results.html#density"]
    },
    {
      outcome: 3,
      outcomeName: "Design and read a study",
      text: "Which trials should I not trust?",
      targets: ["05-reading-the-results.html#checklist", "05-reading-the-results.html#curves"]
    },
    {
      outcome: 3,
      outcomeName: "Design and read a study",
      text: "Which value of the hyperparameter I am studying came out best, and what would make that comparison unfair?",
      targets: ["05-reading-the-results.html#isolation"]
    },
    {
      outcome: 4,
      outcomeName: "Adopt a change",
      text: "Is this improvement real, or did the candidate get a lucky seed or a lucky search?",
      targets: ["06-adopting-a-change.html#variance", "06-adopting-a-change.html#reruns"]
    },
    {
      outcome: 4,
      outcomeName: "Adopt a change",
      text: "What do reruns of the best trial tell me, and what can they not tell me?",
      targets: ["06-adopting-a-change.html#reruns"]
    },
    {
      outcome: 4,
      outcomeName: "Adopt a change",
      text: "When do I stop exploring?",
      targets: ["06-adopting-a-change.html#after"]
    },
    {
      outcome: 4,
      outcomeName: "Adopt a change",
      text: "Once I stop exploring, how do I search for the final configuration?",
      targets: ["06-adopting-a-change.html#after"]
    },
    {
      outcome: 5,
      outcomeName: "Set the training budget",
      text: "Is my training limited by how long I can afford to run it, or would a longer run stop helping?",
      targets: ["07-training-horizon.html#regimes"]
    },
    {
      outcome: 5,
      outcomeName: "Set the training budget",
      text: "How long should my trials train, and how do I know when I have it wrong?",
      targets: ["07-training-horizon.html#regimes", "07-training-horizon.html#sweep", "07-training-horizon.html#refine"]
    },
    {
      outcome: 5,
      outcomeName: "Set the training budget",
      text: "When my final run is ten times longer than my tuning runs, which hyperparameters carry over, and how do I stretch the schedule?",
      targets: ["07-training-horizon.html#bound", "07-training-horizon.html#extend"]
    },
    {
      outcome: 5,
      outcomeName: "Set the training budget",
      text: "Which learning-rate schedule should I use?",
      targets: ["07-training-horizon.html#schedule"]
    },
    {
      outcome: 6,
      outcomeName: "Recognize instability",
      text: "Is my model unstable, or just badly tuned?",
      targets: ["08-training-instabilities.html#what", "08-training-instabilities.html#diagnosis"]
    },
    {
      outcome: 6,
      outcomeName: "Recognize instability",
      text: "Which fix fits my instability, and how do I set it?",
      targets: ["08-training-instabilities.html#fixes", "08-training-instabilities.html#warmup", "08-training-instabilities.html#clipping"]
    },
    {
      outcome: 6,
      outcomeName: "Recognize instability",
      text: "How do I know warmup is long enough?",
      targets: ["08-training-instabilities.html#warmup"]
    },
    {
      outcome: 6,
      outcomeName: "Recognize instability",
      text: "When is clipping doing something other than clipping?",
      targets: ["08-training-instabilities.html#clipping"]
    }
  ];
  TP.symptoms = [
    {
      text: "Loss NaN or spiking in the first few hundred steps",
      targets: ["08-training-instabilities.html#diagnosis"]
    },
    {
      text: "Best trial at the edge of the search space, with no diverged trials beyond it",
      targets: ["05-reading-the-results.html#boundaries"]
    },
    {
      text: "Best trial just below a learning rate above which every trial diverged",
      targets: ["08-training-instabilities.html#diagnosis"]
    },
    {
      text: "Validation error rising late in training",
      targets: ["05-reading-the-results.html#curves"]
    },
    {
      text: "Training loss rising during training",
      targets: ["05-reading-the-results.html#curves"]
    },
    {
      text: "Training or validation error that jumps from step to step late in training",
      targets: ["05-reading-the-results.html#curves"]
    },
    {
      text: "A validation metric that oscillates with a fixed period",
      targets: ["09-pipeline-practice.html#evaluation"]
    },
    {
      text: "Two runs of one configuration that differ",
      targets: ["06-adopting-a-change.html#variance"]
    },
    {
      text: "Throughput that stops rising as the batch size doubles",
      targets: ["03-batch-size.html#feasible"]
    },
    {
      text: "Best checkpoints all near the end of the run",
      targets: ["07-training-horizon.html#refine"]
    }
  ];
})(typeof window !== "undefined" ? window : globalThis);
