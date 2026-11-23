<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  fullBleed: {
    type: Boolean,
    default: false
  },
  scrollOffset: {
    type: Number,
    default: 0
  }
})

const rootRef = ref(null)
const tailSvgRef = ref(null)
const leftContourRef = ref(null)
const rightContourRef = ref(null)
const tailHeight = ref(2400)
const containerWidth = ref(typeof window !== 'undefined' ? window.innerWidth || 1440 : 1440)
const isMobileView = computed(() => (containerWidth.value || 1440) < 640)

// Smoothly damped scroll-driven growth progress (0..1)
const heroDraw = ref(0)
const smoothGrowth = ref(0.08)
const leftTipPoint = ref({ x: 52, y: 280 })
const rightTipPoint = ref({ x: 1388, y: 280 })
let leftContourLen = 0
let rightContourLen = 0
let targetGrowth = 0.08
let rafId = null
let heroRafId = null
let resizeObserver = null
let mutationObserver = null
let prefersReducedMotion = false

// Compensate vertical stretch of preserveAspectRatio="none" so buds/stars never distort
const budYScale = computed(() => {
  const scaleX = (containerWidth.value || 1440) / 1440
  const scaleY = (tailHeight.value || 2400) / 4000
  if (!scaleY) return 1
  return Number((scaleX / scaleY).toFixed(3))
})

function clamp01(v) {
  return Math.max(0, Math.min(1, v))
}

function easeOutCubic(t) {
  const x = clamp01(t)
  return 1 - Math.pow(1 - x, 3)
}

function easeOutBack(t) {
  const x = clamp01(t)
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

// Compute individual branch growth (0..1) based on overall smoothGrowth
function branchProgress(triggerAt, span = 0.1) {
  return easeOutCubic((smoothGrowth.value - triggerAt) / span)
}

// Compute bud bloom scale (0..1) once branch passes 55% growth
function budScale(triggerAt, span = 0.1) {
  const bp = clamp01((smoothGrowth.value - triggerAt) / span)
  if (bp <= 0.5) return 0
  return Math.max(0, easeOutBack((bp - 0.5) / 0.5))
}

// Sync exact (x, y) coordinates on the SVG cubic Bezier root curves
function syncTipPositions() {
  const t = clamp01(smoothGrowth.value)
  if (leftContourRef.value) {
    if (!leftContourLen) leftContourLen = leftContourRef.value.getTotalLength()
    const pt = leftContourRef.value.getPointAtLength(t * leftContourLen)
    leftTipPoint.value = { x: pt.x, y: pt.y }
  }
  if (rightContourRef.value) {
    if (!rightContourLen) rightContourLen = rightContourRef.value.getTotalLength()
    const pt = rightContourRef.value.getPointAtLength(t * rightContourLen)
    rightTipPoint.value = { x: pt.x, y: pt.y }
  }
}

// Organic curved clip path for the main white ribbons (tracks slightly behind leading root tendril)
const ribbonClipY = computed(() => {
  if (smoothGrowth.value >= 0.992) return 4020
  return Math.max(0, Math.min(4020, leftTipPoint.value.y - 12))
})
const leftRibbonClipPath = computed(() => {
  const y = ribbonClipY.value
  const dip = smoothGrowth.value >= 0.992 ? 0 : 38
  return `M 0,-10 L 140,-10 L 140,${y} Q 70,${y + dip} 0,${y - dip * 0.4} Z`
})
const rightRibbonClipPath = computed(() => {
  const y = ribbonClipY.value
  const dip = smoothGrowth.value >= 0.992 ? 0 : 38
  return `M 1300,-10 L 1440,-10 L 1440,${y - dip * 0.4} Q 1370,${y + dip} 1300,${y} Z`
})

// Left-side organic branching roots ("akar cabang") strictly inside x: 10..136
const leftBranches = [
  {
    id: 'l-1',
    triggerAt: 0.05,
    span: 0.11,
    path: 'M 48,260 C 78,295 104,280 124,335 C 132,360 116,390 102,405',
    subPath: 'M 86,294 C 102,326 90,362 72,382',
    tip: { x: 102, y: 405 },
    subTip: { x: 72, y: 382 },
    budType: 'leaf',
    angle: 28
  },
  {
    id: 'l-2',
    triggerAt: 0.17,
    span: 0.11,
    path: 'M 40,800 C 76,830 118,865 130,930 C 136,965 112,995 94,1010',
    subPath: 'M 94,864 C 120,858 134,884 126,912',
    tip: { x: 94, y: 1010 },
    subTip: { x: 126, y: 912 },
    budType: 'star',
    angle: -14
  },
  {
    id: 'l-3',
    triggerAt: 0.3,
    span: 0.11,
    path: 'M 52,1340 C 88,1368 118,1412 110,1476 C 104,1512 80,1532 66,1548',
    subPath: 'M 96,1404 C 122,1424 134,1460 124,1492',
    tip: { x: 66, y: 1548 },
    subTip: { x: 124, y: 1492 },
    budType: 'leaf',
    angle: 145
  },
  {
    id: 'l-4',
    triggerAt: 0.43,
    span: 0.11,
    path: 'M 36,1840 C 72,1880 122,1910 132,1975 C 138,2012 114,2048 92,2060',
    subPath: 'M 88,1914 C 106,1956 88,1998 68,2020',
    tip: { x: 92, y: 2060 },
    subTip: { x: 68, y: 2020 },
    budType: 'star',
    angle: 22
  },
  {
    id: 'l-5',
    triggerAt: 0.56,
    span: 0.11,
    path: 'M 50,2340 C 86,2376 116,2420 122,2488 C 126,2528 102,2558 84,2572',
    subPath: 'M 98,2424 C 124,2428 136,2454 128,2484',
    tip: { x: 84, y: 2572 },
    subTip: { x: 128, y: 2484 },
    budType: 'leaf',
    angle: -32
  },
  {
    id: 'l-6',
    triggerAt: 0.69,
    span: 0.11,
    path: 'M 36,2820 C 78,2858 118,2906 128,2974 C 132,3012 108,3044 88,3062',
    subPath: 'M 86,2898 C 104,2944 86,2988 64,3012',
    tip: { x: 88, y: 3062 },
    subTip: { x: 64, y: 3012 },
    budType: 'star',
    angle: 18
  },
  {
    id: 'l-7',
    triggerAt: 0.82,
    span: 0.11,
    path: 'M 48,3380 C 86,3418 122,3462 126,3530 C 128,3568 102,3602 82,3618',
    subPath: 'M 96,3464 C 124,3474 134,3504 122,3534',
    tip: { x: 82, y: 3618 },
    subTip: { x: 122, y: 3534 },
    budType: 'leaf',
    angle: 35
  }
]

// Right-side organic branching roots (mirrored with subtle organic variation, x: 1304..1430)
const rightBranches = [
  {
    id: 'r-1',
    triggerAt: 0.07,
    span: 0.11,
    path: 'M 1392,310 C 1358,345 1330,335 1312,390 C 1304,418 1322,448 1338,464',
    subPath: 'M 1350,348 C 1334,382 1348,418 1366,438',
    tip: { x: 1338, y: 464 },
    subTip: { x: 1366, y: 438 },
    budType: 'star',
    angle: -20
  },
  {
    id: 'r-2',
    triggerAt: 0.19,
    span: 0.11,
    path: 'M 1400,860 C 1362,892 1320,930 1310,996 C 1306,1032 1328,1062 1348,1078',
    subPath: 'M 1344,926 C 1318,924 1306,950 1314,978',
    tip: { x: 1348, y: 1078 },
    subTip: { x: 1314, y: 978 },
    budType: 'leaf',
    angle: -34
  },
  {
    id: 'r-3',
    triggerAt: 0.32,
    span: 0.11,
    path: 'M 1388,1400 C 1350,1434 1320,1478 1328,1542 C 1334,1580 1358,1602 1372,1618',
    subPath: 'M 1342,1470 C 1316,1490 1306,1526 1316,1558',
    tip: { x: 1372, y: 1618 },
    subTip: { x: 1316, y: 1558 },
    budType: 'star',
    angle: 16
  },
  {
    id: 'r-4',
    triggerAt: 0.45,
    span: 0.11,
    path: 'M 1404,1890 C 1366,1930 1318,1964 1308,2030 C 1304,2068 1326,2102 1348,2116',
    subPath: 'M 1350,1968 C 1332,2010 1350,2052 1370,2074',
    tip: { x: 1348, y: 2116 },
    subTip: { x: 1370, y: 2074 },
    budType: 'leaf',
    angle: 28
  },
  {
    id: 'r-5',
    triggerAt: 0.58,
    span: 0.11,
    path: 'M 1390,2400 C 1352,2438 1322,2482 1316,2550 C 1312,2590 1338,2620 1356,2636',
    subPath: 'M 1342,2486 C 1316,2490 1304,2518 1312,2546',
    tip: { x: 1356, y: 2636 },
    subTip: { x: 1312, y: 2546 },
    budType: 'star',
    angle: -18
  },
  {
    id: 'r-6',
    triggerAt: 0.71,
    span: 0.11,
    path: 'M 1404,2890 C 1362,2930 1320,2976 1312,3044 C 1308,3084 1332,3116 1352,3134',
    subPath: 'M 1352,2968 C 1334,3014 1352,3058 1374,3082',
    tip: { x: 1352, y: 3134 },
    subTip: { x: 1374, y: 3082 },
    budType: 'leaf',
    angle: -25
  },
  {
    id: 'r-7',
    triggerAt: 0.84,
    span: 0.11,
    path: 'M 1392,3440 C 1354,3478 1318,3524 1314,3592 C 1312,3630 1338,3664 1358,3680',
    subPath: 'M 1344,3524 C 1316,3534 1306,3566 1318,3596',
    tip: { x: 1358, y: 3680 },
    subTip: { x: 1318, y: 3596 },
    budType: 'star',
    angle: 22
  }
]

// Hero mini-sprouts that bloom as soon as the user begins scrolling
const heroSproutProgress = computed(() => easeOutCubic(props.scrollOffset / 220))

function computeTargetGrowth() {
  if (!props.fullBleed || !rootRef.value) return
  if (prefersReducedMotion) {
    targetGrowth = 1
    smoothGrowth.value = 1
    syncTipPositions()
    return
  }

  const heroRect = rootRef.value.getBoundingClientRect()
  const tailTop = heroRect.bottom
  const vh = window.innerHeight || 800
  const th = tailHeight.value || 2400

  // Keep the growing root tip comfortably tracking ~82% down the viewport
  const leadPoint = vh * 0.82 - tailTop
  const raw = leadPoint / th
  // Always keep a living starter sprout (~7%) visible right beneath the hero
  targetGrowth = clamp01(Math.max(0.07, raw))

  if (!rafId) {
    rafId = requestAnimationFrame(stepGrowthAnimation)
  }
}

function stepGrowthAnimation() {
  const diff = targetGrowth - smoothGrowth.value
  if (Math.abs(diff) < 0.0005) {
    smoothGrowth.value = targetGrowth
    syncTipPositions()
    rafId = null
    return
  }
  // Smooth organic spring damping
  smoothGrowth.value += diff * 0.12
  syncTipPositions()
  rafId = requestAnimationFrame(stepGrowthAnimation)
}

function startHeroEntrance() {
  if (prefersReducedMotion) {
    heroDraw.value = 1
    return
  }
  const duration = 1150
  const start = performance.now()
  function tick(now) {
    const t = clamp01((now - start) / duration)
    heroDraw.value = easeOutCubic(t)
    if (t < 1) {
      heroRafId = requestAnimationFrame(tick)
    } else {
      heroRafId = null
    }
  }
  heroRafId = requestAnimationFrame(tick)
}

function updateTailHeight() {
  if (!props.fullBleed || !rootRef.value) return
  const heroRect = rootRef.value.getBoundingClientRect()
  containerWidth.value = heroRect.width || window.innerWidth || 1440

  const footerEl = document.querySelector('footer')
  if (footerEl) {
    const footerRect = footerEl.getBoundingClientRect()
    const distToFooter = Math.max(300, Math.round(footerRect.top - heroRect.bottom) + 2)
    if (Math.abs(tailHeight.value - distToFooter) > 1) {
      tailHeight.value = distToFooter
    }
  }
  computeTargetGrowth()
}

onMounted(() => {
  prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false
  startHeroEntrance()

  if (props.fullBleed) {
    updateTailHeight()
    syncTipPositions()
    window.addEventListener('scroll', computeTargetGrowth, { passive: true })
    window.addEventListener('resize', updateTailHeight, { passive: true })
    window.addEventListener('load', updateTailHeight, { passive: true })
    if (document.fonts?.ready) {
      document.fonts.ready.then(updateTailHeight)
    }
    const targetEl = document.querySelector('main') || document.body
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateTailHeight())
      resizeObserver.observe(document.body)
      if (targetEl && targetEl !== document.body) {
        resizeObserver.observe(targetEl)
      }
    }
    if (typeof MutationObserver !== 'undefined' && targetEl) {
      mutationObserver = new MutationObserver(() => requestAnimationFrame(updateTailHeight))
      mutationObserver.observe(targetEl, { childList: true, subtree: true })
    }
    setTimeout(updateTailHeight, 150)
    setTimeout(updateTailHeight, 600)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', computeTargetGrowth)
  window.removeEventListener('resize', updateTailHeight)
  window.removeEventListener('load', updateTailHeight)
  if (rafId) cancelAnimationFrame(rafId)
  if (heroRafId) cancelAnimationFrame(heroRafId)
  if (resizeObserver) resizeObserver.disconnect()
  if (mutationObserver) mutationObserver.disconnect()
})
</script>

<template>
  <div
    ref="rootRef"
    class="relative select-none flex items-center justify-center overflow-visible"
    :class="
      fullBleed
        ? isMobileView
          ? 'w-full max-w-[92vw] mx-auto z-20 pointer-events-none'
          : 'w-screen relative left-1/2 -translate-x-1/2 z-30 pointer-events-none'
        : 'w-full'
    "
  >
    <!-- =================================================================== -->
    <!-- MAIN HERO GRAFFITI SVG (PROPORTIONAL ON ALL DEVICES)                -->
    <!-- =================================================================== -->
    <svg
      :viewBox="fullBleed ? (isMobileView ? '325 4 790 332' : '0 0 1440 370') : '250 0 940 360'"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="w-full h-auto block overflow-visible"
      role="img"
      aria-label="TERRA Bubble Graffiti Art"
    >
      <!-- 1. BACKGROUND STEPPED PIXEL BLOCKS & SOLID BLACK STAGE -->
      <path
        d="M 358,12 H 422 V 20 H 398 V 36 H 386 V 62 H 366 V 46 H 358 Z"
        fill="#000000"
      />
      <rect x="402" y="56" width="636" height="224" fill="#000000" />
      <path
        d="M 768,278 H 856 V 302 H 868 V 316 H 890 V 330 H 842 V 316 H 768 Z"
        fill="#000000"
      />
      <path
        d="M 1050,260 H 1074 V 282 H 1082 V 324 H 1022 V 296 H 1044 V 282 H 1050 Z"
        fill="#000000"
      />

      <!-- 2. BACKGROUND RIBBON LOOPS (Desktop/Tablet Only so mobile has zero clipped edges) -->
      <path
        v-if="fullBleed && !isMobileView"
        d="M 430,152 C 335,168 265,195 195,212 C 125,228 62,218 0,192 L 0,222 C 68,248 135,256 212,238 C 285,220 355,196 432,184 Z"
        fill="#fafaf9"
        stroke="#000000"
        stroke-width="2.5"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
      <path
        v-else-if="!fullBleed"
        d="M 430,152 C 345,168 295,198 250,240 L 250,275 C 295,235 355,198 432,186 Z"
        fill="#fafaf9"
        stroke="#000000"
        stroke-width="2.5"
        stroke-linejoin="round"
      />

      <!-- Left & Right Hero Contour Root Lines (Desktop/Tablet Only) -->
      <g v-if="fullBleed && !isMobileView">
        <path
          d="M 358,16 C 245,16 140,4 2,2"
          pathLength="1"
          :stroke-dasharray="1"
          :stroke-dashoffset="1 - heroDraw"
          stroke="#000000"
          stroke-width="1.8"
          fill="none"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
        />
        <path
          d="M 2,72 C 74,94 108,175 64,370"
          pathLength="1"
          :stroke-dasharray="1"
          :stroke-dashoffset="1 - heroDraw"
          stroke="#000000"
          stroke-width="1.8"
          fill="none"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
        />
        <!-- Hero Left Scroll-Triggered Branching Sprout -->
        <path
          d="M 86,216 C 124,230 148,262 134,296 C 126,314 108,320 96,314"
          pathLength="1"
          :stroke-dasharray="1"
          :stroke-dashoffset="1 - heroSproutProgress"
          stroke="#000000"
          stroke-width="1.8"
          fill="none"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
        />
        <g
          :transform="`translate(96, 314) scale(${heroSproutProgress > 0.45 ? easeOutBack((heroSproutProgress - 0.45) / 0.55) : 0})`"
        >
          <path
            d="M 0,-7 L 2.2,-2.2 L 7,0 L 2.2,2.2 L 0,7 L -2.2,2.2 L -7,0 L -2.2,-2.2 Z"
            fill="#72a5e4"
            stroke="#000000"
            stroke-width="1.4"
            stroke-linejoin="round"
          />
        </g>

        <path
          d="M 1038,86 C 1105,42 1175,8 1235,24 C 1295,40 1265,98 1215,122 C 1165,146 1185,188 1265,198 C 1345,208 1402,155 1438,125"
          pathLength="1"
          :stroke-dasharray="1"
          :stroke-dashoffset="1 - heroDraw"
          stroke="#000000"
          stroke-width="1.8"
          fill="none"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
        />
        <path
          d="M 1438,55 C 1355,62 1320,102 1365,142 C 1410,182 1392,280 1376,370"
          pathLength="1"
          :stroke-dasharray="1"
          :stroke-dashoffset="1 - heroDraw"
          stroke="#000000"
          stroke-width="1.8"
          fill="none"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
        />
        <!-- Hero Right Scroll-Triggered Branching Sprout -->
        <path
          d="M 1384,236 C 1344,248 1318,274 1326,308 C 1332,324 1348,332 1360,326"
          pathLength="1"
          :stroke-dasharray="1"
          :stroke-dashoffset="1 - heroSproutProgress"
          stroke="#000000"
          stroke-width="1.8"
          fill="none"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
        />
        <g
          :transform="`translate(1360, 326) scale(${heroSproutProgress > 0.45 ? easeOutBack((heroSproutProgress - 0.45) / 0.55) : 0})`"
        >
          <path
            d="M 0,-7 L 2.2,-2.2 L 7,0 L 2.2,2.2 L 0,7 L -2.2,2.2 L -7,0 L -2.2,-2.2 Z"
            fill="#72a5e4"
            stroke="#000000"
            stroke-width="1.4"
            stroke-linejoin="round"
          />
        </g>
      </g>

      <!-- 3. 3D PUFFY BLUE BUBBLE LETTERS SPELLING "T E R R A" (#71a6e5) - Centered at x=720 -->
      <g transform="translate(20, 0)">
      <g
        class="animate-float-slow"
        :style="{ transform: `translateY(${scrollOffset * -0.04}px)` }"
      >
        <g stroke="#000000" stroke-width="4.8" stroke-linejoin="round" stroke-linecap="round">
          <!-- LETTER 1: "T" -->
          <path
            d="M 388,136 C 352,138 332,116 336,84 C 340,48 382,30 442,32 C 502,34 542,56 538,92 C 534,122 504,138 472,136 C 482,188 484,254 462,286 C 442,312 396,310 382,278 C 368,246 376,186 388,136 Z"
            fill="#71a6e5"
          />
          <path
            d="M 402,126 C 424,118 448,118 464,128"
            fill="none"
            stroke="#000000"
            stroke-width="4.5"
          />

          <!-- LETTER 2: "E" -->
          <path
            d="M 486,122 C 482,82 518,54 568,56 C 614,58 638,84 632,114 C 626,138 598,146 572,144 C 604,146 628,162 624,188 C 620,212 592,222 564,218 C 598,222 626,242 620,274 C 614,306 568,322 522,310 C 478,298 462,254 468,202 C 472,164 488,150 486,122 Z"
            fill="#71a6e5"
          />
          <path d="M 536,138 C 554,144 574,146 588,144" fill="none" stroke="#000000" stroke-width="4.5" />
          <path d="M 532,212 C 552,218 572,220 586,218" fill="none" stroke="#000000" stroke-width="4.5" />

          <!-- LETTER 3: "R" (First R) -->
          <path
            d="M 604,110 C 600,64 634,34 684,38 C 734,42 764,78 756,124 C 750,158 724,176 696,180 C 726,188 754,218 758,262 C 762,298 734,324 704,316 C 678,308 672,272 666,238 C 662,258 656,294 630,296 C 604,298 594,264 598,212 C 602,164 606,144 604,110 Z"
            fill="#71a6e5"
          />
          <path
            d="M 668,102 C 686,98 698,112 692,130 C 686,144 668,144 662,132"
            fill="none"
            stroke="#000000"
            stroke-width="4.5"
          />

          <!-- LETTER 4: "R" (Second R) -->
          <path
            d="M 738,96 C 736,46 772,18 822,22 C 872,26 902,64 894,112 C 888,148 862,168 834,172 C 866,180 894,210 898,254 C 902,292 874,316 844,308 C 818,300 810,264 804,228 C 798,256 792,292 766,294 C 740,296 730,262 734,206 C 738,158 740,134 738,96 Z"
            fill="#71a6e5"
          />
          <path
            d="M 804,90 C 822,86 834,100 828,118 C 822,132 804,132 798,120"
            fill="none"
            stroke="#000000"
            stroke-width="4.5"
          />

          <!-- LETTER 5: "A" -->
          <path
            d="M 884,182 C 882,108 924,62 978,66 C 1032,70 1068,118 1064,192 C 1060,256 1034,292 998,288 C 974,286 968,262 966,242 C 952,246 938,246 926,242 C 922,264 912,286 888,284 C 864,282 886,228 884,182 Z"
            fill="#71a6e5"
          />
          <path
            d="M 968,132 C 982,148 982,176 966,192"
            fill="none"
            stroke="#000000"
            stroke-width="4.5"
          />
          <path
            d="M 932,206 C 954,214 978,214 996,204"
            fill="none"
            stroke="#000000"
            stroke-width="4.5"
          />
        </g>

        <!-- 4. WHITE SPECULAR GLOSS / SHINE HIGHLIGHTS -->
        <g fill="#ffffff">
          <path d="M 432,48 C 468,48 504,62 514,80 C 518,88 506,94 498,84 C 486,68 458,58 428,58 C 420,58 422,48 432,48 Z" />
          <circle cx="408" cy="54" r="5" />
          <path d="M 448,195 C 456,218 456,252 446,268 C 440,276 432,268 436,252 C 442,232 442,208 440,196 C 438,190 446,188 448,195 Z" />

          <circle cx="552" cy="76" r="4.5" />
          <path d="M 572,74 C 594,76 612,88 610,102 C 608,110 596,106 590,96 C 584,86 566,82 566,76 C 566,74 568,74 572,74 Z" />
          <path d="M 574,162 C 592,164 604,174 600,184 C 596,192 586,184 578,176 C 572,170 568,162 574,162 Z" />
          <path d="M 568,242 C 588,248 598,266 590,280 C 584,290 572,280 568,266 C 564,254 558,240 568,242 Z" />

          <circle cx="668" cy="58" r="5" />
          <path d="M 688,58 C 714,62 734,82 734,104 C 734,114 720,112 718,98 C 714,82 698,70 684,66 C 678,64 682,56 688,58 Z" />
          <path d="M 718,222 C 734,238 740,268 732,286 C 726,296 716,286 720,268 C 722,250 714,232 712,224 C 710,218 714,218 718,222 Z" />

          <circle cx="806" cy="42" r="5" />
          <path d="M 826,42 C 852,46 872,66 872,88 C 872,98 858,96 856,82 C 852,66 836,54 822,50 C 816,48 820,40 826,42 Z" />
          <path d="M 858,214 C 874,230 880,260 872,278 C 866,288 856,278 860,260 C 862,242 854,224 852,216 C 850,210 854,210 858,214 Z" />

          <circle cx="968" cy="88" r="5" />
          <path d="M 988,90 C 1014,96 1036,122 1038,148 C 1038,158 1024,154 1022,138 C 1018,118 1000,102 984,98 C 978,96 982,88 988,90 Z" />
          <path d="M 1024,218 C 1032,236 1028,258 1016,266 C 1008,270 1006,258 1012,244 C 1016,232 1018,212 1024,218 Z" />
        </g>
      </g>
      </g>

      <!-- 5. HERO FOREGROUND RIBBONS (Desktop/Tablet Only so mobile wordmark stays 100% clean) -->
      <path
        v-if="fullBleed && !isMobileView"
        d="M 432,158 C 372,178 332,186 312,156 C 292,126 316,52 278,2 L 244,2 C 276,48 272,94 248,88 C 228,84 205,58 175,28 C 145,-2 95,12 55,55 C 25,88 16,135 2,155 L 2,185 C 28,165 48,125 82,92 C 118,58 155,58 195,95 C 232,128 268,142 282,172 C 294,202 258,218 222,232 C 145,260 16,265 16,370 L 48,370 C 48,292 168,282 242,248 C 298,224 368,196 432,174 Z"
        fill="#fafaf9"
        stroke="#000000"
        stroke-width="2.5"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
      <path
        v-else-if="!fullBleed"
        d="M 432,158 C 372,178 332,186 312,156 C 292,126 324,72 288,12 L 250,12 C 272,52 272,94 248,88 C 228,84 205,58 175,28 L 175,95 C 232,128 268,142 282,172 C 294,202 258,218 222,232 L 242,248 C 298,224 368,196 432,174 Z"
        fill="#fafaf9"
        stroke="#000000"
        stroke-width="2.5"
        stroke-linejoin="round"
      />

      <path
        v-if="fullBleed && !isMobileView"
        d="M 1008,136 C 1045,134 1068,102 1108,94 C 1152,84 1185,116 1196,168 C 1208,222 1182,272 1235,315 C 1285,355 1424,275 1424,370 L 1392,370 C 1392,312 1278,368 1222,322 C 1172,280 1192,212 1176,162 C 1160,112 1138,102 1102,110 C 1065,118 1048,148 1008,146 Z"
        fill="#fafaf9"
        stroke="#000000"
        stroke-width="2.5"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
      <path
        v-else-if="!fullBleed"
        d="M 1008,136 C 1045,134 1068,102 1108,94 C 1152,84 1185,116 1196,168 C 1208,222 1182,272 1235,325 L 1252,296 C 1212,256 1238,204 1222,152 C 1206,102 1168,68 1112,78 C 1068,86 1048,122 1008,144 Z"
        fill="#fafaf9"
        stroke="#000000"
        stroke-width="2.5"
        stroke-linejoin="round"
      />

      <!-- 6. ANIMATED CLOUD PUFF & 8-POINT STARBURST -->
      <g transform="translate(20, 0)">
      <g class="animate-float-cloud">
        <path
          d="M 18,12 C 18,2 34,0 38,10 C 48,6 56,18 48,28 C 56,36 46,50 34,44 C 26,54 10,48 12,34 C 0,30 4,12 18,12 Z"
          fill="#fafaf9"
          stroke="#000000"
          stroke-width="3"
          stroke-linejoin="round"
        />
        <path d="M 12,50 C 18,56 26,56 32,50" stroke="#000000" stroke-width="2.2" fill="none" stroke-linecap="round" />
      </g>

      <g class="animate-pulse-star">
        <path d="M 32,12 C 36,4 44,4 48,12" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" />
        <path
          d="M 40,12 L 48,46 L 72,30 L 60,56 L 92,66 L 62,78 L 76,104 L 48,90 L 36,122 L 28,88 L 4,98 L 20,72 L -2,56 L 26,48 L 16,24 L 34,38 Z"
          fill="#fafaf9"
          stroke="#000000"
          stroke-width="2.8"
          stroke-linejoin="round"
        />
      </g>
      </g>
    </svg>

    <!-- =================================================================== -->
    <!-- SCROLL-GROWING LIVING ROOT & RIBBON SYSTEM TO TOP OF FOOTER         -->
    <!-- Main contour roots draw progressively, ribbons unfurl behind them,  -->
    <!-- and organic side-branches + blue buds sprout as you scroll down!    -->
    <!-- =================================================================== -->
    <svg
      v-if="fullBleed && !isMobileView"
      ref="tailSvgRef"
      class="hidden lg:block pointer-events-none absolute top-full left-0 w-full z-30 overflow-hidden"
      :style="{ height: tailHeight + 'px' }"
      viewBox="0 0 1440 4000"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id="terra-left-ribbon-grow">
          <path :d="leftRibbonClipPath" />
        </clipPath>
        <clipPath id="terra-right-ribbon-grow">
          <path :d="rightRibbonClipPath" />
        </clipPath>
      </defs>

      <!-- Subtle Guide Ghost Trails (faint dashed blueprint path showing where roots will grow) -->
      <path
        d="M 64,0 C 18,240 82,520 38,840 C 8,1160 80,1480 36,1800 C 8,2120 78,2440 34,2760 C 8,3080 76,3400 38,3720 C 24,3860 44,3940 64,4000"
        stroke="#000000"
        stroke-opacity="0.1"
        stroke-width="1.2"
        stroke-dasharray="5 9"
        fill="none"
        vector-effect="non-scaling-stroke"
      />
      <path
        d="M 1376,0 C 1422,240 1358,520 1402,840 C 1432,1160 1360,1480 1404,1800 C 1432,2120 1362,2440 1406,2760 C 1432,3080 1364,3400 1402,3720 C 1416,3860 1396,3940 1376,4000"
        stroke="#000000"
        stroke-opacity="0.1"
        stroke-width="1.2"
        stroke-dasharray="5 9"
        fill="none"
        vector-effect="non-scaling-stroke"
      />

      <!-- Flowing Blue Energy Veins (Animated sap pulse travelling along the grown roots) -->
      <g clip-path="url(#terra-left-ribbon-grow)">
        <path
          d="M 64,0 C 18,240 82,520 38,840 C 8,1160 80,1480 36,1800 C 8,2120 78,2440 34,2760 C 8,3080 76,3400 38,3720 C 24,3860 44,3940 64,4000"
          class="root-energy-vein"
          stroke="#72a5e4"
          stroke-width="2.6"
          stroke-opacity="0.65"
          stroke-dasharray="14 28"
          stroke-linecap="round"
          fill="none"
          vector-effect="non-scaling-stroke"
        />
      </g>
      <g clip-path="url(#terra-right-ribbon-grow)">
        <path
          d="M 1376,0 C 1422,240 1358,520 1402,840 C 1432,1160 1360,1480 1404,1800 C 1432,2120 1362,2440 1406,2760 C 1432,3080 1364,3400 1402,3720 C 1416,3860 1396,3940 1376,4000"
          class="root-energy-vein"
          stroke="#72a5e4"
          stroke-width="2.6"
          stroke-opacity="0.65"
          stroke-dasharray="14 28"
          stroke-linecap="round"
          fill="none"
          vector-effect="non-scaling-stroke"
        />
      </g>

      <!-- Left & Right Primary Contour Roots (Scroll-Driven Path Drawing) -->
      <path
        ref="leftContourRef"
        d="M 64,0 C 18,240 82,520 38,840 C 8,1160 80,1480 36,1800 C 8,2120 78,2440 34,2760 C 8,3080 76,3400 38,3720 C 24,3860 44,3940 64,4000"
        pathLength="1"
        :stroke-dasharray="1"
        :stroke-dashoffset="Math.max(0, 1 - smoothGrowth)"
        stroke="#000000"
        stroke-width="1.9"
        stroke-linecap="round"
        fill="none"
        vector-effect="non-scaling-stroke"
      />
      <path
        ref="rightContourRef"
        d="M 1376,0 C 1422,240 1358,520 1402,840 C 1432,1160 1360,1480 1404,1800 C 1432,2120 1362,2440 1406,2760 C 1432,3080 1364,3400 1402,3720 C 1416,3860 1396,3940 1376,4000"
        pathLength="1"
        :stroke-dasharray="1"
        :stroke-dashoffset="Math.max(0, 1 - smoothGrowth)"
        stroke="#000000"
        stroke-width="1.9"
        stroke-linecap="round"
        fill="none"
        vector-effect="non-scaling-stroke"
      />

      <!-- Left Sprouting Side Branches ("Akar Cabang") + Blooming Buds -->
      <g v-for="b in leftBranches" :key="b.id">
        <path
          :d="b.path"
          pathLength="1"
          :stroke-dasharray="1"
          :stroke-dashoffset="1 - branchProgress(b.triggerAt, b.span)"
          stroke="#000000"
          stroke-width="1.7"
          stroke-linecap="round"
          fill="none"
          vector-effect="non-scaling-stroke"
        />
        <path
          :d="b.subPath"
          pathLength="1"
          :stroke-dasharray="1"
          :stroke-dashoffset="1 - branchProgress(b.triggerAt + 0.035, b.span * 0.85)"
          stroke="#000000"
          stroke-width="1.35"
          stroke-linecap="round"
          fill="none"
          vector-effect="non-scaling-stroke"
        />
        <!-- Blooming Tip Emblem (Aspect-Corrected so never stretched) -->
        <g
          v-if="budScale(b.triggerAt, b.span) > 0.01"
          :transform="`translate(${b.tip.x}, ${b.tip.y}) scale(${budScale(b.triggerAt, b.span)}, ${budScale(b.triggerAt, b.span) * budYScale}) rotate(${b.angle})`"
        >
          <path
            v-if="b.budType === 'star'"
            class="bud-breathe"
            d="M 0,-9 L 2.6,-2.6 L 9,0 L 2.6,2.6 L 0,9 L -2.6,2.6 L -9,0 L -2.6,-2.6 Z"
            fill="#72a5e4"
            stroke="#000000"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
          <path
            v-else
            class="bud-breathe"
            d="M 0,-9 C 6,-5 8,2 0,9 C -8,2 -6,-5 0,-9 Z"
            fill="#72a5e4"
            stroke="#000000"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
        </g>
        <!-- Sub-branch tiny sprout node -->
        <g
          v-if="budScale(b.triggerAt + 0.035, b.span * 0.85) > 0.01"
          :transform="`translate(${b.subTip.x}, ${b.subTip.y}) scale(${budScale(b.triggerAt + 0.035, b.span * 0.85)}, ${budScale(b.triggerAt + 0.035, b.span * 0.85) * budYScale})`"
        >
          <circle cx="0" cy="0" r="3.5" fill="#fafaf9" stroke="#000000" stroke-width="1.6" />
        </g>
      </g>

      <!-- Right Sprouting Side Branches ("Akar Cabang") + Blooming Buds -->
      <g v-for="b in rightBranches" :key="b.id">
        <path
          :d="b.path"
          pathLength="1"
          :stroke-dasharray="1"
          :stroke-dashoffset="1 - branchProgress(b.triggerAt, b.span)"
          stroke="#000000"
          stroke-width="1.7"
          stroke-linecap="round"
          fill="none"
          vector-effect="non-scaling-stroke"
        />
        <path
          :d="b.subPath"
          pathLength="1"
          :stroke-dasharray="1"
          :stroke-dashoffset="1 - branchProgress(b.triggerAt + 0.035, b.span * 0.85)"
          stroke="#000000"
          stroke-width="1.35"
          stroke-linecap="round"
          fill="none"
          vector-effect="non-scaling-stroke"
        />
        <!-- Blooming Tip Emblem -->
        <g
          v-if="budScale(b.triggerAt, b.span) > 0.01"
          :transform="`translate(${b.tip.x}, ${b.tip.y}) scale(${budScale(b.triggerAt, b.span)}, ${budScale(b.triggerAt, b.span) * budYScale}) rotate(${b.angle})`"
        >
          <path
            v-if="b.budType === 'star'"
            class="bud-breathe"
            d="M 0,-9 L 2.6,-2.6 L 9,0 L 2.6,2.6 L 0,9 L -2.6,2.6 L -9,0 L -2.6,-2.6 Z"
            fill="#72a5e4"
            stroke="#000000"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
          <path
            v-else
            class="bud-breathe"
            d="M 0,-9 C 6,-5 8,2 0,9 C -8,2 -6,-5 0,-9 Z"
            fill="#72a5e4"
            stroke="#000000"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
        </g>
        <!-- Sub-branch tiny sprout node -->
        <g
          v-if="budScale(b.triggerAt + 0.035, b.span * 0.85) > 0.01"
          :transform="`translate(${b.subTip.x}, ${b.subTip.y}) scale(${budScale(b.triggerAt + 0.035, b.span * 0.85)}, ${budScale(b.triggerAt + 0.035, b.span * 0.85) * budYScale})`"
        >
          <circle cx="0" cy="0" r="3.5" fill="#fafaf9" stroke="#000000" stroke-width="1.6" />
        </g>
      </g>

      <!-- Left White Ribbon Trunk (Unfurling Organically Downward via Clip Path) -->
      <g clip-path="url(#terra-left-ribbon-grow)">
        <path
          d="M 16,0 C 16,220 74,460 30,740 C 8,1020 72,1320 28,1620 C 8,1920 70,2220 26,2520 C 8,2820 68,3120 26,3420 C 10,3680 16,3840 16,4000 L 48,4000 C 48,3840 32,3680 54,3420 C 96,3120 34,2820 56,2520 C 98,2220 34,1920 58,1620 C 100,1320 36,1020 60,740 C 102,460 48,220 48,0 Z"
          fill="#fafaf9"
          stroke="#000000"
          stroke-width="2.5"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        />
        <line x1="17" y1="0" x2="47" y2="0" stroke="#fafaf9" stroke-width="4" vector-effect="non-scaling-stroke" />
        <line x1="17" y1="4000" x2="47" y2="4000" stroke="#fafaf9" stroke-width="4" vector-effect="non-scaling-stroke" />
      </g>

      <!-- Right White Ribbon Trunk (Unfurling Organically Downward via Clip Path) -->
      <g clip-path="url(#terra-right-ribbon-grow)">
        <path
          d="M 1424,0 C 1424,220 1366,460 1410,740 C 1432,1020 1368,1320 1412,1620 C 1432,1920 1370,2220 1414,2520 C 1432,2820 1372,3120 1414,3420 C 1430,3680 1424,3840 1424,4000 L 1392,4000 C 1392,3840 1408,3680 1386,3420 C 1344,3120 1406,2820 1384,2520 C 1342,2220 1406,1920 1382,1620 C 1340,1320 1404,1020 1380,740 C 1338,460 1392,220 1392,0 Z"
          fill="#fafaf9"
          stroke="#000000"
          stroke-width="2.5"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        />
        <line x1="1393" y1="0" x2="1423" y2="0" stroke="#fafaf9" stroke-width="4" vector-effect="non-scaling-stroke" />
        <line x1="1393" y1="4000" x2="1423" y2="4000" stroke="#fafaf9" stroke-width="4" vector-effect="non-scaling-stroke" />
      </g>

      <!-- Active Living Growth Tips (Exact Bezier Point Tracking the Leading Edge) -->
      <g
        v-if="smoothGrowth > 0.02 && smoothGrowth < 0.99"
        :transform="`translate(${leftTipPoint.x}, ${leftTipPoint.y}) scale(1, ${budYScale})`"
      >
        <circle cx="0" cy="0" r="9" fill="#72a5e4" fill-opacity="0.35" class="root-tip-pulse" />
        <circle cx="0" cy="0" r="4.5" fill="#72a5e4" stroke="#000000" stroke-width="1.8" />
      </g>
      <g
        v-if="smoothGrowth > 0.02 && smoothGrowth < 0.99"
        :transform="`translate(${rightTipPoint.x}, ${rightTipPoint.y}) scale(1, ${budYScale})`"
      >
        <circle cx="0" cy="0" r="9" fill="#72a5e4" fill-opacity="0.35" class="root-tip-pulse" />
        <circle cx="0" cy="0" r="4.5" fill="#72a5e4" stroke="#000000" stroke-width="1.8" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
@keyframes rootEnergyFlow {
  0% {
    stroke-dashoffset: 42;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

@keyframes rootTipPulse {
  0%, 100% {
    transform: scale(0.9);
    opacity: 0.35;
  }
  50% {
    transform: scale(1.45);
    opacity: 0.7;
  }
}

@keyframes budBreathe {
  0%, 100% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(7deg) scale(1.08);
  }
}

.root-energy-vein {
  animation: rootEnergyFlow 2.6s linear infinite;
}

.root-tip-pulse {
  transform-origin: center;
  animation: rootTipPulse 1.8s ease-in-out infinite;
}

.bud-breathe {
  transform-origin: center;
  animation: budBreathe 4.2s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .root-energy-vein,
  .root-tip-pulse,
  .bud-breathe {
    animation: none;
  }
}
</style>
