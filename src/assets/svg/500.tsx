// React Imports
import type { SVGAttributes } from 'react'

const Icon500 = (props: SVGAttributes<SVGElement>) => {
  return (
    <svg
      width='1.21325em'
      height='1em'
      viewBox='0 0 586 483'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      {/* Background shadow & glow ellipses */}
      <ellipse
        cx='293'
        cy='420'
        rx='220'
        ry='32'
        fill='var(--primary)'
        fillOpacity='0.08'
      />
      <ellipse
        cx='293'
        cy='415'
        rx='160'
        ry='20'
        fill='var(--primary)'
        fillOpacity='0.12'
      />

      {/* Ground Grid lines */}
      <path
        d='M120 415L293 330L466 415L293 450Z'
        stroke='var(--primary)'
        strokeOpacity='0.18'
        strokeWidth='2'
      />
      <path
        d='M170 415L293 355L416 415'
        stroke='var(--primary)'
        strokeOpacity='0.14'
        strokeWidth='1.5'
      />
      <path
        d='M220 415L293 380L366 415'
        stroke='var(--primary)'
        strokeOpacity='0.12'
        strokeWidth='1.5'
      />

      {/* Central Server Tower / Base */}
      {/* Back Tower */}
      <path
        d='M243 140L293 115L343 140L293 165Z'
        fill='var(--primary)'
        fillOpacity='0.25'
      />
      <path
        d='M243 140L293 165V350L243 325Z'
        fill='var(--primary)'
        fillOpacity='0.45'
      />
      <path
        d='M343 140L293 165V350L343 325Z'
        fill='var(--primary)'
        fillOpacity='0.3'
      />

      {/* Left Server Blade Slot */}
      <path
        d='M180 200L230 175L280 200L230 225Z'
        fill='var(--primary)'
        fillOpacity='0.3'
      />
      <path
        d='M180 200L230 225V375L180 350Z'
        fill='var(--primary)'
        fillOpacity='0.55'
      />
      <path
        d='M280 200L230 225V375L280 350Z'
        fill='var(--primary)'
        fillOpacity='0.35'
      />

      {/* Right Server Blade Slot */}
      <path
        d='M306 200L356 175L406 200L356 225Z'
        fill='var(--primary)'
        fillOpacity='0.3'
      />
      <path
        d='M306 200L356 225V375L306 350Z'
        fill='var(--primary)'
        fillOpacity='0.45'
      />
      <path
        d='M406 200L356 225V375L406 350Z'
        fill='var(--primary)'
        fillOpacity='0.25'
      />

      {/* Server Front Status Lines & LEDs */}
      {/* Left Blade LEDs */}
      <rect x='195' y='240' width='22' height='5' rx='2.5' fill='var(--primary)' fillOpacity='0.7' />
      <rect x='195' y='255' width='22' height='5' rx='2.5' fill='var(--primary)' fillOpacity='0.4' />
      <rect x='195' y='270' width='22' height='5' rx='2.5' fill='var(--primary)' fillOpacity='0.7' />
      <rect x='195' y='285' width='22' height='5' rx='2.5' fill='var(--primary)' fillOpacity='0.4' />
      <rect x='195' y='300' width='22' height='5' rx='2.5' fill='var(--primary)' fillOpacity='0.7' />
      <circle cx='188' cy='242' r='2' fill='var(--primary)' fillOpacity='0.9' />
      <circle cx='188' cy='257' r='2' fill='var(--primary)' fillOpacity='0.5' />
      <circle cx='188' cy='272' r='2' fill='var(--primary)' fillOpacity='0.9' />
      <circle cx='188' cy='287' r='2' fill='var(--primary)' fillOpacity='0.5' />
      <circle cx='188' cy='302' r='2' fill='var(--primary)' fillOpacity='0.9' />

      {/* Right Blade LEDs */}
      <rect x='320' y='240' width='22' height='5' rx='2.5' fill='var(--primary)' fillOpacity='0.7' />
      <rect x='320' y='255' width='22' height='5' rx='2.5' fill='var(--primary)' fillOpacity='0.4' />
      <rect x='320' y='270' width='22' height='5' rx='2.5' fill='var(--primary)' fillOpacity='0.7' />
      <rect x='320' y='285' width='22' height='5' rx='2.5' fill='var(--primary)' fillOpacity='0.4' />
      <rect x='320' y='300' width='22' height='5' rx='2.5' fill='var(--primary)' fillOpacity='0.7' />
      <circle cx='314' cy='242' r='2' fill='var(--primary)' fillOpacity='0.9' />
      <circle cx='314' cy='257' r='2' fill='var(--primary)' fillOpacity='0.5' />
      <circle cx='314' cy='272' r='2' fill='var(--primary)' fillOpacity='0.9' />
      <circle cx='314' cy='287' r='2' fill='var(--primary)' fillOpacity='0.5' />
      <circle cx='314' cy='302' r='2' fill='var(--primary)' fillOpacity='0.9' />

      {/* Floating 5 - Isometric / Stylized Top Left */}
      <g transform='translate(60, 60)'>
        {/* Number 5 Shape */}
        <path
          d='M90 30H30V75C30 75 45 65 65 65C85 65 98 78 98 98C98 120 80 135 55 135C35 135 22 124 18 112'
          stroke='var(--primary)'
          strokeWidth='16'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeOpacity='0.55'
        />
        <path
          d='M86 26H26V71C26 71 41 61 61 61C81 61 94 74 94 94C94 116 76 131 51 131C31 131 18 120 14 108'
          stroke='var(--primary)'
          strokeWidth='10'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeOpacity='0.25'
        />
      </g>

      {/* Floating First 0 - Center Top */}
      <g transform='translate(233, 20)'>
        <ellipse
          cx='60'
          cy='75'
          rx='35'
          ry='50'
          stroke='var(--primary)'
          strokeWidth='16'
          strokeOpacity='0.6'
        />
        <ellipse
          cx='56'
          cy='72'
          rx='35'
          ry='50'
          stroke='var(--primary)'
          strokeWidth='10'
          strokeOpacity='0.25'
        />
      </g>

      {/* Floating Second 0 - Right Top */}
      <g transform='translate(380, 60)'>
        <ellipse
          cx='60'
          cy='75'
          rx='35'
          ry='50'
          stroke='var(--primary)'
          strokeWidth='16'
          strokeOpacity='0.55'
        />
        <ellipse
          cx='56'
          cy='72'
          rx='35'
          ry='50'
          stroke='var(--primary)'
          strokeWidth='10'
          strokeOpacity='0.25'
        />
      </g>

      {/* Disconnection / Warning Badge Floating in Front */}
      <g transform='translate(263, 195)'>
        {/* Diamond Warning Shield */}
        <path
          d='M30 0L60 30L30 60L0 30Z'
          fill='var(--primary)'
          fillOpacity='0.95'
        />
        <path
          d='M30 6L54 30L30 54L6 30Z'
          stroke='var(--background)'
          strokeWidth='2.5'
        />
        {/* Exclamation Symbol */}
        <path
          d='M30 18V33'
          stroke='var(--background)'
          strokeWidth='4'
          strokeLinecap='round'
        />
        <circle
          cx='30'
          cy='42'
          r='2.5'
          fill='var(--background)'
        />
      </g>

      {/* Broken Signal Waves / Electric Disconnect */}
      <path
        d='M215 150Q240 130 265 145'
        stroke='var(--primary)'
        strokeWidth='3'
        strokeLinecap='round'
        strokeDasharray='4 4'
        strokeOpacity='0.5'
      />
      <path
        d='M320 145Q345 130 370 150'
        stroke='var(--primary)'
        strokeWidth='3'
        strokeLinecap='round'
        strokeDasharray='4 4'
        strokeOpacity='0.5'
      />
      <path
        d='M160 210Q180 195 200 215'
        stroke='var(--primary)'
        strokeWidth='2.5'
        strokeLinecap='round'
        strokeDasharray='3 3'
        strokeOpacity='0.4'
      />
      <path
        d='M385 215Q405 195 425 210'
        stroke='var(--primary)'
        strokeWidth='2.5'
        strokeLinecap='round'
        strokeDasharray='3 3'
        strokeOpacity='0.4'
      />

      {/* Floating tech particles / nodes */}
      <circle cx='130' cy='120' r='3.5' fill='var(--primary)' fillOpacity='0.6' />
      <circle cx='460' cy='120' r='3.5' fill='var(--primary)' fillOpacity='0.6' />
      <circle cx='100' cy='250' r='2.5' fill='var(--primary)' fillOpacity='0.4' />
      <circle cx='490' cy='250' r='2.5' fill='var(--primary)' fillOpacity='0.4' />
      <circle cx='170' cy='90' r='2' fill='var(--primary)' fillOpacity='0.5' />
      <circle cx='420' cy='90' r='2' fill='var(--primary)' fillOpacity='0.5' />
    </svg>
  )
}

export default Icon500
