/* Shared reference table for Notes on the Deep Learning Tuning Playbook.
 * Loaded after js/data/config.js. Exposes window.TP.refs and URL helpers.
 *
 * Every citation in the prose is a <cite data-ref="key"></cite> element; article.js numbers
 * them in first-appearance order, links each to #ref-key, and populates <ol id="reflist">.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  TP.playbookUrl = TP.playbookUrl || 'https://github.com/google-research/tuning_playbook';
  TP.playbookCommit = TP.playbookCommit || '7554a51db292242213292d1fa939dc87ffc7be59';
  TP.playbookRawLineUrl = TP.playbookRawLineUrl || function (lineStart, lineEnd) {
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
      authors: 'Kaiming He, Ross Girshick, Piotr Doll\u00e1r',
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
    hu2022: {
      authors: 'Edward J. Hu, Yelong Shen, Phillip Wallis, Zeyuan Allen-Zhu, Yuanzhi Li, Shean Wang, Lu Wang, Weizhu Chen',
      year: '2022',
      title: 'LoRA: Low-Rank Adaptation of Large Language Models',
      venue: 'International Conference on Learning Representations (ICLR 2022)',
      url: 'https://arxiv.org/abs/2106.09685'
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
    owen1998: {
      authors: 'Art B. Owen',
      year: '1998',
      title: "Scrambling Sobol' and Niederreiter-Xing Points",
      venue: 'Journal of Complexity, 14(4), 466-489',
      url: 'https://doi.org/10.1006/jcom.1998.0487'
    },
    joe2008: {
      authors: 'Stephen Joe, Frances Y. Kuo',
      year: '2008',
      title: 'Constructing Sobol Sequences with Better Two-Dimensional Projections',
      venue: 'SIAM Journal on Scientific Computing, 30(5), 2635-2654',
      url: 'https://doi.org/10.1137/070709359'
    },
    balandat2020: {
      authors: 'Maximilian Balandat, Brian Karrer, Daniel R. Jiang, Samuel Daulton, Benjamin Letham, Andrew Gordon Wilson, Eytan Bakshy',
      year: '2020',
      title: 'BoTorch: A Framework for Efficient Monte-Carlo Bayesian Optimization',
      venue: 'Advances in Neural Information Processing Systems 33 (NeurIPS 2020)',
      url: 'https://arxiv.org/abs/1910.06403'
    },
    akiba2019: {
      authors: 'Takuya Akiba, Shotaro Sano, Toshihiko Yanase, Takeru Ohta, Masanori Koyama',
      year: '2019',
      title: 'Optuna: A Next-generation Hyperparameter Optimization Framework',
      venue: 'Proceedings of the 25th ACM SIGKDD International Conference on Knowledge Discovery & Data Mining (KDD 2019)',
      url: 'https://arxiv.org/abs/1907.10902'
    },
    li2020: {
      authors: 'Liam Li, Kevin Jamieson, Afshin Rostamizadeh, Ekaterina Gonina, Jonathan Ben-Tzur, Moritz Hardt, Benjamin Recht, Ameet Talwalkar',
      year: '2020',
      title: 'A System for Massively Parallel Hyperparameter Tuning',
      venue: 'Proceedings of Machine Learning and Systems (MLSys 2020)',
      url: 'https://arxiv.org/abs/1810.05934'
    },
    choi2019: {
      authors: 'Dami Choi, Christopher J. Shallue, Zachary Nado, Jaehoon Lee, Chris J. Maddison, George E. Dahl',
      year: '2019',
      title: 'On Empirical Comparisons of Optimizers for Deep Learning',
      venue: 'arXiv:1910.05446',
      url: 'https://arxiv.org/abs/1910.05446'
    },
    jordan2024muon: {
      authors: 'Keller Jordan',
      year: '2024',
      title: 'Muon: An optimizer for hidden layers in neural networks',
      venue: 'Technical blog post (https://kellerjordan.github.io/posts/muon/)',
      url: 'https://github.com/KellerJordan/Muon'
    },
    liu2025muon: {
      authors: 'Jingyuan Liu, Jianlin Su, Xingcheng Yao, Zhejun Jiang, Guokun Lai, Yulun Du, Yidao Qin, Weixin Xu, Enzhe Lu, Junjie Yan, Yanru Chen, Huabin Zheng, et al.',
      year: '2025',
      title: 'Muon is Scalable for LLM Training',
      venue: 'arXiv:2502.16982',
      url: 'https://arxiv.org/abs/2502.16982'
    },
    gupta2018: {
      authors: 'Vineet Gupta, Tomer Koren, Yoram Singer',
      year: '2018',
      title: 'Shampoo: Preconditioned Stochastic Tensor Optimization',
      venue: 'International Conference on Machine Learning (ICML 2018)',
      url: 'https://arxiv.org/abs/1802.09568'
    },
    vyas2024: {
      authors: 'Nikhil Vyas, Depen Morwani, Rosie Zhao, Mujin Kwun, Itai Shapira, David Brandfonbrener, Lucas Janson, Sham Kakade',
      year: '2024',
      title: 'SOAP: Improving and Stabilizing Shampoo using Adam',
      venue: 'arXiv:2409.11321 (ICLR 2025)',
      url: 'https://arxiv.org/abs/2409.11321'
    },
    defazio2023: {
      authors: 'Aaron Defazio, Ashok Cutkosky, Harsh Mehta, Konstantin Mishchenko',
      year: '2023',
      title: 'When, Why and How Much? Adaptive Learning Rate Scheduling by Refinement',
      venue: 'arXiv:2310.07831',
      url: 'https://arxiv.org/abs/2310.07831'
    },
    defazio2024: {
      authors: 'Aaron Defazio, Xingyu Alice Yang, Harsh Mehta, Konstantin Mishchenko, Ahmed Khaled, Ashok Cutkosky',
      year: '2024',
      title: 'The Road Less Scheduled',
      venue: 'arXiv:2405.15682 (NeurIPS 2024)',
      url: 'https://arxiv.org/abs/2405.15682'
    },
    yang2022: {
      authors: 'Greg Yang, Edward J. Hu, Igor Babuschkin, Szymon Sidor, Xiaodong Liu, David Farhi, Nick Ryder, Jakub Pachocki, Weizhu Chen, Jianfeng Gao',
      year: '2022',
      title: 'Tensor Programs V: Tuning Large Neural Networks via Zero-Shot Hyperparameter Transfer',
      venue: 'arXiv:2203.03466',
      url: 'https://arxiv.org/abs/2203.03466'
    },
    bouthillier2021: {
      authors: 'Xavier Bouthillier, Pierre Delaunay, Mirko Bronzi, Assya Trofimov, Brennan Nichyporuk, Justin Szeto, Nazanin Mohammadi Sepahvand, Edward Raff, Kanika Madan, Voleti Vikram, Samira Ebrahimi Kahou, Vincent Michalski, Tal Arbel, Chris Pal, Gael Varoquaux, Pascal Vincent',
      year: '2021',
      title: 'Accounting for Variance in Machine Learning Benchmarks',
      venue: 'Proceedings of Machine Learning and Systems (MLSys 2021)',
      url: 'https://arxiv.org/abs/2103.03098'
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
    zhang2019rmsnorm: {
      authors: 'Biao Zhang, Rico Sennrich',
      year: '2019',
      title: 'Root Mean Square Layer Normalization',
      venue: 'Advances in Neural Information Processing Systems (NeurIPS 2019)',
      url: 'https://arxiv.org/abs/1910.07467'
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
    },
    ansel2024: {
      authors: 'Jason Ansel, Edward Yang, Horace He, Natalia Gimelshein, Animesh Jain, Michael Voznesensky, Bin Bao, et al.',
      year: '2024',
      title: 'PyTorch 2: Faster Machine Learning Through Dynamic Python Bytecode Transformation and Graph Compilation',
      venue: 'Proceedings of the 29th ACM International Conference on Architectural Support for Programming Languages and Operating Systems (ASPLOS 2024), Vol. 2, 929-947',
      url: 'https://doi.org/10.1145/3620665.3640366'
    },
    zhao2023: {
      authors: 'Yanli Zhao, Andrew Gu, Rohan Varma, Liang Luo, Chien-Chin Huang, Min Xu, Less Wright, Hamid Shojanazeri, Myle Ott, Sam Shleifer, Alban Desmaison, Can Balioglu, et al.',
      year: '2023',
      title: 'PyTorch FSDP: Experiences on Scaling Fully Sharded Data Parallel',
      venue: 'arXiv:2304.11277',
      url: 'https://arxiv.org/abs/2304.11277'
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
