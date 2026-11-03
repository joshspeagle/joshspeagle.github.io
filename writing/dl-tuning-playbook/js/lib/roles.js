/*
 * roles.js: the answer table of the roles matrix (TP.roles), for F4.1.
 *
 * Ported from version 1's p4-sort.js (TP.models.sortHparams), whose quotations were verified
 * against the README, and restructured as a matrix (notes/revamp/implementation-plan.md WO-F4.1).
 * The columns are version 1's three goals. The rows are the eleven of WO-F4.1, in its order. A
 * cell is null where the hyperparameter does not exist under the goal, and the figure prints
 * "none" there. Version 1's rows for the learning-rate schedule, hidden width, batch size and
 * max_train_steps are dropped, since each has one role under all three goals.
 *
 * A cell is {role, accepted, reason, alt, why, notes, choice, trials}:
 *   role      the table's preferred role;
 *   accepted  the other roles "Check" does not mark;
 *   reason    the playbook's reason for the preferred role, a quotation with its README lines;
 *   alt       {role: note} for each accepted role;
 *   why       {role: note} for each other role, the confusion behind choosing it;
 *   notes     further notes shown with the cell;
 *   choice    true where the table chooses between roles the playbook leaves open, and a note of
 *             the cell says the choice is the exercise's;
 *   trials    true where the answer or its feedback applies the number of trials the goal states.
 * The preferred role, the accepted roles and the keys of why name each of the three roles once.
 *
 * A note is a list of parts: a string; {q, ref: [a, b]}, a verbatim README quotation of lines a to
 * b; {q, cite}, a verbatim quotation of the paper TP.refs[cite]; {ref: [a, b]}, a README line
 * reference; {code}; {i}, italics. q is a string or a list of parts. A README quotation keeps the
 * README's words and punctuation and turns its markdown into parts (`x` into {code}, *x* into {i}),
 * and its range is the tightest that contains it. tests/lib/roles.test.js checks every quotation
 * against source/README.md and the one quotation of a paper against notes/refs/pdf/choi2019.txt.
 *
 * Changes from version 1 beyond the restructuring:
 *   - Goal 2 states its number of trials, TRIALS (the plan's lean, confirmed or changed by Batch 1,
 *     implementation plan §5.7, C6). Its cells for the learning rate, momentum, weight decay and
 *     the dropout rate apply that number: momentum is fixed by preference with nuisance accepted,
 *     the learning rate and weight decay stay nuisance because their best values generally depend
 *     on the model (L569-L572, L612-L617), the dropout rate stays nuisance as the playbook says it
 *     is once dropout is adopted (L659-L661), with fixed accepted, and the feedback of those cells
 *     quotes the procedure of L599-L617. (Batch 4's figure fixes made the dropout rate nuisance,
 *     under the lead's ruling on the page 4 reads; it was fixed by preference before.)
 *   - Every cell whose preferred role is fixed carries a note that states its caveat, in the words
 *     of L561-L563 (caveat()).
 *   - "Dropout, on or off" has a cell under goals 2 and 3, fixed in both, on the playbook's rule
 *     that including a regularization technique is a scientific or fixed hyperparameter
 *     (L653-L655). Goal 3's pipeline has no dropout, as in version 1, so its dropout rate is null.
 *   - Adam's beta1, beta2 and epsilon share one row, and their notes are merged.
 *   - The quotation of L656-L658 keeps the README's double quotation marks.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  var ROLES = ['scientific', 'nuisance', 'fixed'];
  var ROLE_LABEL = { scientific: 'Scientific', nuisance: 'Nuisance', fixed: 'Fixed' };

  /* The goal that states its number of trials and the trials per scientific value (C6). */
  var TRIALS = Object.freeze({ goal: 'g2', perValue: 12 });

  /* ---------- parts ---------- */

  function Q(q, a, b) { return { q: q, ref: [a, b === undefined ? a : b] }; }
  function R(a, b) { return { ref: [a, b === undefined ? a : b] }; }
  function C(t) { return { code: t }; }
  function I(t) { return { i: t }; }

  var N = String(TRIALS.perValue);

  /* ---------- goals ---------- */

  var PIPELINE = 'The pipeline trains a network with Nesterov momentum, a learning-rate decay schedule, weight decay, a fixed width, and ReLU';
  var GOALS = [
    {
      id: 'g1', num: 1, short: 'add dropout', question: 'Should we add dropout?',
      measures: 'the effect of adding dropout', perSetting: 'for each dropout setting',
      context: PIPELINE + ', with no dropout yet.'
    },
    {
      id: 'g2', num: 2, short: 'more layers', question: 'Does a model with more hidden layers reduce validation error?',
      measures: 'the effect of the number of hidden layers', perSetting: 'for each depth',
      context: PIPELINE + '. Dropout was adopted in an earlier round, so its rate is in the list.'
    },
    {
      id: 'g3', num: 3, short: 'Nesterov or Adam', question: 'Which of Nesterov momentum and Adam gives the lower validation error?',
      measures: 'the difference between Nesterov momentum and Adam', perSetting: 'for each optimizer',
      context: 'The pipeline has a learning-rate decay schedule, weight decay, and no dropout. The hyperparameters under each optimizer exist only for that value of optimizer.'
    }
  ];
  GOALS.forEach(function (g) {
    g.trials = g.id === TRIALS.goal ? TRIALS.perValue : null;
    if (g.trials) g.context += ' Each ' + (g.id === 'g2' ? 'depth' : 'value') + ' gets a study of ' + g.trials + ' trials.';
  });
  var G1 = GOALS[0], G2 = GOALS[1], G3 = GOALS[2];

  /* ---------- notes shared by several cells ---------- */

  /* the allowance to fix an optimizer hyperparameter (L629-L634) */
  var CAVEAT = ['Fixed is allowed when resources are short or there is strong evidence of no interaction, but the conclusion then may not hold for other values (',
    R(561, 565), ', ', R(629, 634), ').'];
  /* weight decay and the dropout rate are regularization hyperparameters (L653-L661): the general
     rule for converting a nuisance hyperparameter into a fixed one (L608-L611) */
  var CAVEAT_REG = ['Fixing it is acceptable when the caveat it introduces is judged less burdensome than the cost of tuning it (', R(608, 611),
    '), but the conclusion then may not hold for other values (', R(561, 565), ').'];
  var INTERACT = ['The more a nuisance hyperparameter interacts with the scientific ones, ', Q('the more damaging it is to fix its value', 613, 614), '.'];
  var WHY_OPT_SCI = ['Optimizer hyperparameters are rarely scientific, because the best setting ',
    Q('could easily change with the next pipeline change anyway', 627, 628), '.'];
  var LADDER_LR = ['The smallest budget in the rule of thumb for tuning Adam, fewer than 10 trials per study, still tunes the learning rate (', R(1655), ').'];
  var WHY_LR_FIXED = ['In the playbook\'s words, ',
    Q('we should generally assume that optimizer hyperparameters must be tuned separately to make fair comparisons between different settings of the scientific hyperparameters', 631, 634), '. '].concat(LADDER_LR);
  /* the rule of thumb for tuning Adam (L1650-L1659); a study of exactly 25 trials counts in the
     10-25 band (notes/discrepancy-resolutions.md, R15) */
  var LADDER_ADAM = ['Under the rule of thumb for tuning Adam, a study with 10 to 25 trials tunes the learning rate and ', C('beta1'), ' (', R(1656),
    '), a study with 25 trials or more also tunes ', C('epsilon'), ' (', R(1657), '), and ', C('beta2'),
    ' is added once a study can run substantially more than 25 trials (', R(1658, 1659), '). The playbook\'s bands overlap at 25 trials.'];
  var CHOI = ['Choi et al. (2019, Section 4.2) found that, across four workloads and the optimizers RMSProp, Adam and NAdam, ',
    { q: 'the range of the optimal values of the ϵ parameter spanned 10 orders of magnitude', cite: 'choi2019' }, '.'];
  var CHOICE_NUIS = ['The choice of optimizer ', Q('is typically a scientific hyperparameter or fixed hyperparameter', 639, 640),
    '. In this exercise, as a nuisance hyperparameter it would also bring in the conditional hyperparameters of every optimizer tried (', R(668, 677), ').'];
  /* the activation cells list Fixed as preferred, a choice of the exercise: L573-L579 gives fixed
     and nuisance as alternatives */
  var ACT_NOTE = ['The playbook offers fixed and nuisance for the activation function as alternatives without ranking them (', R(573, 579),
    '). Fixed is the exercise\'s choice, because fixing it costs no trials.'];
  var REG_WHETHER = ['Whether to include a regularization technique ', Q('is a scientific or fixed hyperparameter', 655), '. '];
  /* the goal that states its number of trials: which nuisance hyperparameters it tunes */
  var SPLIT = ['With ' + N + ' trials per depth, the exercise tunes the learning rate and weight decay, whose best values generally depend on the model (',
    R(569, 572), ', ', R(614, 617), '), and the dropout rate, which the playbook makes a nuisance hyperparameter once dropout is adopted (', R(659, 661),
    '). It fixes momentum. Whether to fix momentum at this number of trials is the exercise\'s choice.'];
  /* the caveat of a fixed hyperparameter (L561-L565), for every cell whose preferred role is fixed */
  function caveat(g, what) {
    return ['Its caveat is that a conclusion about ', g.measures, ' drawn with ', what, ' ',
      Q('might not be valid for other settings of the fixed hyperparameters', 562, 563), '.'];
  }

  function whyNotGoal(g) {
    return ['Scientific hyperparameters are those ', Q('whose effect on the model\'s performance we\'re trying to measure', 551, 552),
      ', and this goal measures ', g.measures, '.'];
  }
  function whyChoiceSci(g) {
    return ['The optimizer is scientific ', Q('if our experimental goal involves making fair comparisons between two or more different optimizers', 641, 642),
      ', and this goal measures ', g.measures, '.'];
  }
  function whyLayersNuis(g) {
    return ['Tuning the depth ', g.perSetting, ' would compare models that differ in training speed and memory use (', R(665, 667), ').'];
  }
  function actNuis(g) {
    if (g.id === 'g2') {
      return ['Nuisance is also accepted, since the activation function ',
        Q('could be a nuisance parameter if we are prepared to tune it separately for each number of hidden layers', 577, 579),
        '. Tuning it costs trials, and fixing it limits the conclusion to this activation (', R(575, 577), ').'];
    }
    return ['Nuisance is also accepted. In the depth example the activation function ',
      Q('could be a nuisance parameter if we are prepared to tune it separately for each number of hidden layers', 577, 579),
      ', and here it would be tuned ', g.perSetting, '.'];
  }
  function conditional(what, value) {
    return [what, ' exists only when ', C('optimizer="' + value + '"'), ', which makes it a conditional hyperparameter (', R(678, 679), ').'];
  }

  /* ---------- the preferred roles' quotations ---------- */

  var QUOTE_OPT = Q('Of the various optimizer hyperparameters (e.g. the learning rate, momentum, learning rate schedule parameters, Adam betas etc.), at least some of them will be nuisance hyperparameters because they tend to interact the most with other changes', 621, 624);
  var QUOTE_REG = Q('Hyperparameters introduced by a regularization technique are typically nuisance hyperparameters', 653, 654);
  var QUOTE_REG_WHETHER = Q('whether or not we include the regularization technique at all is a scientific or fixed hyperparameter', 654, 655);
  var QUOTE_LAYERS = Q('the number of layers is typically a scientific or fixed hyperparameter since it tends to have dramatic consequences for training speed and memory usage', 665, 667);
  var QUOTE_ACT_ALL = Q('the choice of activation function could be a scientific hyperparameter (is ReLU or tanh a better choice for our problem?), a nuisance hyperparameter (is the best 5-layer model better than the best 6-layer model when we allow several different possible activation functions?), or a fixed hyperparameter (for ReLU nets, does adding batch normalization in a particular position help?)', 583, 588);
  var QUOTE_ACT_DEPTH = Q('The activation function could be a fixed hyperparameter if we have determined in prior experiments that the best choice of activation function is not sensitive to model depth', 573, 575);
  var QUOTE_CHOICE = Q(['the ', I('choice'), ' of optimizer is typically a scientific hyperparameter or fixed hyperparameter'], 639, 640);
  /* the optimizer under a goal that compares no optimizers (fidelity read of page 4, finding 12c) */
  function choiceFixed(g) {
    return ['It is scientific ', Q('if our experimental goal involves making fair comparisons between two or more different optimizers', 641, 642),
      '. This goal measures ', g.measures, ' and compares no optimizers, so the exercise fixes the optimizer.'];
  }
  var QUOTE_NESTEROV = Q(['The value ', C('optimizer="Nesterov_momentum"'), ' introduces the nuisance/fixed hyperparameters ', C('{learning_rate, momentum}')], 673, 675);
  var QUOTE_ADAM = Q(['the value ', C('optimizer="Adam"'), ' introduces the nuisance/fixed hyperparameters ', C('{learning_rate, beta1, beta2, epsilon}')], 675, 677);

  /* ---------- the matrix ---------- */

  function cell(o) {
    return {
      role: o.role, accepted: o.accepted || [], reason: o.reason, alt: o.alt || {}, why: o.why || {},
      notes: o.notes || [], choice: !!o.choice, trials: !!o.trials
    };
  }

  var ROWS = [
    {
      id: 'optimizer', label: 'optimizer', code: 'optimizer',
      cells: {
        g1: cell({ role: 'fixed', reason: QUOTE_CHOICE, notes: [choiceFixed(G1), caveat(G1, 'the optimizer fixed at Nesterov momentum')], why: { scientific: whyChoiceSci(G1), nuisance: CHOICE_NUIS } }),
        g2: cell({ role: 'fixed', reason: QUOTE_CHOICE, notes: [choiceFixed(G2), caveat(G2, 'the optimizer fixed at Nesterov momentum')], why: { scientific: whyChoiceSci(G2), nuisance: CHOICE_NUIS } }),
        g3: cell({
          role: 'scientific',
          reason: Q('It is a scientific hyperparameter if our experimental goal involves making fair comparisons between two or more different optimizers', 641, 642),
          why: {
            nuisance: ['The optimizer is the hyperparameter whose effect the goal measures, which makes it scientific (', R(551, 552),
              '). Optimizing over it as a nuisance hyperparameter would leave the comparison unanswered.'],
            fixed: ['Fixing the optimizer keeps one optimizer for the whole round, and the goal compares two (', R(670, 673), ').']
          }
        })
      }
    },
    {
      id: 'learning_rate', label: 'learning rate', code: 'learning_rate',
      cells: {
        g1: cell({
          role: 'nuisance',
          reason: Q('we should generally assume that optimizer hyperparameters must be tuned separately to make fair comparisons between different settings of the scientific hyperparameters, and thus shouldn\'t be fixed', 631, 634),
          why: {
            scientific: WHY_OPT_SCI,
            fixed: ['Optimizer hyperparameters ', Q('tend to interact the most with other changes', 623, 624),
              ', so one fixed learning rate could suit training with dropout better than training without it, or the reverse.']
          }
        }),
        g2: cell({
          role: 'nuisance', trials: true,
          reason: Q('The learning rate is a nuisance hyperparameter because we can only fairly compare models with different numbers of hidden layers if the learning rate is tuned separately for each number of layers (the optimal learning rate generally depends on the model architecture)', 569, 572),
          notes: [['Each depth gets ' + N + ' trials, and ',
            Q('the more nuisance hyperparameters we attempt to tune, the greater the risk we fail to tune them sufficiently well for each setting of the scientific hyperparameters and end up reaching the wrong conclusions from our experiments', 599, 602),
            '. The learning rate stays nuisance at this number of trials, because its best value generally depends on the architecture.']],
          why: {
            scientific: WHY_OPT_SCI,
            fixed: ['The optimal learning rate ', Q('generally depends on the model architecture', 572), ', so one fixed learning rate would favor some depths over others.']
          }
        }),
        g3: null
      }
    },
    {
      id: 'lr_nesterov', label: 'learning rate (Nesterov)', code: 'learning_rate',
      cells: {
        g1: null,
        g2: null,
        g3: cell({
          role: 'nuisance',
          reason: Q(['the conditional hyperparameter called ', C('learning_rate'), ' is a ', I('different'), ' hyperparameter for ',
            C('optimizer="Nesterov_momentum"'), ' versus ', C('optimizer="Adam"')], 681, 683),
          notes: [conditional(['This ', C('learning_rate')], 'Nesterov_momentum')],
          why: {
            scientific: WHY_OPT_SCI,
            fixed: ['In the playbook\'s words, ', Q('we should generally assume that optimizer hyperparameters must be tuned separately to make fair comparisons between different settings of the scientific hyperparameters', 631, 634),
              '. A learning rate fixed at one value in each study could suit one optimizer far better than the other.']
          }
        })
      }
    },
    {
      id: 'lr_adam', label: 'learning rate (Adam)', code: 'learning_rate',
      cells: {
        g1: null,
        g2: null,
        g3: cell({
          role: 'nuisance',
          reason: Q('the range of values that work well in each of the optimizers is typically different by several orders of magnitude', 684, 686),
          notes: [conditional(['This ', C('learning_rate')], 'Adam')],
          why: { scientific: WHY_OPT_SCI, fixed: WHY_LR_FIXED }
        })
      }
    },
    {
      id: 'momentum', label: 'momentum', code: 'momentum',
      cells: {
        g1: cell({ role: 'nuisance', accepted: ['fixed'], reason: QUOTE_OPT, alt: { fixed: CAVEAT }, why: { scientific: WHY_OPT_SCI } }),
        g2: cell({
          role: 'fixed', accepted: ['nuisance'], choice: true, trials: true,
          reason: Q('Although we might fix some of them occasionally due to resource constraints or when we have particularly strong evidence that they don\'t interact with the scientific parameters', 629, 631),
          alt: {
            nuisance: ['Nuisance is also accepted. Optimizer hyperparameters ', Q('tend to interact the most with other changes', 623, 624),
              ', and tuning momentum as well spreads the ' + N + ' trials of each depth over four nuisance hyperparameters.']
          },
          notes: [SPLIT, caveat(G2, 'momentum fixed')],
          why: { scientific: WHY_OPT_SCI }
        }),
        g3: cell({
          role: 'nuisance', accepted: ['fixed'], reason: QUOTE_NESTEROV, alt: { fixed: CAVEAT },
          notes: [conditional(['Here ', C('momentum')], 'Nesterov_momentum')],
          why: { scientific: WHY_OPT_SCI }
        })
      }
    },
    {
      id: 'adam_betas_epsilon', label: 'β₁, β₂, ε (Adam)', code: 'beta1, beta2, epsilon',
      cells: {
        g1: null,
        g2: null,
        g3: cell({
          role: 'nuisance', accepted: ['fixed'], reason: QUOTE_ADAM, alt: { fixed: CAVEAT },
          notes: [
            ['These three exist only when ', C('optimizer="Adam"'), ', which makes them conditional hyperparameters (', R(678, 679), ').'],
            LADDER_ADAM,
            CHOI
          ],
          why: { scientific: WHY_OPT_SCI }
        })
      }
    },
    {
      id: 'weight_decay', label: 'weight decay', code: 'weight_decay',
      cells: {
        g1: cell({ role: 'nuisance', accepted: ['fixed'], reason: QUOTE_REG, alt: { fixed: CAVEAT_REG }, notes: [INTERACT], why: { scientific: whyNotGoal(G1) } }),
        g2: cell({
          role: 'nuisance', trials: true,
          reason: Q('the best value of the weight decay strength typically depends on the model size, so comparing different model sizes assuming a single specific value of the weight decay would not be very insightful', 614, 617),
          notes: [['Weight decay stays nuisance at ' + N + ' trials per depth, because ',
            Q('The more a given nuisance hyperparameter interacts with the scientific hyperparameters, the more damaging it is to fix its value', 612, 614), '.']],
          why: {
            scientific: whyNotGoal(G2),
            fixed: ['Fixing weight decay would compare the depths at one weight decay, which the playbook calls not very insightful because the best value depends on model size (', R(614, 617), ').']
          }
        }),
        g3: cell({ role: 'nuisance', accepted: ['fixed'], reason: QUOTE_REG, alt: { fixed: CAVEAT_REG }, notes: [INTERACT], why: { scientific: whyNotGoal(G3) } })
      }
    },
    {
      id: 'dropout', label: 'dropout, on or off', code: 'dropout',
      cells: {
        g1: cell({
          role: 'scientific',
          reason: Q('dropout adds code complexity, so when deciding whether to include it we would make "no dropout" vs "dropout" a scientific hyperparameter', 656, 658),
          why: {
            nuisance: REG_WHETHER.concat(['Optimizing over dropout as a nuisance hyperparameter would leave the question of adding it unanswered.']),
            fixed: ['Fixing dropout keeps one setting for the whole round, and the goal compares the two settings (', R(656, 658), ').']
          }
        }),
        g2: cell({
          role: 'fixed', reason: QUOTE_REG_WHETHER,
          notes: [['Dropout was adopted in an earlier round, the follow-on case of ', R(659, 661), ', so it stays on in this one.'], caveat(G2, 'dropout fixed on')],
          why: {
            scientific: whyNotGoal(G2),
            nuisance: REG_WHETHER.concat(['Tuning dropout on and off within each study would reopen a question an earlier round settled.'])
          }
        }),
        g3: cell({
          role: 'fixed', reason: QUOTE_REG_WHETHER,
          notes: [['The pipeline of this goal has no dropout, so dropout stays off and its rate does not exist.'], caveat(G3, 'dropout fixed off')],
          why: {
            scientific: whyNotGoal(G3),
            nuisance: REG_WHETHER.concat(['Tuning dropout on and off would add a second change to a comparison of two optimizers.'])
          }
        })
      }
    },
    {
      id: 'dropout_rate', label: 'dropout rate', code: 'dropout_rate',
      cells: {
        g1: cell({
          role: 'nuisance',
          reason: Q('we would make "no dropout" vs "dropout" a scientific hyperparameter and the dropout rate a nuisance hyperparameter', 657, 658),
          notes: [['The rate exists only when dropout is on, which makes it a conditional hyperparameter (', R(678, 679), ').']],
          why: {
            scientific: ['The scientific question is whether to include dropout (', R(656, 658), '). The rate is a hyperparameter the technique introduces, and those ',
              Q('are typically nuisance hyperparameters', 653, 654), '.'],
            fixed: ['Fixing the rate would compare dropout at one arbitrary rate with no dropout. Nuisance hyperparameters ',
              Q('need to be optimized over in order to fairly compare different values of the scientific hyperparameters', 553, 555), '.']
          }
        }),
        g2: cell({
          role: 'nuisance', accepted: ['fixed'], trials: true,
          reason: Q('If we decide to add dropout to our pipeline based on this experiment, then the dropout rate would be a nuisance hyperparameter in future experiments', 659, 661),
          alt: {
            fixed: ['Fixed is also accepted. The playbook\'s rule for fixing a nuisance hyperparameter reads: ', Q('We choose to convert a nuisance hyperparameter into a fixed hyperparameter when, in our judgment, the caveats introduced by fixing it are less burdensome than the cost of including it as a nuisance hyperparameter', 608, 611),
              '. Fixing the rate saves trials, and a conclusion about depth then ', Q('might not be valid for other settings of the fixed hyperparameters', 562, 563),
              '. Accepting fixed at this number of trials is the exercise\'s choice.']
          },
          notes: [SPLIT],
          why: { scientific: whyNotGoal(G2) }
        }),
        g3: null
      }
    },
    {
      id: 'num_hidden_layers', label: 'hidden layers', code: 'num_hidden_layers',
      cells: {
        g1: cell({ role: 'fixed', reason: QUOTE_LAYERS, notes: [caveat(G1, 'the number of hidden layers fixed')], why: { scientific: whyNotGoal(G1), nuisance: whyLayersNuis(G1) } }),
        g2: cell({
          role: 'scientific',
          reason: Q('then the number of hidden layers is a scientific hyperparameter', 567, 568),
          why: {
            nuisance: ['Depth is the hyperparameter whose effect the goal measures, which makes it scientific (', R(551, 552),
              '). Optimizing over it as a nuisance hyperparameter would leave the question unanswered.'],
            fixed: ['Fixing the depth keeps one value for the whole round, and the goal compares depths (', R(566, 568), ').']
          }
        }),
        g3: cell({ role: 'fixed', reason: QUOTE_LAYERS, notes: [caveat(G3, 'the number of hidden layers fixed')], why: { scientific: whyNotGoal(G3), nuisance: whyLayersNuis(G3) } })
      }
    },
    {
      id: 'activation_function', label: 'activation function', code: 'activation_function',
      cells: {
        g1: cell({ role: 'fixed', accepted: ['nuisance'], choice: true, reason: QUOTE_ACT_ALL, alt: { nuisance: actNuis(G1) }, notes: [ACT_NOTE, caveat(G1, 'the activation function fixed at ReLU')], why: { scientific: whyNotGoal(G1) } }),
        g2: cell({
          role: 'fixed', accepted: ['nuisance'], choice: true, reason: QUOTE_ACT_DEPTH, alt: { nuisance: actNuis(G2) }, notes: [ACT_NOTE, caveat(G2, 'the activation function fixed at ReLU')],
          why: {
            scientific: ['The activation function is scientific when the goal compares activations, as in ',
              Q('is ReLU or tanh a better choice for our problem?', 584), '. This goal measures ', G2.measures, '.']
          }
        }),
        g3: cell({ role: 'fixed', accepted: ['nuisance'], choice: true, reason: QUOTE_ACT_ALL, alt: { nuisance: actNuis(G3) }, notes: [ACT_NOTE, caveat(G3, 'the activation function fixed')], why: { scientific: whyNotGoal(G3) } })
      }
    }
  ];

  /* ---------- reading the table ---------- */

  function deepFreeze(o) {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) {
      Object.freeze(o);
      Object.keys(o).forEach(function (k) { deepFreeze(o[k]); });
    }
    return o;
  }

  function rowById(id) {
    for (var i = 0; i < ROWS.length; i++) if (ROWS[i].id === id) return ROWS[i];
    return null;
  }

  /** The cell of a row under a goal, or null where the hyperparameter does not exist. */
  function cellOf(rowId, goalId) {
    var r = rowById(rowId);
    if (!r) throw new RangeError('TP.roles: unknown row ' + rowId);
    if (!(goalId in r.cells)) throw new RangeError('TP.roles: unknown goal ' + goalId);
    return r.cells[goalId];
  }

  /**
   * classify(cell, role): null when there is no cell or no role, 'match' for the preferred role,
   * 'accepted' for an accepted role, and 'differs' otherwise, which "Check" marks.
   */
  function classify(c, role) {
    if (!c || !role) return null;
    if (role === c.role) return 'match';
    if (c.accepted.indexOf(role) >= 0) return 'accepted';
    return 'differs';
  }

  /** The ids of the rows whose preferred role differs between the goals where the row exists. */
  function changes() {
    return ROWS.filter(function (r) {
      var seen = GOALS.map(function (g) { return r.cells[g.id]; }).filter(Boolean).map(function (c) { return c.role; });
      return seen.some(function (x) { return x !== seen[0]; });
    }).map(function (r) { return r.id; });
  }

  /** The ids of the rows of changes() that one role fits under every goal, as the preferred or an
      accepted role: a reader who keeps that role throughout counts the other rows alone, and the
      exercise accepts either count (build log Batch 7). */
  function steadyChanges() {
    return changes().filter(function (id) {
      var row = ROWS.filter(function (r) { return r.id === id; })[0];
      var cs = GOALS.map(function (g) { return row.cells[g.id]; }).filter(Boolean);
      return ROLES.some(function (role) { return cs.every(function (c) { return classify(c, role) !== 'differs'; }); });
    });
  }

  /** The plain text of a list of parts, as a reader sees it (quotations without quotation marks). */
  function flatten(p) {
    if (p == null) return '';
    if (typeof p === 'string') return p;
    if (Array.isArray(p)) return p.map(flatten).join('');
    if (p.q != null) return flatten(p.q);
    if (p.code != null) return p.code;
    if (p.i != null) return p.i;
    if (p.ref) return 'L' + p.ref[0] + (p.ref[1] !== p.ref[0] ? '-L' + p.ref[1] : '');
    return '';
  }

  /**
   * quotations() -> [{where, text, ref, cite}]: every quotation and line reference in the table,
   * where naming its row, goal and field. text is null for a bare line reference.
   */
  function quotations() {
    var out = [];
    function walk(parts, where) {
      (Array.isArray(parts) ? parts : [parts]).forEach(function (p) {
        if (Array.isArray(p)) { walk(p, where); return; }
        if (!p || typeof p !== 'object') return;
        if (p.q != null) out.push({ where: where, text: flatten(p.q), ref: p.ref || null, cite: p.cite || null });
        else if (p.ref) out.push({ where: where, text: null, ref: p.ref, cite: null });
      });
    }
    ROWS.forEach(function (r) {
      GOALS.forEach(function (g) {
        var c = r.cells[g.id];
        if (!c) return;
        var w = r.id + ' ' + g.id;
        walk([c.reason], w + ' reason');
        Object.keys(c.alt).forEach(function (k) { walk(c.alt[k], w + ' alt ' + k); });
        Object.keys(c.why).forEach(function (k) { walk(c.why[k], w + ' why ' + k); });
        c.notes.forEach(function (n, i) { walk(n, w + ' note ' + i); });
      });
    });
    return out;
  }

  TP.roles = {
    ROLES: deepFreeze(ROLES),
    ROLE_LABEL: deepFreeze(ROLE_LABEL),
    TRIALS: TRIALS,
    goals: deepFreeze(GOALS),
    rows: deepFreeze(ROWS),
    cell: cellOf,
    classify: classify,
    changes: changes,
    steadyChanges: steadyChanges,
    flatten: flatten,
    quotations: quotations
  };
})(typeof window !== 'undefined' ? window : globalThis);
