/* Shared reference table and page manifest for the v4 Deep Learning Tuning Playbook series.
 * Loaded on every page before site.js. Exposes window.TP.refs and window.TP.pages.
 *
 * Every citation in the prose is a <cite data-ref="key"></cite> element; site.js numbers them in
 * order of first appearance on the page, turns each into a bracketed link to #ref-key with a rich
 * hover tooltip, and populates <ol id="reflist"> at the bottom of the page with only the entries
 * cited on that page.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  TP.playbookUrl = 'https://github.com/google-research/tuning_playbook';
  TP.playbookCommit = '7554a51';
  TP.playbookRawLineUrl = function (lineStart, lineEnd) {
    var frag = '#L' + lineStart + (lineEnd && lineEnd !== lineStart ? '-L' + lineEnd : '');
    return TP.playbookUrl + '/blob/' + TP.playbookCommit + '/README.md?plain=1' + frag;
  };

  TP.refs = {
    wu2018: {
      authors: 'Yuhuai Wu, Mengye Ren, Renjie Liao, Roger B. Grosse',
      year: '2018',
      title: 'Understanding Short-Horizon Bias in Stochastic Meta-Optimization',
      venue: 'International Conference on Learning Representations (ICLR 2018)',
      url: 'https://arxiv.org/abs/1803.02021'
    },
    hoffmann2022: {
      authors: 'Jordan Hoffmann, Sebastian Borgeaud, Arthur Mensch, Elena Buchatskaya, Trevor Cai, Eliza Rutherford, et al.',
      year: '2022',
      title: 'Training Compute-Optimal Large Language Models',
      venue: 'Advances in Neural Information Processing Systems 35 (NeurIPS 2022)',
      url: 'https://arxiv.org/abs/2203.15556'
    },
    hagele2024: {
      authors: 'Alexander H\u00e4gele, Elie Bakouch, Atli Kosson, Loubna Ben Allal, Leandro Von Werra, Martin Jaggi',
      year: '2024',
      title: 'Scaling Laws and Compute-Optimal Training Beyond Fixed Training Durations',
      venue: 'Advances in Neural Information Processing Systems 37 (NeurIPS 2024)',
      url: 'https://arxiv.org/abs/2405.18392'
    },
    wortsman2023: {
      authors: 'Mitchell Wortsman, Peter J. Liu, Lechao Xiao, Katie Everett, Alex Alemi, Ben Adlam, John D. Co-Reyes, et al.',
      year: '2023',
      title: 'Small-scale proxies for large-scale Transformer training instabilities',
      venue: 'arXiv:2309.14322 (ICLR 2024)',
      url: 'https://arxiv.org/abs/2309.14322'
    },
    sutton2019: {
      authors: 'Richard S. Sutton',
      year: '2019',
      title: 'The Bitter Lesson',
      venue: 'Essay, Incomplete Ideas (blog), 13 March 2019',
      url: 'http://www.incompleteideas.net/IncIdeas/BitterLesson.html',
      note: 'An opinion essay, not a peer-reviewed paper.'
    },
    dosovitskiy2021: {
      authors: 'Alexey Dosovitskiy, Lucas Beyer, Alexander Kolesnikov, Dirk Weissenborn, Xiaohua Zhai, Thomas Unterthiner, Mostafa Dehghani, Matthias Minderer, Georg Heigold, Sylvain Gelly, Jakob Uszkoreit, Neil Houlsby',
      year: '2021',
      title: 'An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale',
      venue: 'International Conference on Learning Representations (ICLR 2021)',
      url: 'https://arxiv.org/abs/2010.11929'
    },
    bommasani2021: {
      authors: 'Rishi Bommasani, Drew A. Hudson, Ehsan Adeli, et al.',
      year: '2021',
      title: 'On the Opportunities and Risks of Foundation Models',
      venue: 'arXiv:2108.07258',
      url: 'https://arxiv.org/abs/2108.07258'
    },
    he2019: {
      authors: 'Kaiming He, Ross Girshick, Piotr Dollár',
      year: '2019',
      title: 'Rethinking ImageNet Pre-training',
      venue: 'IEEE/CVF International Conference on Computer Vision (ICCV 2019)',
      url: 'https://arxiv.org/abs/1811.08883'
    },
    kornblith2019: {
      authors: 'Simon Kornblith, Jonathon Shlens, Quoc V. Le',
      year: '2019',
      title: 'Do Better ImageNet Models Transfer Better?',
      venue: 'IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR 2019)',
      url: 'https://arxiv.org/abs/1805.08974'
    },
    raghu2019: {
      authors: 'Maithra Raghu, Chiyuan Zhang, Jon Kleinberg, Samy Bengio',
      year: '2019',
      title: 'Transfusion: Understanding Transfer Learning for Medical Imaging',
      venue: 'Advances in Neural Information Processing Systems (NeurIPS 2019)',
      url: 'https://arxiv.org/abs/1902.07208'
    },
    playbook: {
      authors: 'Varun Godbole, George E. Dahl, Justin Gilmer, Christopher J. Shallue, Zachary Nado',
      year: '2023',
      title: 'Deep Learning Tuning Playbook',
      venue: 'GitHub repository, Version 1.0 (commit 7554a51)',
      url: 'https://github.com/google-research/tuning_playbook',
      note: 'Primary source text for this series; licensed CC BY 4.0.'
    },
    shallue2018: {
      authors: 'Christopher J. Shallue, Jaehoon Lee, Joseph Antognini, Jascha Sohl-Dickstein, Roy Frostig, George E. Dahl',
      year: '2019',
      title: 'Measuring the Effects of Data Parallelism on Neural Network Training',
      venue: 'Journal of Machine Learning Research, 20(112), 1-49',
      url: 'https://jmlr.org/papers/v20/18-789.html'
    },
    mccandlish2018: {
      authors: 'Sam McCandlish, Jared Kaplan, Dario Amodei, OpenAI Dota Team',
      year: '2018',
      title: 'An Empirical Model of Large-Batch Training',
      venue: 'arXiv:1812.06162',
      url: 'https://arxiv.org/abs/1812.06162'
    },
    zhang2019: {
      authors: 'Guodong Zhang, Lala Li, Zachary Nado, James Martens, Sushant Sachdeva, George E. Dahl, Christopher J. Shallue, Roger Grosse',
      year: '2019',
      title: 'Which Algorithmic Choices Matter at Which Batch Sizes? Insights From a Noisy Quadratic Model',
      venue: 'Advances in Neural Information Processing Systems (NeurIPS 2019)',
      url: 'https://arxiv.org/abs/1907.04164'
    },
    zhang2024: {
      authors: 'Hanlin Zhang, Depen Morwani, Nikhil Vyas, Jingfeng Wu, Difan Zou, Udaya Ghai, Dean Foster, Sham Kakade',
      year: '2024',
      title: 'How Does Critical Batch Size Scale in Pre-training?',
      venue: 'arXiv:2410.21676',
      url: 'https://arxiv.org/abs/2410.21676'
    },
    bergstra2012: {
      authors: 'James Bergstra, Yoshua Bengio',
      year: '2012',
      title: 'Random Search for Hyper-Parameter Optimization',
      venue: 'Journal of Machine Learning Research, 13(10), 281-305',
      url: 'https://jmlr.org/papers/v13/bergstra12a.html'
    },
    bousquet2017: {
      authors: 'Olivier Bousquet, Sylvain Gelly, Karol Kurach, Olivier Teytaud, Damien Vincent',
      year: '2017',
      title: 'Critical Hyper-Parameters: No Random, No Cry',
      venue: 'arXiv:1706.03200',
      url: 'https://arxiv.org/abs/1706.03200'
    },
    choi2019: {
      authors: 'Dami Choi, Christopher J. Shallue, Zachary Nado, Jaehoon Lee, Chris J. Maddison, George E. Dahl',
      year: '2019',
      title: 'On Empirical Comparisons of Optimizers for Deep Learning',
      venue: 'arXiv:1910.05446',
      url: 'https://arxiv.org/abs/1910.05446'
    },
    schmidt2021: {
      authors: 'Robin M. Schmidt, Frank Schneider, Philipp Hennig',
      year: '2021',
      title: 'Descending through a Crowded Valley - Benchmarking Deep Learning Optimizers',
      venue: 'Proceedings of the 38th International Conference on Machine Learning (PMLR 139:9367-9376)',
      url: 'https://arxiv.org/abs/2007.01547'
    },
    bouthillier2021: {
      authors: 'Xavier Bouthillier, Pierre Delaunay, Mirko Bronzi, Assya Trofimov, Brennan Nichyporuk, Justin Szeto, Nazanin Mohammadi Sepahvand, Edward Raff, Kanika Madan, Voleti Vikram, Samira Ebrahimi Kahou, Vincent Michalski, Tal Arbel, Chris Pal, Gael Varoquaux, Pascal Vincent',
      year: '2021',
      title: 'Accounting for Variance in Machine Learning Benchmarks',
      venue: 'Proceedings of Machine Learning and Systems (MLSys 2021)',
      url: 'https://arxiv.org/abs/2103.03098'
    },
    picard2021: {
      authors: 'David Picard',
      year: '2021',
      title: 'Torch.manual_seed(3407) is all you need: On the influence of random seeds in deep learning architectures for computer vision',
      venue: 'arXiv:2109.08203',
      url: 'https://arxiv.org/abs/2109.08203'
    },
    Jordan2023: {
      authors: 'Keller Jordan',
      year: '2024',
      title: '94% on CIFAR-10 in 3.29 Seconds on a Single GPU',
      venue: 'arXiv:2404.00498',
      url: 'https://arxiv.org/abs/2404.00498'
    },
    dahl2023: {
      authors: 'George E. Dahl, Frank Schneider, Zachary Nado, Naman Agarwal, Chandramouli Shama Sastry, Philipp Hennig, Sourabh Medapati, Runa Eschenhagen, Priya Kasimbeg, Daniel Suo, Juhan Bae, Justin Gilmer, Abel L. Peirson, Bilal Khan, Rohan Anil, Mike Rabbat, Shankar Krishnan, Daniel Snider, Ehsan Amid, Kongtao Chen, Chris J. Maddison, Rakshith Vasudev, Michal Badura, Ankush Garg, Peter Mattson',
      year: '2023',
      title: 'Benchmarking Neural Network Training Algorithms',
      venue: 'arXiv:2306.07179',
      url: 'https://arxiv.org/abs/2306.07179'
    },
    gilmer2021: {
      authors: 'Justin Gilmer, Behrooz Ghorbani, Ankush Garg, Sameer Kumar, Ying Xiao, Yanping Huang, Gregory Guresh, David Cardoze, Surya Ganguli, George E. Dahl',
      year: '2022',
      title: 'A Loss Curvature Perspective on Training Instabilities of Deep Learning Models',
      venue: 'International Conference on Learning Representations (ICLR 2022)',
      url: 'https://arxiv.org/abs/2110.04369'
    },
    bachlechner2020: {
      authors: 'Thomas Bachlechner, Bodhisattwa Prasad Majumder, Huanru Henry Mao, Garrison W. Cottrell, Julian McAuley',
      year: '2021',
      title: 'ReZero is All You Need: Fast Convergence at Large Depth',
      venue: 'Proceedings of the Thirty-Seventh Conference on Uncertainty in Artificial Intelligence (PMLR 161:1352-1361)',
      url: 'https://arxiv.org/abs/2003.04887'
    },
    ba2016: {
      authors: 'Jimmy Lei Ba, Jamie Ryan Kiros, Geoffrey E. Hinton',
      year: '2016',
      title: 'Layer Normalization',
      venue: 'arXiv:1607.06450',
      url: 'https://arxiv.org/abs/1607.06450'
    },
    karpathy2019: {
      authors: 'Andrej Karpathy',
      year: '2019',
      title: 'A Recipe for Training Neural Networks',
      venue: 'Essay, Andrej Karpathy blog, 25 April 2019',
      url: 'https://karpathy.github.io/2019/04/25/recipe/'
    },
    cohen2021: {
      authors: 'Jeremy M. Cohen, Simran Kaur, Yuanzhi Li, J. Zico Kolter, Ameet Talwalkar',
      year: '2021',
      title: 'Gradient Descent on Neural Networks Typically Occurs at the Edge of Stability',
      venue: 'International Conference on Learning Representations (ICLR 2021)',
      url: 'https://arxiv.org/abs/2103.00065'
    },
    cohen2022: {
      authors: 'Jeremy M. Cohen, Behrooz Ghorbani, Shankar Krishnan, Naman Agarwal, Sourabh Medapati, Michal Badura, Daniel Suo, David Cardoze, Zachary Nado, George E. Dahl, Justin Gilmer',
      year: '2022',
      title: 'Adaptive Gradient Methods at the Edge of Stability',
      venue: 'arXiv:2207.14484',
      url: 'https://arxiv.org/abs/2207.14484'
    },
    defazio2023: {
      authors: 'Aaron Defazio, Ashok Cutkosky, Harsh Mehta, Konstantin Mishchenko',
      year: '2023',
      title: 'When, Why and How Much? Adaptive Learning Rate Scheduling by Refinement',
      venue: 'arXiv:2310.07831',
      url: 'https://arxiv.org/abs/2310.07831'
    },
    pascanu2013: {
      authors: 'Razvan Pascanu, Tomas Mikolov, Yoshua Bengio',
      year: '2013',
      title: 'On the difficulty of training recurrent neural networks',
      venue: 'Proceedings of the 30th International Conference on Machine Learning (PMLR 28(3):1310-1318)',
      url: 'https://proceedings.mlr.press/v28/pascanu13.html'
    },
    loshchilov2016: {
      authors: 'Ilya Loshchilov, Frank Hutter',
      year: '2017',
      title: 'SGDR: Stochastic Gradient Descent with Warm Restarts',
      venue: 'International Conference on Learning Representations (ICLR 2017)',
      url: 'https://arxiv.org/abs/1608.03983'
    },
    loshchilov2019: {
      authors: 'Ilya Loshchilov, Frank Hutter',
      year: '2019',
      title: 'Decoupled Weight Decay Regularization',
      venue: 'International Conference on Learning Representations (ICLR 2019)',
      url: 'https://arxiv.org/abs/1711.05101'
    },
    kingma2014: {
      authors: 'Diederik P. Kingma, Jimmy Ba',
      year: '2015',
      title: 'Adam: A Method for Stochastic Optimization',
      venue: 'International Conference on Learning Representations (ICLR 2015)',
      url: 'https://arxiv.org/abs/1412.6980'
    },
    polyak1964: {
      authors: 'Boris T. Polyak',
      year: '1964',
      title: 'Some methods of speeding up the convergence of iteration methods',
      venue: 'USSR Computational Mathematics and Mathematical Physics, 4(5), 1-17',
      url: 'https://doi.org/10.1016/0041-5553(64)90137-5'
    },
    nesterov1983: {
      authors: 'Yurii Nesterov',
      year: '1983',
      title: 'A method for solving the convex programming problem with convergence rate O(1/k^2)',
      venue: 'Doklady Akademii Nauk SSSR, 269, 543-547',
      url: 'https://scholar.google.com/scholar?q=Nesterov+1983+convergence+rate'
    },
    sutskever2013: {
      authors: 'Ilya Sutskever, James Martens, George Dahl, Geoffrey Hinton',
      year: '2013',
      title: 'On the importance of initialization and momentum in deep learning',
      venue: 'Proceedings of the 30th International Conference on Machine Learning (PMLR 28(3):1139-1147)',
      url: 'https://proceedings.mlr.press/v28/sutskever13.html'
    },
    hoffer2017: {
      authors: 'Elad Hoffer, Itay Hubara, Daniel Soudry',
      year: '2017',
      title: 'Train longer, generalize better: closing the generalization gap in large batch training of neural networks',
      venue: 'Advances in Neural Information Processing Systems (NeurIPS 2017)',
      url: 'https://arxiv.org/abs/1705.08741'
    },
    goyal2017: {
      authors: 'Priya Goyal, Piotr Dollar, Ross Girshick, Pieter Noordhuis, Lukasz Wesolowski, Aapo Kyrola, Andrew Tulloch, Yangqing Jia, Kaiming He',
      year: '2017',
      title: 'Accurate, Large Minibatch SGD: Training ImageNet in 1 Hour',
      venue: 'arXiv:1706.02677',
      url: 'https://arxiv.org/abs/1706.02677'
    },
    ioffe2015: {
      authors: 'Sergey Ioffe, Christian Szegedy',
      year: '2015',
      title: 'Batch Normalization: Accelerating Deep Network Training by Reducing Internal Covariate Shift',
      venue: 'Proceedings of the 32nd International Conference on Machine Learning (PMLR 37:448-456)',
      url: 'https://proceedings.mlr.press/v37/ioffe15.html'
    },
    wuhe2018: {
      authors: 'Yuxin Wu, Kaiming He',
      year: '2018',
      title: 'Group Normalization',
      venue: 'Proceedings of the European Conference on Computer Vision (ECCV 2018), pp. 3-19',
      url: 'https://arxiv.org/abs/1803.08494'
    },
    snoek2012: {
      authors: 'Jasper Snoek, Hugo Larochelle, Ryan P. Adams',
      year: '2012',
      title: 'Practical Bayesian Optimization of Machine Learning Algorithms',
      venue: 'Advances in Neural Information Processing Systems 25 (NeurIPS 2012)',
      url: 'https://arxiv.org/abs/1206.2944'
    },
    gelbart2014: {
      authors: 'Michael A. Gelbart, Jasper Snoek, Ryan P. Adams',
      year: '2014',
      title: 'Bayesian Optimization with Unknown Constraints',
      venue: 'Proceedings of the 30th Conference on Uncertainty in Artificial Intelligence (UAI 2014)',
      url: 'https://arxiv.org/abs/1403.5607'
    },
    dwork2015: {
      authors: 'Cynthia Dwork, Vitaly Feldman, Moritz Hardt, Toniann Pitassi, Omer Reingold, Aaron Roth',
      year: '2015',
      title: 'The Reusable Holdout: Preserving Validity in Adaptive Data Analysis',
      venue: 'Science, 349(6248), 636-638',
      url: 'https://doi.org/10.1126/science.aaa9375'
    }
  };

  /* Ordered list of pages in the 9-post v4 prerequisite-first arc. */
  TP.pages = [
    { num: 0, file: 'index.html', slug: 'index.html', title: 'Notes on the Deep Learning Tuning Playbook', short: 'Overview', group: 'Overview', unnumbered: true },
    { num: 1, file: 'pages/01-the-tuning-loop.html', slug: 'pages/01-the-tuning-loop.html', title: 'Tuning a network one question at a time', short: '1. One question at a time', act: 1, actName: 'Act I · Experimental method and setup', group: 'Act I · Experimental method and setup' },
    { num: 2, file: 'pages/02-starting-a-project.html', slug: 'pages/02-starting-a-project.html', title: 'Starting a new project', short: '2. Starting a project', act: 1, actName: 'Act I · Experimental method and setup', group: 'Act I · Experimental method and setup' },
    { num: 3, file: 'pages/03-batch-size.html', slug: 'pages/03-batch-size.html', title: 'Choosing the batch size', short: '3. Batch size', act: 1, actName: 'Act I · Experimental method and setup', group: 'Act I · Experimental method and setup' },
    { num: 4, file: 'pages/04-searching-the-space.html', slug: 'pages/04-searching-the-space.html', title: 'Where to put your trials, and how many to run', short: '4. Placing trials', act: 2, actName: 'Act II · Running, reading and deciding', group: 'Act II · Running, reading and deciding' },
    { num: 5, file: 'pages/05-reading-the-results.html', slug: 'pages/05-reading-the-results.html', title: 'Reading the results of a tuning study', short: '5. Reading results', act: 2, actName: 'Act II · Running, reading and deciding', group: 'Act II · Running, reading and deciding' },
    { num: 6, file: 'pages/06-adopting-a-change.html', slug: 'pages/06-adopting-a-change.html', title: 'Deciding whether to adopt a change', short: '6. Adopting a change', act: 2, actName: 'Act II · Running, reading and deciding', group: 'Act II · Running, reading and deciding' },
    { num: 7, file: 'pages/07-training-horizon.html', slug: 'pages/07-training-horizon.html', title: 'How long to train', short: '7. How long to train', act: 3, actName: 'Act III · Dynamics, stability and engineering', group: 'Act III · Dynamics, stability and engineering' },
    { num: 8, file: 'pages/08-training-instabilities.html', slug: 'pages/08-training-instabilities.html', title: 'Finding and fixing training instabilities', short: '8. Instabilities', act: 3, actName: 'Act III · Dynamics, stability and engineering', group: 'Act III · Dynamics, stability and engineering' },
    { num: 9, file: 'pages/09-pipeline-practice.html', slug: 'pages/09-pipeline-practice.html', title: 'Input pipelines, evaluation, checkpoints and multi-host training', short: '9. Pipeline practice', act: 3, actName: 'Act III · Dynamics, stability and engineering', group: 'Act III · Dynamics, stability and engineering' },
    { num: 10, file: 'pages/reference.html', slug: 'pages/reference.html', title: 'Rules, glossary and notation', short: 'Reference', group: 'Reference', unnumbered: true }
  ];
  TP.playbookCommit = '7554a51db292242213292d1fa939dc87ffc7be59';
})(typeof window !== 'undefined' ? window : globalThis);
