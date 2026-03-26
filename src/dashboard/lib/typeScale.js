// Golden Ratio Type Scale (φ = 1.618)
// Base: 16px. Steps: multiply/divide by φ, rounded to whole px.
// Import these constants instead of hardcoding font sizes.

export const TYPE = {
  '2xs': 9,    // badges, tiny labels
  xs:    10,   // meta text, small caps
  sm:    12,   // role labels, timestamps, mono
  base:  14,   // body text, chat messages
  md:    16,   // default body, input text
  lg:    20,   // agent names, card titles
  xl:    26,   // section headers, featured names
  '2xl': 34,   // page titles
  '3xl': 42,   // display/hero
}

export const LH = {
  tight: 1.2,
  body:  1.5,
  loose: 1.7,
}

export const LS = {
  tight:  '-0.02em',
  normal: '0',
  wide:   '0.04em',
  caps:   '0.08em',
  mega:   '0.12em',
}
