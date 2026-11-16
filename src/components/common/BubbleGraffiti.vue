<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

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
const tailHeight = ref(2400)
let resizeObserver = null
let mutationObserver = null

function updateTailHeight() {
  if (!props.fullBleed || !rootRef.value) return
  const heroRect = rootRef.value.getBoundingClientRect()
  const footerEl = document.querySelector('footer')
  if (footerEl) {
    const footerRect = footerEl.getBoundingClientRect()
    // Exact distance from bottom of Hero SVG to top of Footer (+2px overlap for seamless join)
    const distToFooter = Math.max(300, Math.round(footerRect.top - heroRect.bottom) + 2)
    if (Math.abs(tailHeight.value - distToFooter) > 1) {
      tailHeight.value = distToFooter
    }
  }
}

onMounted(() => {
  if (props.fullBleed) {
    updateTailHeight()
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
  window.removeEventListener('resize', updateTailHeight)
  window.removeEventListener('load', updateTailHeight)
  if (resizeObserver) resizeObserver.disconnect()
  if (mutationObserver) mutationObserver.disconnect()
})
</script>

<template>
  <div
    ref="rootRef"
    class="relative select-none flex items-center justify-center overflow-visible"
    :class="fullBleed ? 'w-screen relative left-1/2 -translate-x-1/2 z-30 pointer-events-none' : 'w-full'"
  >
    <!-- =================================================================== -->
    <!-- MAIN HERO GRAFFITI SVG (PROPORTIONAL ON ALL DEVICES)                -->
    <!-- =================================================================== -->
    <svg
      :viewBox="fullBleed ? '0 0 1440 370' : '250 0 940 360'"
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

      <!-- 2. BACKGROUND RIBBON LOOPS -->
      <path
        v-if="fullBleed"
        d="M 410,152 C 335,168 265,195 195,212 C 125,228 62,218 0,192 L 0,222 C 68,248 135,256 212,238 C 285,220 355,196 412,184 Z"
        fill="#fafaf9"
        stroke="#000000"
        stroke-width="2.5"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
      <path
        v-else
        d="M 410,152 C 345,168 295,198 250,240 L 250,275 C 295,235 355,198 412,186 Z"
        fill="#fafaf9"
        stroke="#000000"
        stroke-width="2.5"
        stroke-linejoin="round"
      />

      <!-- Left & Right Hero Contour Lines (Contained cleanly inside 2..1438 & exiting at x=64,y=370 and x=1376,y=370) -->
      <path
        v-if="fullBleed"
        d="M 358,16 C 245,16 140,4 2,2 M 2,72 C 74,94 108,175 64,370"
        stroke="#000000"
        stroke-width="1.8"
        fill="none"
        stroke-linecap="round"
        vector-effect="non-scaling-stroke"
      />
      <path
        v-if="fullBleed"
        d="M 1038,86 C 1105,42 1175,8 1235,24 C 1295,40 1265,98 1215,122 C 1165,146 1185,188 1265,198 C 1345,208 1402,155 1438,125 M 1438,55 C 1355,62 1320,102 1365,142 C 1410,182 1392,280 1376,370"
        stroke="#000000"
        stroke-width="1.8"
        fill="none"
        stroke-linecap="round"
        vector-effect="non-scaling-stroke"
      />

      <!-- 3. 3D PUFFY BLUE BUBBLE LETTERS SPELLING "T E R R A" (#71a6e5) -->
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

      <!-- 5. HERO FOREGROUND RIBBONS (EXACT EDGE FIT 2..1438 & EXITING AT x=16..48 & x=1392..1424, y=370) -->
      <path
        v-if="fullBleed"
        d="M 412,158 C 372,178 332,186 312,156 C 292,126 316,52 278,2 L 244,2 C 276,48 272,94 248,88 C 228,84 205,58 175,28 C 145,-2 95,12 55,55 C 25,88 16,135 2,155 L 2,185 C 28,165 48,125 82,92 C 118,58 155,58 195,95 C 232,128 268,142 282,172 C 294,202 258,218 222,232 C 145,260 16,265 16,370 L 48,370 C 48,292 168,282 242,248 C 298,224 368,196 412,174 Z"
        fill="#fafaf9"
        stroke="#000000"
        stroke-width="2.5"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
      <path
        v-else
        d="M 412,158 C 372,178 332,186 312,156 C 292,126 324,72 288,12 L 250,12 C 272,52 272,94 248,88 C 228,84 205,58 175,28 L 175,95 C 232,128 268,142 282,172 C 294,202 258,218 222,232 L 242,248 C 298,224 368,196 412,174 Z"
        fill="#fafaf9"
        stroke="#000000"
        stroke-width="2.5"
        stroke-linejoin="round"
      />

      <path
        v-if="fullBleed"
        d="M 988,136 C 1025,134 1068,102 1108,94 C 1152,84 1185,116 1196,168 C 1208,222 1182,272 1235,315 C 1285,355 1424,275 1424,370 L 1392,370 C 1392,312 1278,368 1222,322 C 1172,280 1192,212 1176,162 C 1160,112 1138,102 1102,110 C 1065,118 1028,148 988,146 Z"
        fill="#fafaf9"
        stroke="#000000"
        stroke-width="2.5"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
      <path
        v-else
        d="M 988,136 C 1025,134 1068,102 1108,94 C 1152,84 1185,116 1196,168 C 1208,222 1182,272 1235,325 L 1252,296 C 1212,256 1238,204 1222,152 C 1206,102 1168,68 1112,78 C 1068,86 1028,122 988,144 Z"
        fill="#fafaf9"
        stroke="#000000"
        stroke-width="2.5"
        stroke-linejoin="round"
      />

      <!-- 6. ANIMATED CLOUD PUFF & 8-POINT STARBURST -->
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
    </svg>

    <!-- =================================================================== -->
    <!-- RESPONSIVE RIBBON TAIL TO TOP OF FOOTER (NEVER OVERFLOWS FOOTER!)   -->
    <!-- Starts at x=16..48 & x=1392..1424, y=0 and lands at exact same X    -->
    <!-- at y=4000 (top of Footer), where Footer's SVG terminal picks up!    -->
    <!-- =================================================================== -->
    <svg
      v-if="fullBleed"
      class="pointer-events-none absolute top-full left-0 w-full z-30 overflow-hidden"
      :style="{ height: tailHeight + 'px' }"
      viewBox="0 0 1440 4000"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Left Contour Line strictly within 8..84 from x=64,y=0 to x=64,y=4000 -->
      <path
        d="M 64,0 C 18,240 82,520 38,840 C 8,1160 80,1480 36,1800 C 8,2120 78,2440 34,2760 C 8,3080 76,3400 38,3720 C 24,3860 44,3940 64,4000"
        stroke="#000000"
        stroke-width="1.8"
        fill="none"
        vector-effect="non-scaling-stroke"
      />
      <!-- Right Contour Line strictly within 1356..1432 from x=1376,y=0 to x=1376,y=4000 -->
      <path
        d="M 1376,0 C 1422,240 1358,520 1402,840 C 1432,1160 1360,1480 1404,1800 C 1432,2120 1362,2440 1406,2760 C 1432,3080 1364,3400 1402,3720 C 1416,3860 1396,3940 1376,4000"
        stroke="#000000"
        stroke-width="1.8"
        fill="none"
        vector-effect="non-scaling-stroke"
      />

      <!-- Left White Ribbon strictly inside 8..76 from x=16..48,y=0 to x=16..48,y=4000 -->
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

      <!-- Right White Ribbon strictly inside 1364..1432 from x=1392..1424,y=0 to x=1392..1424,y=4000 -->
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
    </svg>
  </div>
</template>
