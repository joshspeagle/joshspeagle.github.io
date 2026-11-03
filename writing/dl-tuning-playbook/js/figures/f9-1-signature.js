/*
 * f9-1-signature.js: figure F9.1, the signature (fig-signature), on page 9 #diagnosis, and its recap
 * TP.recaps['F9.1:sweep'] (plan §6.24, R8 on page 10 #round), whose header carries no count.
 *
 * Work order: notes/revamp/implementation-plan.md §6.19 (WO-F9.1), with §6.0. Entry:
 * notes/revamp/figure-plan.md F9.1 and review/synthesis.md R5. Design: notes/revamp/design-system.md
 * §3.4, §3.5, §4, §5, §6, §8 and §9. A fixed-frame figure with one handle, a pin and three presets.
 *
 * The model is Toy D (site/js/lib/toyD.js) with early instability on, each constant rate run for
 * CAL.steps steps. Every rate is the printed rate, TP.toyD.LR_SCALE (one half) times the model rate
 * (toyD.js, "Learning-rate scale"): the 13 grid rates run from 0.0005 to 0.5. CAL.tables.sweep holds each rate's best loss over training (minLoss), its
 * divergence step and its early peak, from tests/calibration/fig-signature.calibrate.js. The
 * selected rate's curve comes from TP.toyD.trace({schedule: rate, every: 1}), cached per rate; the
 * default rate's curve comes from CAL.tables.default, so the first render computes no run. The
 * curve's expected loss over its starting loss is kept at the calibration's display steps (every
 * step to 200, every 10 steps to 2,000, then every 100 steps, and the last step), which are finer
 * than a pixel on the log step axis and hold every multiple of 100. The drawn values carry the
 * observation noise: the value at step t is multiplied by exp(sigma z_t), where z_t is the t-th
 * draw of TP.prng.create(CAL.noise.seed).normal(), the same sequence for every rate, so the two
 * evaluation schedules show the same value at the steps they share. The readout, the quantities
 * and the table read the expected loss beneath the noise.
 *
 * Panels.
 *   (a) best loss over training against learning rate, log-log over CAL.domains.a: each feasible
 *       grid trial a filled model-blue marker, each diverged one a cross on the top edge, "k of 13
 *       diverged" in the header (DS §4.5), the best trial ringed, the bracket "unstable base
 *       learning rate" (phone header form "unstable rate (bracket)") over the best rate and the next grid rate on the x
 *       axis, and the selected rate as a reader line named on the axis with its handle. The panel
 *       reads the trials by pointing (C.pointHover), and a press on a trial selects its rate.
 *   (b) loss relative to its starting value against step, log-log: the every-step curve in model
 *       blue labelled "every step", the evaluations every 100 steps as model-blue markers (thinned
 *       to 24 px) joined by a 2-px trail-tone line labelled "every 100 steps" (in the phone layout
 *       its header form, beside the note "lr" and the rate), the pinned curve dashed and labelled by its rate, the callout
 *       "spike" at the peak of an early spike that recovers (phone header form "spike at step N"), and a cross on the top edge at the divergence step of a run
 *       that diverges. Step 0 stands at the left edge, beyond an axis break (exception 1).
 *
 * The parameter: rate (the 15 rates of CAL.rates, log, cut, no ghost), a handle on (a)'s x axis.
 * The pin is TP.fig's (contract pin: true), docked. The presets "2 times the best rate" (2x),
 * "5 times the best rate" (5x) and "10 times the best rate" (10x) and Reset sit in more.
 *
 * Work-order exceptions:
 *   1. (b)'s x domain is CAL.domains.b.x, [0.5, 20,000], with step 0 drawn at 0.5 beyond an axis
 *      break between 0.5 and step 1, and its tick named "0". Every schedule evaluates at step 0, and without that
 *      evaluation the line joining the evaluations every 100 steps lies on the every-step curve
 *      from step 100 on, where no label can name it apart from the curve (DS §5.2). The calibration
 *      writes the domain.
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};

  /* BEGIN GENERATED table-cal */
  // From tests/calibration/out/fig-signature.json by npm run generate (tests/lib/write-generated.js).
  var CAL = {
    "defaults": {"rate": 0.028117066259517452},
    "presets": {
      "2x": {"rate": 0.056234132519034905},
      "5x": {"rate": 0.14058533129758727},
      "10x": {"rate": 0.28117066259517454}
    },
    "states": {},
    "seed": null,
    "rates": [0.0005, 0.0008891397050194614, 0.0015811388300841897, 0.0028117066259517455, 0.005, 0.008891397050194615, 0.015811388300841896, 0.028117066259517452, 0.05, 0.056234132519034905, 0.08891397050194613, 0.14058533129758727, 0.15811388300841897, 0.28117066259517454, 0.5],
    "lrScale": 0.5,
    "steps": 20000,
    "evalEvery": 100,
    "noise": {
      "seed": 1,
      "sigma": 0.05,
      "draws": "z_t is the t-th value of TP.prng.create(1).normal(), t = 0..20000, the same for every rate"
    },
    "domains": {
      "a": {"x": [0.0005, 0.5], "y": [0.01, 0.5], "extent": [0.019274622768596948, 0.40538853867486335]},
      "b": {
        "x": [0.5, 20000],
        "y": [0.01, 10],
        "extent": [0.017132691733865998, 9.770869778237113],
        "divergedMax": 608.9159447565725,
        "stepZeroAt": 0.5
      }
    },
    "tables": {
      "sweep": [
        {
          "lr": 0.0005,
          "minLoss": 0.405389,
          "minStep": 20000,
          "divergedAt": null,
          "peakEarly": 1,
          "peakEarlyStep": 0
        },
        {
          "lr": 0.0008891397050194614,
          "minLoss": 0.335669,
          "minStep": 20000,
          "divergedAt": null,
          "peakEarly": 1,
          "peakEarlyStep": 0
        },
        {
          "lr": 0.0015811388300841897,
          "minLoss": 0.267252,
          "minStep": 20000,
          "divergedAt": null,
          "peakEarly": 1,
          "peakEarlyStep": 0
        },
        {
          "lr": 0.0028117066259517455,
          "minLoss": 0.202232,
          "minStep": 20000,
          "divergedAt": null,
          "peakEarly": 1,
          "peakEarlyStep": 0
        },
        {
          "lr": 0.005,
          "minLoss": 0.141744,
          "minStep": 20000,
          "divergedAt": null,
          "peakEarly": 1,
          "peakEarlyStep": 0
        },
        {
          "lr": 0.008891397050194615,
          "minLoss": 0.0879811,
          "minStep": 20000,
          "divergedAt": null,
          "peakEarly": 1,
          "peakEarlyStep": 0
        },
        {
          "lr": 0.015811388300841896,
          "minLoss": 0.0473332,
          "minStep": 20000,
          "divergedAt": null,
          "peakEarly": 1,
          "peakEarlyStep": 0
        },
        {
          "lr": 0.028117066259517452,
          "minLoss": 0.0192746,
          "minStep": 20000,
          "divergedAt": null,
          "peakEarly": 9.565,
          "peakEarlyStep": 14
        },
        {
          "lr": 0.05,
          "minLoss": null,
          "minStep": null,
          "divergedAt": 5,
          "peakEarly": 112.006,
          "peakEarlyStep": 5
        },
        {
          "lr": 0.056234132519034905,
          "minLoss": null,
          "minStep": null,
          "divergedAt": 5,
          "peakEarly": 286.362,
          "peakEarlyStep": 5
        },
        {
          "lr": 0.08891397050194613,
          "minLoss": null,
          "minStep": null,
          "divergedAt": 4,
          "peakEarly": 601.689,
          "peakEarlyStep": 4
        },
        {
          "lr": 0.14058533129758727,
          "minLoss": null,
          "minStep": null,
          "divergedAt": 3,
          "peakEarly": 231.736,
          "peakEarlyStep": 3
        },
        {
          "lr": 0.15811388300841897,
          "minLoss": null,
          "minStep": null,
          "divergedAt": 3,
          "peakEarly": 316.404,
          "peakEarlyStep": 3
        },
        {
          "lr": 0.28117066259517454,
          "minLoss": null,
          "minStep": null,
          "divergedAt": 3,
          "peakEarly": 613.36,
          "peakEarlyStep": 3
        },
        {
          "lr": 0.5,
          "minLoss": null,
          "minStep": null,
          "divergedAt": 3,
          "peakEarly": 469.768,
          "peakEarlyStep": 3
        }
      ],
      "default": {
        "lr": 0.028117066259517452,
        "t": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 210, 220, 230, 240, 250, 260, 270, 280, 290, 300, 310, 320, 330, 340, 350, 360, 370, 380, 390, 400, 410, 420, 430, 440, 450, 460, 470, 480, 490, 500, 510, 520, 530, 540, 550, 560, 570, 580, 590, 600, 610, 620, 630, 640, 650, 660, 670, 680, 690, 700, 710, 720, 730, 740, 750, 760, 770, 780, 790, 800, 810, 820, 830, 840, 850, 860, 870, 880, 890, 900, 910, 920, 930, 940, 950, 960, 970, 980, 990, 1000, 1010, 1020, 1030, 1040, 1050, 1060, 1070, 1080, 1090, 1100, 1110, 1120, 1130, 1140, 1150, 1160, 1170, 1180, 1190, 1200, 1210, 1220, 1230, 1240, 1250, 1260, 1270, 1280, 1290, 1300, 1310, 1320, 1330, 1340, 1350, 1360, 1370, 1380, 1390, 1400, 1410, 1420, 1430, 1440, 1450, 1460, 1470, 1480, 1490, 1500, 1510, 1520, 1530, 1540, 1550, 1560, 1570, 1580, 1590, 1600, 1610, 1620, 1630, 1640, 1650, 1660, 1670, 1680, 1690, 1700, 1710, 1720, 1730, 1740, 1750, 1760, 1770, 1780, 1790, 1800, 1810, 1820, 1830, 1840, 1850, 1860, 1870, 1880, 1890, 1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500, 3600, 3700, 3800, 3900, 4000, 4100, 4200, 4300, 4400, 4500, 4600, 4700, 4800, 4900, 5000, 5100, 5200, 5300, 5400, 5500, 5600, 5700, 5800, 5900, 6000, 6100, 6200, 6300, 6400, 6500, 6600, 6700, 6800, 6900, 7000, 7100, 7200, 7300, 7400, 7500, 7600, 7700, 7800, 7900, 8000, 8100, 8200, 8300, 8400, 8500, 8600, 8700, 8800, 8900, 9000, 9100, 9200, 9300, 9400, 9500, 9600, 9700, 9800, 9900, 10000, 10100, 10200, 10300, 10400, 10500, 10600, 10700, 10800, 10900, 11000, 11100, 11200, 11300, 11400, 11500, 11600, 11700, 11800, 11900, 12000, 12100, 12200, 12300, 12400, 12500, 12600, 12700, 12800, 12900, 13000, 13100, 13200, 13300, 13400, 13500, 13600, 13700, 13800, 13900, 14000, 14100, 14200, 14300, 14400, 14500, 14600, 14700, 14800, 14900, 15000, 15100, 15200, 15300, 15400, 15500, 15600, 15700, 15800, 15900, 16000, 16100, 16200, 16300, 16400, 16500, 16600, 16700, 16800, 16900, 17000, 17100, 17200, 17300, 17400, 17500, 17600, 17700, 17800, 17900, 18000, 18100, 18200, 18300, 18400, 18500, 18600, 18700, 18800, 18900, 19000, 19100, 19200, 19300, 19400, 19500, 19600, 19700, 19800, 19900, 20000],
        "lossRelative": [1, 0.984945, 0.985494, 1.01899, 1.1171, 1.32919, 1.71949, 2.35342, 3.27238, 4.46348, 5.8379, 7.23224, 8.43945, 9.26161, 9.565, 9.31558, 8.58198, 7.5081, 6.26894, 5.02727, 3.90428, 2.96867, 2.24141, 1.70916, 1.33979, 1.09517, 0.939601, 0.843926, 0.78649, 0.752384, 0.731955, 0.719274, 0.710863, 0.704757, 0.699889, 0.695695, 0.691882, 0.688302, 0.684882, 0.681582, 0.678381, 0.675269, 0.672238, 0.669281, 0.666395, 0.663575, 0.660819, 0.658123, 0.655484, 0.652901, 0.650371, 0.647891, 0.645459, 0.643074, 0.640734, 0.638437, 0.636182, 0.633967, 0.631791, 0.629652, 0.62755, 0.625482, 0.623449, 0.621448, 0.619479, 0.617542, 0.615634, 0.613755, 0.611905, 0.610082, 0.608286, 0.606516, 0.604771, 0.603051, 0.601354, 0.599681, 0.598031, 0.596403, 0.594797, 0.593211, 0.591646, 0.590102, 0.588576, 0.58707, 0.585583, 0.584113, 0.582662, 0.581227, 0.57981, 0.578409, 0.577025, 0.575656, 0.574303, 0.572965, 0.571641, 0.570333, 0.569038, 0.567758, 0.566491, 0.565237, 0.563996, 0.562768, 0.561553, 0.56035, 0.559159, 0.55798, 0.556812, 0.555656, 0.55451, 0.553376, 0.552252, 0.551139, 0.550036, 0.548944, 0.547861, 0.546788, 0.545724, 0.54467, 0.543625, 0.542589, 0.541563, 0.540544, 0.539535, 0.538534, 0.537541, 0.536556, 0.53558, 0.534611, 0.53365, 0.532697, 0.531751, 0.530813, 0.529882, 0.528958, 0.528041, 0.527131, 0.526228, 0.525332, 0.524442, 0.523559, 0.522683, 0.521812, 0.520948, 0.52009, 0.519239, 0.518393, 0.517553, 0.516719, 0.51589, 0.515068, 0.514251, 0.513439, 0.512633, 0.511832, 0.511036, 0.510246, 0.509461, 0.508681, 0.507906, 0.507136, 0.50637, 0.50561, 0.504854, 0.504103, 0.503357, 0.502615, 0.501878, 0.501145, 0.500417, 0.499693, 0.498973, 0.498258, 0.497547, 0.49684, 0.496137, 0.495438, 0.494743, 0.494052, 0.493365, 0.492682, 0.492003, 0.491328, 0.490656, 0.489988, 0.489324, 0.488664, 0.488007, 0.487353, 0.486703, 0.486057, 0.485414, 0.484774, 0.484138, 0.483505, 0.482876, 0.48225, 0.481626, 0.481007, 0.48039, 0.479776, 0.479166, 0.473226, 0.467566, 0.462161, 0.456989, 0.452031, 0.44727, 0.442692, 0.438282, 0.434028, 0.429921, 0.42595, 0.422105, 0.41838, 0.414767, 0.411259, 0.40785, 0.404534, 0.401307, 0.398163, 0.395098, 0.392109, 0.389192, 0.386342, 0.383558, 0.380836, 0.378174, 0.375568, 0.373017, 0.370519, 0.368071, 0.365671, 0.363318, 0.36101, 0.358745, 0.356522, 0.354339, 0.352195, 0.350089, 0.34802, 0.345986, 0.343986, 0.342019, 0.340085, 0.338182, 0.336309, 0.334466, 0.332652, 0.330865, 0.329106, 0.327373, 0.325665, 0.323983, 0.322325, 0.320691, 0.319079, 0.317491, 0.315924, 0.314379, 0.312854, 0.31135, 0.309866, 0.308402, 0.306956, 0.305529, 0.30412, 0.302729, 0.301355, 0.299998, 0.298657, 0.297333, 0.296024, 0.294731, 0.293453, 0.29219, 0.290941, 0.289706, 0.288486, 0.287279, 0.286085, 0.284904, 0.283736, 0.282581, 0.281438, 0.280306, 0.279187, 0.278079, 0.276983, 0.275898, 0.274823, 0.273759, 0.272706, 0.271663, 0.270631, 0.269608, 0.268595, 0.267591, 0.266597, 0.265612, 0.264637, 0.26367, 0.262712, 0.261762, 0.260821, 0.259889, 0.258964, 0.258048, 0.257139, 0.256238, 0.255345, 0.25446, 0.253582, 0.252711, 0.251847, 0.25099, 0.250141, 0.249298, 0.248462, 0.247633, 0.24681, 0.245993, 0.245183, 0.24438, 0.243582, 0.24279, 0.242005, 0.241225, 0.240452, 0.239683, 0.238921, 0.238164, 0.237413, 0.236667, 0.235927, 0.235191, 0.234461, 0.233736, 0.233017, 0.232302, 0.231592, 0.230887, 0.230187, 0.229491, 0.228801, 0.228115, 0.227433, 0.226756, 0.226084, 0.225416, 0.224752, 0.224093, 0.223438, 0.222787, 0.22214, 0.221498, 0.220859, 0.220224, 0.219594, 0.218967, 0.218344, 0.217726, 0.21711, 0.216499, 0.215891, 0.215287, 0.214687, 0.21409, 0.213497, 0.212907, 0.212321, 0.211738, 0.211159, 0.210583, 0.21001, 0.209441, 0.208874, 0.208312, 0.207752, 0.207195, 0.206642, 0.206091, 0.200752, 0.195691, 0.190884, 0.186308, 0.181946, 0.177779, 0.173793, 0.169974, 0.166311, 0.162792, 0.159407, 0.156149, 0.153008, 0.149977, 0.14705, 0.144221, 0.141483, 0.138832, 0.136264, 0.133773, 0.131356, 0.129009, 0.126729, 0.124513, 0.122357, 0.120259, 0.118217, 0.116228, 0.11429, 0.1124, 0.110558, 0.108761, 0.107007, 0.105295, 0.103623, 0.10199, 0.100395, 0.0988357, 0.0973117, 0.0958216, 0.0943642, 0.0929386, 0.0915438, 0.0901788, 0.0888428, 0.0875348, 0.086254, 0.0849996, 0.0837709, 0.0825672, 0.0813877, 0.0802317, 0.0790987, 0.077988, 0.0768989, 0.075831, 0.0747837, 0.0737563, 0.0727485, 0.0717596, 0.0707893, 0.069837, 0.0689023, 0.0679847, 0.0670839, 0.0661993, 0.0653307, 0.0644777, 0.0636398, 0.0628166, 0.062008, 0.0612134, 0.0604326, 0.0596653, 0.0589111, 0.0581697, 0.0574409, 0.0567244, 0.0560198, 0.055327, 0.0546457, 0.0539755, 0.0533163, 0.0526679, 0.0520299, 0.0514022, 0.0507846, 0.0501767, 0.0495785, 0.0489898, 0.0484102, 0.0478397, 0.0472781, 0.0467251, 0.0461806, 0.0456444, 0.0451163, 0.0445963, 0.0440841, 0.0435796, 0.0430826, 0.0425929, 0.0421105, 0.0416352, 0.0411669, 0.0407054, 0.0402506, 0.0398023, 0.0393605, 0.0389251, 0.0384958, 0.0380727, 0.0376555, 0.0372442, 0.0368387, 0.0364389, 0.0360446, 0.0356558, 0.0352724, 0.0348942, 0.0345213, 0.0341534, 0.0337906, 0.0334326, 0.0330795, 0.0327312, 0.0323875, 0.0320485, 0.0317139, 0.0313839, 0.0310581, 0.0307367, 0.0304196, 0.0301066, 0.0297976, 0.0294928, 0.0291919, 0.0288948, 0.0286017, 0.0283123, 0.0280266, 0.0277447, 0.0274663, 0.0271915, 0.0269201, 0.0266522, 0.0263878, 0.0261266, 0.0258688, 0.0256142, 0.0253628, 0.0251145, 0.0248693, 0.0246272, 0.0243881, 0.024152, 0.0239188, 0.0236885, 0.023461, 0.0232363, 0.0230144, 0.0227952, 0.0225787, 0.0223649, 0.0221536, 0.0219449, 0.0217388, 0.0215352, 0.021334, 0.0211352, 0.0209389, 0.0207449, 0.0205533, 0.020364, 0.0201769, 0.0199921, 0.0198095, 0.019629, 0.0194508, 0.0192746],
        "note": "expected loss over the starting loss, noise-free; every step to 200, every 10 steps to 2,000, then every 100 steps"
      }
    },
    "quantities": {
      "model": {
        "noise-seed": 1,
        "steps": 20000,
        "noise-sigma": 0.05,
        "eval-every": 100,
        "refined-unstable-lr": 0.032,
        "grid-size": 13,
        "diverge-at": 100
      },
      "default": {
        "best-lr": 0.028117066259517452,
        "best-loss": 0.019274622768596948,
        "diverged-count": 5,
        "next-lr": 0.05,
        "next-diverged-at": 5,
        "peak": 9.56500336560037,
        "peak-step": 14,
        "loss-20": 3.9042774881141726,
        "loss-100": 0.5639962494334111
      },
      "2x": {"lr": 0.056234132519034905, "diverged-at": 5},
      "5x": {"lr": 0.14058533129758727, "diverged-at": 3},
      "10x": {"lr": 0.28117066259517454, "diverged-at": 3}
    }
  };
  /* END GENERATED table-cal */

  var ID = 'fig-signature';
  var SIGMA = CAL.noise.sigma, EVERY = CAL.evalEvery, STEPS = CAL.steps;

  var fmt = {
    lr: function (v) { return TP.fmt.byName('sig3')(v); },
    ratio: function (v) { return TP.fmt.byName('sig3')(v); },
    loss: function (v) { return TP.fmt.byName('sig3')(v); },
    int: function (v) { return TP.fmt.byName('int')(v); },
    step: function (v) { return v < 1 ? '0' : TP.fmt.byName('int')(v); },
    tick: function (v) { return TP.fmt.sig(v, 2); }
  };

  /* ============================== the model ============================== */

  var near = function (a, b) { return Math.abs(Math.log(a / b)) < 1e-6; };
  var GRID = (function () {
    /* the 13 grid rates: CAL.lrScale times the quarter decades over the domain's model rates */
    var S = CAL.lrScale;
    var q = TP.toyD ? TP.toyD.quarterDecades(CAL.domains.a.x[0] / S, CAL.domains.a.x[1] / S).map(function (g) { return S * g; }) : [];
    return CAL.tables.sweep.filter(function (r) { return q.some(function (g) { return near(g, r.lr); }); });
  })();
  /* the best trial by best loss over training, among the feasible grid trials, and the next grid rate */
  var BEST = (function () {
    var b = -1;
    GRID.forEach(function (r, j) { if (r.divergedAt == null && (b < 0 || r.minLoss < GRID[b].minLoss)) b = j; });
    return b;
  })();
  var DIVERGED = GRID.filter(function (r) { return r.divergedAt != null; }).length;

  function keepStep(t, last) { return t <= 200 || (t <= 2000 && t % 10 === 0) || t % 100 === 0 || t === last; }

  var zCache = null;
  /** z_t, t = 0 .. STEPS: the observation noise's draws, the same for every rate. */
  function noise() {
    if (!zCache) {
      var g = TP.prng.create(CAL.noise.seed), z = new Float64Array(STEPS + 1);
      for (var t = 0; t <= STEPS; t++) z[t] = g.normal();
      zCache = z;
    }
    return zCache;
  }

  var curves = {};
  function rateKey(v) { return (+v).toPrecision(6); }
  function sweepRow(rate) {
    for (var i = 0; i < CAL.tables.sweep.length; i++) if (near(CAL.tables.sweep[i].lr, rate)) return CAL.tables.sweep[i];
    return null;
  }

  /**
   * The run at a constant rate: {lr, t, rel (expected loss over the starting loss at the display
   * steps), divergedAt, peak, peakStep (over steps 0 to 100), minRel, minStep, loss20, loss100,
   * spikeEnd (the first step after the peak with the loss back at or below its start, or null),
   * caught (the multiples of 100 at which the loss stands above its start)}.
   */
  function curveOf(rate) {
    var k = rateKey(rate);
    if (curves[k]) return curves[k];
    var c;
    var def = CAL.tables['default'];
    if (near(rate, def.lr)) c = fromTable(def, sweepRow(rate));
    else c = fromTrace(rate);
    curves[k] = c;
    return c;
  }
  function finish(c) {
    /* the spike: the loss above its start after step 0, before it first falls back */
    c.spikeEnd = null;
    c.caught = [];
    if (c.divergedAt == null && c.peak > 1) {
      for (var i = 0; i < c.t.length; i++) {
        if (c.t[i] > c.peakStep && c.rel[i] <= 1) { c.spikeEnd = c.t[i]; break; }
      }
    }
    for (var j = 0; j < c.t.length; j++) if (c.t[j] > 0 && c.t[j] % EVERY === 0 && c.rel[j] > 1) c.caught.push(c.t[j]);
    return c;
  }
  function relAt(c, t) {
    for (var i = 0; i < c.t.length; i++) if (c.t[i] === t) return c.rel[i];
    return null;
  }
  /* The default rate's run from CAL.tables.default, with its scalars from CAL.quantities.default,
     which the calibration wrote unrounded (the tables round to six significant figures, and the
     peak, 9.565003, would print 9.56 from them where the ledger prints 9.57). */
  function fromTable(def, row) {
    var Q = (CAL.quantities && CAL.quantities['default']) || {};
    var c = {
      lr: def.lr, t: def.t.slice(), rel: def.lossRelative.slice(), divergedAt: row.divergedAt,
      peak: Q.peak != null ? Q.peak : row.peakEarly, peakStep: Q['peak-step'] != null ? Q['peak-step'] : row.peakEarlyStep,
      minRel: Q['best-loss'] != null ? Q['best-loss'] : row.minLoss, minStep: row.minStep, source: 'table'
    };
    c.loss20 = Q['loss-20'] != null ? Q['loss-20'] : relAt(c, 20);
    c.loss100 = Q['loss-100'] != null ? Q['loss-100'] : relAt(c, 100);
    return finish(c);
  }
  function fromTrace(rate) {
    var r = TP.toyD.trace({ schedule: rate, steps: STEPS, every: 1 });
    var L = r.rows.loss, T = r.rows.t, L0 = r.L0, last = T[T.length - 1];
    var t = [], rel = [], pe = 0, ps = 0;
    for (var i = 0; i < T.length; i++) {
      var v = L[i] / L0;
      if (T[i] <= 100 && v > pe) { pe = v; ps = T[i]; }
      if (keepStep(T[i], last)) { t.push(T[i]); rel.push(v); }
    }
    var c = {
      lr: rate, t: t, rel: rel, divergedAt: r.divergedAt, peak: pe, peakStep: ps,
      minRel: r.diverged ? null : r.minLoss / L0, minStep: r.diverged ? null : r.minStep,
      loss20: T.length > 20 ? L[20] / L0 : null, loss100: T.length > 100 ? L[100] / L0 : null, source: 'trace'
    };
    return finish(c);
  }

  /** The derived state for the values. Every array of rows carries a key (DS §9). */
  function apply(values) {
    var c = curveOf(values.rate), z = noise();
    var rows = c.t.map(function (t, i) { return { key: 's' + t, t: t, y: c.rel[i] * Math.exp(SIGMA * z[t]), rel: c.rel[i] }; });
    var evals = rows.filter(function (r) { return r.t % EVERY === 0 && (c.divergedAt == null || r.t < c.divergedAt); })
      .map(function (r) { return { key: 'e' + r.t, t: r.t, y: r.y, rel: r.rel }; });
    return { rate: values.rate, curve: c, rows: rows, evals: evals };
  }

  /* ============================== drawing ============================== */

  function C() { return TP.chart; }
  var X_B = CAL.domains.b.x.slice();                           /* exception 1: [0.5, 20,000] */
  var X0 = X_B[0];
  function xStep(t) { return t < 1 ? X0 : t; }
  var Y_TOP_B = CAL.domains.b.y[1];

  /* panel (a)'s options, shared with the recap */
  function optsA(extra) {
    var dA = CAL.domains.a, o = {
      letter: '(a)', describe: 'best loss over training against learning rate',
      /* the header's note from the start, so that the header's height, and the handle's place
         under it, do not change at the first draw */
      note: DIVERGED + ' of ' + GRID.length + ' diverged',
      xLog: 10, yLog: 10, xDomain: dA.x.slice(), yDomain: dA.y.slice(),
      xLabel: 'learning rate',
      yLabel: function (p) { return p.phone ? 'best loss' : 'best loss over training'; },
      xTicks: [0.001, 0.01, 0.1], xFormat: fmt.tick,
      yTicks: function (dom, px) { return px < 130 ? [0.01, 0.1] : [0.01, 0.02, 0.05, 0.1, 0.2, 0.5]; }, yFormat: fmt.tick,
      grid: 'y',
      aspect: function (w, phone) { return phone ? 156 / Math.max(w, 1) : 0.66; },
      maxHeight: function (w, phone) { return phone ? 156 : 330; },
      margin: function (w, phone) { return phone ? { t: 8, r: 14, b: 40, l: 50 } : { t: 12, r: 18, b: 46, l: 60 }; }
    };
    Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
    return o;
  }

  /**
   * Panel (a): the sweep. opts.reader draws the selected rate's line and handle.
   * Returns nothing; it is called inside p.update.
   */
  function drawSweep(p, opts) {
    var c = C();
    var feas = GRID.filter(function (r) { return r.divergedAt == null; });
    var inf = GRID.filter(function (r) { return r.divergedAt != null; });
    var key = function (r) { return 'r' + rateKey(r.lr); };
    var xOf = function (r) { return r.lr; };
    c.markers(p, feas, xOf, function (r) { return r.minLoss; }, { role: 'model', series: 'trials', key: key });
    c.cross(p, inf, xOf, function () { return null; }, { role: 'model', series: 'trials', key: key, edge: 'top' });
    var b = GRID[BEST], n = GRID[BEST + 1];
    if (b) c.ring(p, b.lr, b.minLoss, { role: 'model', series: 'trials' });
    if (b && n) {
      c.annotation(p, {
        kind: 'bracket', id: 'unstable', captionNames: true, keySentence: true,
        /* in the phone layout the ring stands within 1.5 times the name's distance of the bracket,
           so the name goes to the panel header when no position in the frame admits it (DS §5.6),
           where "(bracket)" ties it to its mark (page 9's reader finding 10) */
        text: p.phone ? 'unstable rate (bracket)' : ['unstable base', 'learning rate'],
        phone: p.phone ? { header: true } : { text: 'unstable rate' },
        /* the bracket stands just above the axis with its ticks turned down to the axis, so that
           its name can stand above it to the right of the reader's line and of the ring, where no
           tick crosses it */
        anchor: { x0: b.lr, x1: n.lr, y: CAL.domains.a.y[0] }, side: 'above', gap: 4
      });
    }
    /* p.setNote clears the panel's measured origin (chart.js), and a render that then measures
       it during a capture's scroll placed the handle 24 px high, so the note is set only when its
       text differs (the panels take it at creation) */
    /* the recap's header carries no count (PW §10 item 17) */
    if (!(opts && opts.recap)) setNoteOnce(p, DIVERGED + ' of ' + GRID.length + ' diverged');
    if (opts && opts.reader) opts.reader(p);
    c.place(p, [], opts && opts.ctx);
  }

  function setNoteOnce(p, text) {
    var n = p.head && p.head.querySelector('.panel-note');
    if (!n || n.textContent !== text) p.setNote(text);
  }

  var fig = null, pa = null, pb = null, cur = null, curCtx = { hold: false };

  function build(f) {
    pa = C().panel(f.panels, optsA({ key: 'a' }));
    pb = C().panel(f.panels, {
      key: 'b', letter: '(b)', describe: 'loss relative to its starting value against step',
      note: 'learning rate ' + fmt.lr(CAL.defaults.rate),
      xLog: 10, yLog: 10, xDomain: X_B.slice(), yDomain: CAL.domains.b.y.slice(),
      xLabel: 'step',
      yLabel: function (p) { return p.phone ? 'loss / start' : 'loss relative to start'; },
      xTicks: function (dom, px) { return px < 200 ? [X0, 1, 100, 10000] : [X0, 1, 10, 100, 1000, 10000]; },
      xFormat: fmt.step,
      yTicks: function (dom, px) { return [0.01, 0.1, 1, 10]; }, yFormat: fmt.tick,
      grid: 'y',
      aspect: function (w, phone) { return phone ? 156 / Math.max(w, 1) : 0.66; },
      maxHeight: function (w, phone) { return phone ? 156 : 330; },
      margin: function (w, phone) { return phone ? { t: 8, r: 14, b: 40, l: 50 } : { t: 12, r: 18, b: 46, l: 60 }; }
    });
    C().pointHover(pa, {
      by: 'trial',
      points: function () {
        return GRID.map(function (r) {
          var ok = r.divergedAt == null;
          return {
            x: r.lr, y: ok ? r.minLoss : CAL.domains.a.y[1], key: 'r' + rateKey(r.lr), lr: r.lr,
            head: 'Learning rate ' + fmt.lr(r.lr),
            rows: ok
              ? [{ value: fmt.loss(r.minLoss), label: 'best loss over training', role: 'model' },
                 { value: fmt.ratio(r.peakEarly), label: 'early peak over the starting loss' }]
              : [{ value: fmt.int(r.divergedAt), label: 'step at which the run diverges', role: 'model' }]
          };
        });
      },
      startIndex: function () { return BEST; },
      select: function (i, pt) { if (pt && cur && !near(pt.lr, cur.rate)) fig.set({ rate: pt.lr }); }
    });
    pa.update(drawA);
    pb.update(drawB);
  }

  function drawA(p) {
    var s = cur;
    drawSweep(p, {
      ctx: curCtx,
      reader: function (q) {
        if (!s) return;
        C().level(q, 'x', s.rate, { role: 'reader', text: fmt.lr(s.rate), line: true, series: 'rate', key: 'rate' });
        C().handle(q, {
          id: 'rate', axis: 'x', value: s.rate, snap: CAL.rates.slice(), min: CAL.rates[0], max: CAL.rates[CAL.rates.length - 1],
          scale: 'log', label: 'Learning rate', format: fmt.lr, onLine: true,
          onChange: function (v) { fig.set({ rate: v }, { transient: true }); },
          onSettle: function (v) { fig.set({ rate: v }); }
        });
      }
    });
  }

  /** The rows of a curve as drawn: every row inside the frame, and a run that leaves by the top
      edge ends where its line meets the edge (log-log interpolation). */
  function clipTop(rows) {
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.y <= Y_TOP_B) { out.push(r); continue; }
      var q = out[out.length - 1];
      if (q) {
        var lx0 = Math.log(xStep(q.t)), lx1 = Math.log(xStep(r.t)), ly0 = Math.log(q.y), ly1 = Math.log(r.y);
        var f = (Math.log(Y_TOP_B) - ly0) / (ly1 - ly0);
        out.push({ key: 'edge', t: Math.exp(lx0 + f * (lx1 - lx0)), y: Y_TOP_B, edge: true });
      }
      break;
    }
    return out;
  }
  var xRow = function (r) { return r.edge ? r.t : xStep(r.t); };
  var yRow = function (r) { return r.y; };

  function drawB(p) {
    var s = cur, c = C(), ctx = curCtx;
    c.axisBreak(p, Math.sqrt(X0 * 1));                        /* between step 0 (at X0) and step 1 */
    if (!s) return;
    var items = [];
    /* the pin: the curve at the pinned rate, dashed and named by its rate (DS §4.8) */
    var pin = ctx.pin && ctx.pin.state;
    if (pin && pin.rows) {
      var pr = clipTop(pin.rows);
      c.line(p, pr, xRow, yRow, { role: 'model', series: 'pin', dash: 'ghost', ghost: false, key: 'pin' });
      /* chart.js keeps no line record of a dashed ghost, so the label names the rows' points. Two
         constant-rate runs that both survive part most at the end of training, so the name of a
         pinned run that survives names its stretch from step 1,000 on. */
      var named = pin.curve.divergedAt == null ? pr.filter(function (r) { return r.t >= 1000; }) : pr;
      items.push({ id: 'pin', text: 'lr ' + fmt.lr(pin.rate), role: 'model', series: 'ghost:pin',
        feature: { type: 'line', points: named.map(function (r) { return [xRow(r), yRow(r)]; }) } });
    }
    /* the evaluations every 100 steps: markers joined by the trail tone, behind the every-step curve */
    if (s.evals.length >= 2) {
      c.line(p, s.evals, xRow, yRow, { role: 'model', series: 'every-100', dash: 'trail', key: 'every-100' });
      /* in the phone layout the two series share their stretch after step 100 and no position
         admits either form in the frame, so the name goes to (b)'s header in the series' tone
         (page 9's reader finding 10) */
      items.push({ id: 'every-100', text: 'every 100 steps', phone: p.phone ? { header: true } : { text: 'every 100' },
        role: 'model', series: 'every-100', feature: { type: 'line', of: 'every-100' }, captionNames: true, keySentence: true });
    }
    var drawn = clipTop(s.rows);
    c.line(p, drawn, xRow, yRow, { role: 'model', series: 'every-step', key: 'every-step' });
    items.push({ id: 'every-step', text: 'every step', role: 'model', series: 'every-step', feature: { type: 'line', of: 'every-step' }, captionNames: true, keySentence: true });
    c.markers(p, s.evals, xRow, yRow, {
      role: 'model', series: 'every-100', thin: 24, key: function (r) { return r.key; },
      keep: function (r) { return r.t === 0 || r.t === EVERY; }
    });
    var cv = s.curve;
    if (cv.divergedAt != null) {
      c.cross(p, [{ key: 'diverged', t: cv.divergedAt }], function (r) { return r.t; }, function () { return null; },
        { role: 'model', series: 'every-step', key: 'diverged', edge: 'top' });
    } else if (cv.peak > 1 && cv.spikeEnd != null) {
      /* In the phone layout the peak stands within a label's height of the top edge and of the
         rising and falling curve, and no position within 3 h admits the callout, so its header
         form names the spike's step (DS §5.6, page 9's reader finding 10). */
      var pk = s.rows.filter(function (r) { return r.t === cv.peakStep; })[0];
      if (pk) c.annotation(p, { kind: 'callout', id: 'spike', text: p.phone ? 'spike at step ' + fmt.int(cv.peakStep) : 'spike',
        phone: p.phone ? { header: true } : null, anchor: { x: xStep(pk.t), y: pk.y, r: 4, series: 'every-step' } });
    }
    /* the phone header holds the note and two header forms on one line, so the note takes the
       pin labels' "lr" there */
    setNoteOnce(p, (p.phone ? 'lr ' : 'learning rate ') + fmt.lr(s.rate));
    c.place(p, items, ctx);
  }

  function draw(state, ctx) {
    if (!pa) build(ctx.fig);
    cur = state;
    curCtx = ctx || { hold: false };
    pa.update();
    pb.update();
    if (state && !curCtx.hold) prefetch(state.rate);
  }

  /* The run at a rate the figure has not drawn takes tens of milliseconds of Toy D at the rates
     below 0.05, so a drag frame that reached such a rate went over the 10-ms budget of DS §1. After
     the first settled draw, the runs at the other rates of the handle are computed in idle time,
     nearest rate first, one per idle period of at least 40 ms. The browser grants a period that
     long only while it renders no frames, so no run, transition or drag is delayed. curveOf
     keeps them as it keeps a run drawn, so nothing drawn changes. Without requestIdleCallback
     the runs are computed when drawn, as before. */
  var prefetchQ = null;
  function prefetch(rate) {
    if (prefetchQ || typeof window.requestIdleCallback !== 'function') return;
    var lr = Math.log(rate);
    prefetchQ = CAL.rates.slice().sort(function (a, b) { return Math.abs(Math.log(a) - lr) - Math.abs(Math.log(b) - lr); });
    function step(deadline) {
      while (prefetchQ.length && curves[rateKey(prefetchQ[0])]) prefetchQ.shift();
      if (!prefetchQ.length) return;
      if (deadline.timeRemaining() >= 40) curveOf(prefetchQ.shift());
      window.requestIdleCallback(step);
    }
    window.requestIdleCallback(step);
  }

  /* ============================== text ============================== */

  function readout(state) {
    var c = state.curve, lr = fmt.lr(state.rate);
    if (c.divergedAt != null) {
      return 'At learning rate ' + lr + ' the run diverges at step ' + fmt.int(c.divergedAt) +
        (c.divergedAt < EVERY ? ', before the first evaluation after step 0.' : '.');
    }
    if (c.peak > 1) {
      var tail = c.caught.length ? 'and the evaluations every 100 steps show it.' : 'and the evaluations every 100 steps miss the spike.';
      return 'At learning rate ' + lr + ' the run spikes to ' + fmt.ratio(c.peak) + ' times its starting loss at step ' + fmt.int(c.peakStep) +
        (c.spikeEnd != null ? ' and recovers, ' : ', ') + tail;
    }
    return 'At learning rate ' + lr + ' the loss falls without a spike, to ' + fmt.loss(c.minRel) + ' times its starting loss at step ' + fmt.int(c.minStep) + '.';
  }

  function table(state) {
    var sel = state.rate, pin = fig && fig.pinned && fig.pinned();
    var rows = CAL.tables.sweep.map(function (r) {
      var notes = [];
      var onGrid = GRID.indexOf(r) >= 0;
      if (!onGrid) notes.push('preset rate, off the grid');
      if (r === GRID[BEST]) notes.push('best trial');
      if (near(r.lr, sel)) notes.push('selected');
      if (pin && near(r.lr, pin.values.rate)) notes.push('pinned');
      return { lr: r.lr, best: r.minLoss, step: r.minStep, div: r.divergedAt, peak: r.peakEarly, peakStep: r.peakEarlyStep, note: notes.join('; ') };
    });
    var dash = function (f) { return function (v) { return v == null ? '–' : f(v); }; };
    var c = state.curve;
    return {
      columns: [
        { key: 'lr', label: 'Learning rate', format: fmt.lr },
        { key: 'best', label: 'Best loss over training', format: dash(fmt.loss) },
        { key: 'step', label: 'Step of the best loss', format: dash(fmt.int) },
        { key: 'div', label: 'Diverges at step', format: dash(fmt.int) },
        { key: 'peak', label: 'Highest loss over steps 0 to 100, relative to the start', format: dash(fmt.ratio) },
        { key: 'peakStep', label: 'Its step', format: dash(fmt.int) },
        { key: 'note', label: 'Marked' }
      ],
      rows: rows,
      caption: 'Each rate run for ' + fmt.int(STEPS) + ' steps, expected loss beneath the observation noise. At the selected rate, ' + fmt.lr(state.rate) +
        (c.divergedAt != null ? ', the run diverges at step ' + fmt.int(c.divergedAt)
          : ', the loss relative to its start is ' + fmt.ratio(c.loss20) + ' at step 20 and ' + fmt.ratio(c.loss100) + ' at step 100')
    };
  }

  function quantities(state) {
    var c = state.curve, b = GRID[BEST], n = GRID[BEST + 1];
    var q = {
      lr: state.rate, 'diverged-at': c.divergedAt,
      peak: c.divergedAt == null ? c.peak : null, 'peak-step': c.divergedAt == null ? c.peakStep : null,
      'loss-20': c.divergedAt == null ? c.loss20 : null, 'loss-100': c.divergedAt == null ? c.loss100 : null,
      'min-loss': c.minRel, 'min-step': c.minStep, 'spike-end': c.spikeEnd, caught: c.caught.length,
      'best-lr': b ? b.lr : null, 'best-loss': b ? b.minLoss : null, 'diverged-count': DIVERGED,
      'next-lr': n ? n.lr : null, 'next-diverged-at': n ? n.divergedAt : null
    };
    var m = (CAL.quantities && CAL.quantities.model) || {};
    Object.keys(m).forEach(function (name) { if (!(name in q)) q[name] = m[name]; });
    return q;
  }

  function init(element) {
    fig = TP.fig(element, {
      kind: 'fixed',
      params: {
        rate: {
          type: 'number', default: CAL.defaults.rate, domain: [CAL.rates[0], CAL.rates[CAL.rates.length - 1]],
          snap: CAL.rates.slice(), scale: 'log', change: 'cut', ghost: false,
          label: 'Learning rate', control: 'handle', handle: 'a', format: fmt.lr,
          /* the URL names the rate at three significant figures, such as rate:0.0281, which snaps
             back to the same rate of the list */
          encode: function (v) { return fmt.lr(v); }
        }
      },
      /* 2026-11 review (post08): no pin. The three presets already compare the best rate with the
         rates above it, and the pin added a dock row for a comparison the tour makes. */
      presets: {
        '2 times the best rate': { key: '2x', rate: CAL.presets['2x'].rate },
        '5 times the best rate': { key: '5x', rate: CAL.presets['5x'].rate },
        '10 times the best rate': { key: '10x', rate: CAL.presets['10x'].rate }
      },
      states: CAL.states,
      apply: apply,
      draw: draw,
      readout: readout,
      table: table,
      quantities: quantities
    });
  }

  /* ============================== the recap (§6.24, R8) ============================== */

  TP.recaps = TP.recaps || {};
  /** Panel (a) at the default: the crosses, the ring and the bracket, with no reader line. */
  TP.recaps['F9.1:sweep'] = function (el) {
    var p = C().panel(el, optsA({
      letter: '', describe: 'best loss over training against learning rate, the sweep', note: '',
      aspect: function (w, phone) { return phone ? 0.5 : 0.36; },
      /* the recap's body holds the header's note as well, within 240 px, or 180 in the phone layout */
      maxHeight: function (w, phone) { return phone ? 156 : 216; },
      /* the phone's bottom margin keeps the axis title clear of the tick labels */
      margin: function (w, phone) { return phone ? { t: 8, r: 14, b: 42, l: 50 } : { t: 10, r: 18, b: 42, l: 60 }; },
      yTicks: [0.01, 0.1]
    }));
    p.update(function (q) { drawSweep(q, { recap: true }); });
    return p;
  };

  document.addEventListener('tp:ready', function () {
    var el = document.getElementById(ID);
    if (el && TP.fig && TP.chart && TP.toyD && TP.prng) init(el);
  });
})();
