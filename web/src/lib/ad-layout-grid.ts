/**
 * 12-column layout grid for 1080×1080 ad posts.
 * Text lives only in header + footer bands — never in the product zone.
 */

import type { AdTemplate } from "@/lib/ad-templates";
import type { LayoutProfile } from "@/lib/ad-category";

export const AD_SIZE = 1080;
export const GRID_COLUMNS = 12;
export const GRID_MARGIN = 48;
export const GRID_GUTTER = 24;

export function colWidth(): number {
  const inner = AD_SIZE - GRID_MARGIN * 2;
  return (inner - GRID_GUTTER * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
}

export function gridX(col: number): number {
  return GRID_MARGIN + col * (colWidth() + GRID_GUTTER);
}

export function gridSpanWidth(span: number): number {
  return span * colWidth() + (span - 1) * GRID_GUTTER;
}

export type ProductBounds = {
  centerX: number;
  centerY: number;
  maxWidth: number;
  maxHeight: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type AdLayoutZones = {
  header: { top: number; height: number; bottom: number };
  product: ProductBounds;
  cta: {
    top: number;
    height: number;
    width: number;
    bottom: number;
    centerX: number;
    centerY: number;
  };
  badge: {
    left: number;
    top: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  } | null;
  headline: { x: number; y: number; maxWidth: number };
  subheadline: { x: number; y: number; maxWidth: number };
};

export function computeLayoutZones(
  template: AdTemplate,
  profile: LayoutProfile,
  hasBadge: boolean,
): AdLayoutZones {
  const headerHeight = profile.headerHeight;
  const ctaHeight = template.cta.height;
  const ctaBottom = template.cta.bottom;
  const ctaTop = AD_SIZE - ctaBottom - ctaHeight;
  const ctaWidth = template.cta.width;

  const productCenterY = AD_SIZE * profile.productCenterY;
  const maxWidth = AD_SIZE * profile.productMaxWidthRatio;
  const maxHeight = profile.productZoneBottom - profile.productZoneTop;

  const productTop = productCenterY - maxHeight / 2;
  const productBottom = productCenterY + maxHeight / 2;
  const productLeft = (AD_SIZE - maxWidth) / 2;
  const productRight = productLeft + maxWidth;

  const badgeLeft = AD_SIZE - template.badge.right - template.badge.width;
  const badgeTop = template.badge.top;

  const headlineMaxW = hasBadge
    ? badgeLeft - GRID_MARGIN - GRID_GUTTER
    : gridSpanWidth(10);

  const headerMid = headerHeight / 2;

  return {
    header: {
      top: 0,
      height: headerHeight,
      bottom: headerHeight,
    },
    product: {
      centerX: AD_SIZE / 2,
      centerY: productCenterY,
      maxWidth,
      maxHeight,
      top: productTop,
      bottom: productBottom,
      left: productLeft,
      right: productRight,
    },
    cta: {
      top: ctaTop,
      height: ctaHeight,
      width: ctaWidth,
      bottom: AD_SIZE - ctaBottom,
      centerX: AD_SIZE / 2,
      centerY: ctaTop + ctaHeight / 2,
    },
    badge: hasBadge
      ? {
          left: badgeLeft,
          top: badgeTop,
          width: template.badge.width,
          height: template.badge.height,
          centerX: badgeLeft + template.badge.width / 2,
          centerY: badgeTop + template.badge.height / 2,
        }
      : null,
    headline: {
      x: AD_SIZE / 2,
      y: headerMid - 32,
      maxWidth: headlineMaxW,
    },
    subheadline: {
      x: AD_SIZE / 2,
      y: headerMid + 36,
      maxWidth: gridSpanWidth(10),
    },
  };
}

/** Verify text Y coordinate is outside the product safe zone. */
export function isTextSafe(y: number, zones: AdLayoutZones): boolean {
  const inHeader = y < zones.header.bottom - 8;
  const inCta = y > zones.cta.top + 8;
  return inHeader || inCta;
}
