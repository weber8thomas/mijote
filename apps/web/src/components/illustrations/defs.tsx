// Filtres aquarelle partagés : rendus une seule fois à la racine de l'app,
// référencés par toutes les illustrations via url(#wc-…).
// Coût maîtrisé : une seule feTurbulence (2 octaves) par filtre, flous courts.
export function WatercolorDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
      <defs>
        {/* Lavis : bords organiques déplacés, pigment irrégulier, liseré plus foncé là où l'eau sèche. */}
        <filter id="wc-wash" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={4} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={5} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={0.3} result="s" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1.8 0 -0.04" result="m" />
          <feComposite in="s" in2="m" operator="in" result="p" />
          <feGaussianBlur in="d" stdDeviation={1.6} result="b" />
          <feComposite in="s" in2="b" operator="out" result="r" />
          <feColorMatrix in="r" type="matrix" values="0.62 0 0 0 0  0 0.56 0 0 0  0 0 0.54 0 0  0 0 0 0.9 0" result="e" />
          <feMerge>
            <feMergeNode in="p" />
            <feMergeNode in="e" />
          </feMerge>
        </filter>
        {/* Lavis doux : reflets et glacis, sans liseré. */}
        <filter id="wc-soft" x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves={2} seed={9} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={4} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={0.9} />
        </filter>
        {/* Bord pigmenté accentué (optionnel, pour un contour plus marqué). */}
        <filter id="wc-edge" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={4} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={5} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={1.2} result="b" />
          <feComposite in="d" in2="b" operator="out" result="r" />
          <feColorMatrix in="r" type="matrix" values="0.6 0 0 0 0  0 0.55 0 0 0  0 0 0.55 0 0  0 0 0 1.4 0" />
        </filter>
        {/* Trait à l'encre / crayon : léger tremblé de la main. */}
        <filter id="wc-ink" filterUnits="userSpaceOnUse" x="-10" y="-10" width="140" height="140">
          <feTurbulence type="fractalNoise" baseFrequency="0.11" numOctaves={2} seed={2} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={1.8} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* Grain du papier : fines taches de pigment, uniquement dans la peinture. */}
        <filter id="wc-grain" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={11} result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0.29  0 0 0 0 0.22  0 0 0 0 0.16  -2.6 0 0 0 0.95" result="k" />
          <feComposite in="k" in2="SourceAlpha" operator="in" result="t" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="t" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}
