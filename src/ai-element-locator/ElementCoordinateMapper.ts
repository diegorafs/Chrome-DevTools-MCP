/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {Page} from 'puppeteer-core';

import type {LocatedElement} from './ElementLocator.js';

/**
 * Maps screen coordinates to DOM elements
 */
export interface CoordinateMatch {
  /** The element at the coordinates */
  element: LocatedElement;
  /** Distance from the query point */
  distance: number;
  /** Whether the point is inside the element's bounding box */
  isInside: boolean;
}

/**
 * Maps visual coordinates to DOM elements and provides spatial queries
 */
export class ElementCoordinateMapper {
  private page: Page;
  private elementsCache: LocatedElement[] = [];
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 5000; // 5 seconds

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Find element at specific screen coordinates
   */
  async getElementAtPoint(
    x: number,
    y: number,
    elements?: LocatedElement[],
  ): Promise<CoordinateMatch | null> {
    const elementList = elements || (await this.getElements());

    // Find elements containing the point
    const matches = elementList
      .map(element => {
        const {x: ex, y: ey, width, height} = element.boundingBox;
        const isInside =
          x >= ex && x <= ex + width && y >= ey && y <= ey + height;

        // Calculate distance from center
        const centerX = ex + width / 2;
        const centerY = ey + height / 2;
        const distance = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2),
        );

        return {
          element,
          distance,
          isInside,
        };
      })
      .filter(match => match.isInside);

    if (matches.length === 0) {
      return null;
    }

    // Return the smallest element (most specific)
    matches.sort((a, b) => {
      const areaA = a.element.boundingBox.width * a.element.boundingBox.height;
      const areaB = b.element.boundingBox.width * b.element.boundingBox.height;
      return areaA - areaB;
    });

    return matches[0] || null;
  }

  /**
   * Find all elements within a rectangular region
   */
  async getElementsInRegion(
    x: number,
    y: number,
    width: number,
    height: number,
    elements?: LocatedElement[],
  ): Promise<LocatedElement[]> {
    const elementList = elements || (await this.getElements());

    return elementList.filter(element => {
      const box = element.boundingBox;

      // Check if bounding boxes overlap
      return !(
        box.x + box.width < x ||
        box.x > x + width ||
        box.y + box.height < y ||
        box.y > y + height
      );
    });
  }

  /**
   * Find nearest element to a point
   */
  async getNearestElement(
    x: number,
    y: number,
    maxDistance?: number,
    elements?: LocatedElement[],
  ): Promise<CoordinateMatch | null> {
    const elementList = elements || (await this.getElements());

    const matches = elementList.map(element => {
      const {x: ex, y: ey, width, height} = element.boundingBox;
      const centerX = ex + width / 2;
      const centerY = ey + height / 2;
      const distance = Math.sqrt(
        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2),
      );

      const isInside =
        x >= ex && x <= ex + width && y >= ey && y <= ey + height;

      return {
        element,
        distance,
        isInside,
      };
    });

    // Filter by max distance if specified
    const filtered = maxDistance
      ? matches.filter(m => m.distance <= maxDistance)
      : matches;

    if (filtered.length === 0) {
      return null;
    }

    // Sort by distance
    filtered.sort((a, b) => a.distance - b.distance);

    return filtered[0] || null;
  }

  /**
   * Find elements along a path (useful for drag-and-drop)
   */
  async getElementsAlongPath(
    path: Array<{x: number; y: number}>,
    elements?: LocatedElement[],
  ): Promise<LocatedElement[]> {
    const elementList = elements || (await this.getElements());
    const foundElements = new Set<string>();
    const result: LocatedElement[] = [];

    for (const point of path) {
      const match = await this.getElementAtPoint(point.x, point.y, elementList);
      if (match && !foundElements.has(match.element.uid)) {
        foundElements.add(match.element.uid);
        result.push(match.element);
      }
    }

    return result;
  }

  /**
   * Get spatial relationships between elements
   */
  async getElementRelationships(
    element: LocatedElement,
    elements?: LocatedElement[],
  ): Promise<{
    above: LocatedElement[];
    below: LocatedElement[];
    left: LocatedElement[];
    right: LocatedElement[];
    overlapping: LocatedElement[];
  }> {
    const elementList = elements || (await this.getElements());
    const box = element.boundingBox;
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    const relationships = {
      above: [] as LocatedElement[],
      below: [] as LocatedElement[],
      left: [] as LocatedElement[],
      right: [] as LocatedElement[],
      overlapping: [] as LocatedElement[],
    };

    for (const other of elementList) {
      if (other.uid === element.uid) continue;

      const otherBox = other.boundingBox;
      const otherCenterX = otherBox.x + otherBox.width / 2;
      const otherCenterY = otherBox.y + otherBox.height / 2;

      // Check for overlap
      const overlaps = !(
        box.x + box.width < otherBox.x ||
        box.x > otherBox.x + otherBox.width ||
        box.y + box.height < otherBox.y ||
        box.y > otherBox.y + otherBox.height
      );

      if (overlaps) {
        relationships.overlapping.push(other);
        continue;
      }

      // Determine direction
      const horizontalDist = Math.abs(centerX - otherCenterX);
      const verticalDist = Math.abs(centerY - otherCenterY);

      if (verticalDist > horizontalDist) {
        // Vertical relationship
        if (otherCenterY < centerY) {
          relationships.above.push(other);
        } else {
          relationships.below.push(other);
        }
      } else {
        // Horizontal relationship
        if (otherCenterX < centerX) {
          relationships.left.push(other);
        } else {
          relationships.right.push(other);
        }
      }
    }

    // Sort by distance
    const sortByDistance = (arr: LocatedElement[], refX: number, refY: number) => {
      arr.sort((a, b) => {
        const aCenterX = a.boundingBox.x + a.boundingBox.width / 2;
        const aCenterY = a.boundingBox.y + a.boundingBox.height / 2;
        const bCenterX = b.boundingBox.x + b.boundingBox.width / 2;
        const bCenterY = b.boundingBox.y + b.boundingBox.height / 2;

        const distA = Math.sqrt(
          Math.pow(aCenterX - refX, 2) + Math.pow(aCenterY - refY, 2),
        );
        const distB = Math.sqrt(
          Math.pow(bCenterX - refX, 2) + Math.pow(bCenterY - refY, 2),
        );

        return distA - distB;
      });
    };

    sortByDistance(relationships.above, centerX, centerY);
    sortByDistance(relationships.below, centerX, centerY);
    sortByDistance(relationships.left, centerX, centerY);
    sortByDistance(relationships.right, centerX, centerY);

    return relationships;
  }

  /**
   * Convert viewport coordinates to page coordinates
   */
  async viewportToPageCoordinates(
    x: number,
    y: number,
  ): Promise<{x: number; y: number}> {
    return this.page.evaluate(
      (vx: number, vy: number) => {
        return {
          x: vx + window.scrollX,
          y: vy + window.scrollY,
        };
      },
      x,
      y,
    );
  }

  /**
   * Get or update elements cache
   */
  private async getElements(): Promise<LocatedElement[]> {
    const now = Date.now();
    if (
      this.elementsCache.length === 0 ||
      now - this.cacheTimestamp > this.CACHE_TTL
    ) {
      // This would typically call ElementLocator.extractElementsWithVisualData()
      // For now, returning cached elements
      this.cacheTimestamp = now;
    }
    return this.elementsCache;
  }

  /**
   * Update the elements cache manually
   */
  updateCache(elements: LocatedElement[]): void {
    this.elementsCache = elements;
    this.cacheTimestamp = Date.now();
  }

  /**
   * Clear the elements cache
   */
  clearCache(): void {
    this.elementsCache = [];
    this.cacheTimestamp = 0;
  }
}
