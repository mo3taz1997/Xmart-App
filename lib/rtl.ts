/**
 * Bulletproof RTL helpers — import these everywhere instead of
 * writing `isRTL ? 'row-reverse' : 'row'` inline.
 *
 * Rule: NEVER hardcode 'row', 'left', 'right', 'rtl', 'ltr' in layout styles.
 *       Always use these helpers so RTL behaviour is consistent app-wide.
 */

/** flexDirection — row or row-reverse */
export const row = (isRTL: boolean): 'row' | 'row-reverse' =>
  isRTL ? 'row-reverse' : 'row';

/** textAlign — right for RTL, left for LTR */
export const textAlign = (isRTL: boolean): 'right' | 'left' =>
  isRTL ? 'right' : 'left';

/** writingDirection for Text nodes */
export const writingDir = (isRTL: boolean): 'rtl' | 'ltr' =>
  isRTL ? 'rtl' : 'ltr';

/** CSS-style direction for View containers */
export const dir = (isRTL: boolean): 'rtl' | 'ltr' =>
  isRTL ? 'rtl' : 'ltr';

/** paddingStart / paddingEnd equivalents as left/right (React Native doesn't have logical props) */
export const paddingStart = (isRTL: boolean, value: number) =>
  isRTL ? { paddingRight: value } : { paddingLeft: value };

export const paddingEnd = (isRTL: boolean, value: number) =>
  isRTL ? { paddingLeft: value } : { paddingRight: value };

export const marginStart = (isRTL: boolean, value: number) =>
  isRTL ? { marginRight: value } : { marginLeft: value };

export const marginEnd = (isRTL: boolean, value: number) =>
  isRTL ? { marginLeft: value } : { marginRight: value };

/** Flip a horizontal scroll position when RTL is active */
export const scrollX = (isRTL: boolean, index: number, itemWidth: number) =>
  isRTL ? -(index * itemWidth) : index * itemWidth;
