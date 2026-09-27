/**
 * Locally drawn hero illustration for the Free Pizza event.
 *
 * Deliberately a flat SVG composition rather than a photograph: the prototype
 * has to render with zero network image requests.
 */
export function EventHeroArt() {
  return (
    <svg
      viewBox="0 0 386 186"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      role="img"
      aria-label="Illustration of a pizza box in front of a Columbia University banner"
    >
      <defs>
        <linearGradient id="hero-room" x1="0" y1="0" x2="0.15" y2="1">
          <stop offset="0" stopColor="#E0D5C6" />
          <stop offset="0.55" stopColor="#C9B9A4" />
          <stop offset="1" stopColor="#A8927B" />
        </linearGradient>
        <linearGradient id="hero-banner" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#153B6E" />
          <stop offset="1" stopColor="#06203F" />
        </linearGradient>
        <linearGradient id="hero-crust" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor="#EFBC70" />
          <stop offset="1" stopColor="#CE8F41" />
        </linearGradient>
        <linearGradient id="hero-cheese" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#FCDC92" />
          <stop offset="1" stopColor="#F0BE62" />
        </linearGradient>
        <linearGradient id="hero-hand" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#1A1A1A" />
          <stop offset="1" stopColor="#000000" />
        </linearGradient>
        <filter id="hero-blur" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="11" />
        </filter>
        <filter id="hero-soft" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>

      <rect width="386" height="186" fill="url(#hero-room)" />

      {/* Out-of-focus interior behind the banner */}
      <g filter="url(#hero-blur)" opacity="0.85">
        <rect x="-20" y="-20" width="150" height="150" rx="24" fill="#EAE1D2" />
        <circle cx="60" cy="16" r="40" fill="#D6CCBB" />
        <rect x="120" y="-30" width="120" height="86" rx="22" fill="#CFC2AE" />
        <circle cx="362" cy="18" r="46" fill="#D9CDBA" />
        <rect x="-20" y="108" width="426" height="100" fill="#A18C76" />
      </g>

      {/* Columbia banner */}
      <g transform="rotate(-1 286 66)">
        <rect x="206" y="2" width="164" height="124" rx="2" fill="url(#hero-banner)" />
        <rect x="206" y="2" width="164" height="124" rx="2" fill="#061C39" opacity="0.2" />
        <g fill="#E8EFF9" opacity="0.92">
          {/* Simplified academic crown, not the official crest */}
          <path d="M275 36h26l-3.3 12h-19.4z" />
          <path d="M275 36l-4.7-8.8 6.6 2.8 4.8-7.6 4.8 7.6 6.6-2.8-4.7 8.8z" />
          <circle cx="269.6" cy="26" r="2" />
          <circle cx="281" cy="20.4" r="2" />
          <circle cx="291" cy="20.4" r="2" />
          <circle cx="302.4" cy="26" r="2" />
        </g>
        <text
          x="288"
          y="74"
          textAnchor="middle"
          fill="#EEF3FB"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="18"
          letterSpacing="1.5"
        >
          COLUMBIA
        </text>
        <text
          x="288"
          y="96"
          textAnchor="middle"
          fill="#EEF3FB"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="18"
          letterSpacing="1.5"
        >
          UNIVERSITY
        </text>
      </g>

      {/* Open pizza box */}
      <g>
        <path d="M-40 120 L176 104 L330 132 L360 200 L-60 200 Z" fill="#E2CCA8" />
        <path d="M-40 120 L176 104 L330 132 L322 152 L166 126 L-26 142 Z" fill="#D2B78C" />
        <path d="M120 100 L268 92 L288 120 L136 124 Z" fill="#EEDCBD" opacity="0.65" />
      </g>

      {/* Pizza filling the lower-left of the frame */}
      <g>
        <ellipse cx="150" cy="186" rx="148" ry="72" fill="url(#hero-crust)" />
        <ellipse cx="150" cy="184" rx="132" ry="60" fill="#F3C36C" />
        <ellipse cx="150" cy="184" rx="124" ry="54" fill="url(#hero-cheese)" />
        <g fill="#C33C26">
          <ellipse cx="66" cy="164" rx="14" ry="8.6" />
          <ellipse cx="132" cy="150" rx="15" ry="9.2" />
          <ellipse cx="204" cy="164" rx="14.5" ry="8.8" />
          <ellipse cx="96" cy="196" rx="14" ry="8.2" />
          <ellipse cx="170" cy="198" rx="14" ry="8.2" />
          <ellipse cx="246" cy="186" rx="12.5" ry="7.6" />
          <ellipse cx="24" cy="190" rx="12.5" ry="7.6" />
        </g>
        <g fill="#DE6440" opacity="0.5">
          <ellipse cx="66" cy="161" rx="9" ry="5" />
          <ellipse cx="132" cy="147" rx="9.5" ry="5.2" />
          <ellipse cx="204" cy="161" rx="9" ry="5" />
        </g>
        {/* Slice cuts */}
        <g stroke="#E0A951" strokeWidth="1.6" opacity="0.55" fill="none">
          <path d="M150 184 L34 156" />
          <path d="M150 184 L118 128" />
          <path d="M150 184 L206 130" />
          <path d="M150 184 L268 158" />
        </g>
      </g>

      {/* Cheese pull from the pizza up to the lifted slice */}
      <path
        d="M104 120 q4 24 -2 40 M134 118 q6 22 0 38 M156 126 q4 18 -2 32"
        stroke="#F4CB7C"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        opacity="0.9"
      />

      {/* Slice being lifted out of the box */}
      <g transform="rotate(-11 118 96)">
        <path d="M46 68 L176 104 L54 136 Z" fill="url(#hero-crust)" />
        <path d="M56 76 L160 104 L62 128 Z" fill="url(#hero-cheese)" />
        <ellipse cx="104" cy="102" rx="11" ry="7" fill="#C33C26" />
        <ellipse cx="136" cy="103" rx="8.6" ry="5.6" fill="#C33C26" />
        <ellipse cx="80" cy="100" rx="7.6" ry="5" fill="#C33C26" />
      </g>

      {/* Hand holding the slice */}
      <g filter="url(#hero-soft)">
        <path
          d="M-40 74 q50 -10 82 10 q18 12 10 30 q-10 22 -40 20 q-38 -3 -60 -18 Z"
          fill="url(#hero-hand)"
        />
        <path d="M4 76 q28 -2 44 14" stroke="#000000" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <path
          d="M-4 96 q28 -2 42 12"
          stroke="#111111"
          strokeWidth="2.6"
          fill="none"
          strokeLinecap="round"
          opacity="0.7"
        />
      </g>
    </svg>
  );
}
