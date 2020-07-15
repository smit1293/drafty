import { tableElement, tableScrollContainer } from "../../dom/sheet";
import { getViewportWidth, getViewportHeight } from "../../utils/length";


export function placeElementInViewport(element: HTMLElement, x: number, y: number) {
  const { width: elementWidth, height: elementHeight } = element.getBoundingClientRect();
  // horizontal alignment
  const viewportWidth = getViewportWidth();
  if (x + elementWidth < viewportWidth) {
    // the element can be placed where its left is x
    element.style.left = `${x}px`;
  } else if (x - elementWidth >= 0) {
    // the element can be placed where its right is x
    element.style.left = `${x - elementWidth}px`;
  } else {
    // the element will be placed where its right is at the right of the viewport
    element.style.left = `${viewportWidth - elementWidth}px`;
  }

  // vertical alignment
  const viewportHeight = getViewportHeight();
  if (y + elementHeight < viewportHeight) {
    // the element can be placed where its top is y
    element.style.top = `${y}px`;
  } else if (y - elementHeight >= 0) {
    // the element can be placed where its bottom is y
    element.style.top = `${y - elementHeight}px`;
  } else {
    // the element will be placed where its bottom is at the bottom of the viewport
    element.style.top = `${viewportHeight - elementHeight}px`;
  }
}


/**
 * Align an element horizontally with respect to targetElement (either align to the left border or right border of targetElement.
 *
 * If the element can be aligned after scrolling the container, viewport will be adjusted.
 *
 * NOTE: This method works for elements inside tableScrollContainer.
 *
 * @param {HTMLElement} element - The element to be aligned.
 * @param {DOMRect} targetDimensions - The result of running getBoundingClientRect() on the element to align against.
 */
export function alignElementHorizontally(element: HTMLElement, targetDimensions: DOMRect) {

  const {left: leftLimit, right: rightLimit} = tableElement.getBoundingClientRect();
  let {left: targetLeft, right: targetRight} = targetDimensions;
  const elementWidth: number = element.getBoundingClientRect().width;

  const verticalScrollBarWidth = tableScrollContainer.offsetWidth - tableScrollContainer.clientWidth;
  const viewportWidth = getViewportWidth() - verticalScrollBarWidth;

  /**
   * set horizontal placement
   * two choices for horizontal placement
   *   1. left border of form stick to left border of target cell
   *     This option should be picked when right side of the form does not exceed table element's right bound (rightLimit)
   *   2. right border of form stick to right border of target cell
   *     This option should be picked when the first option isn't available and the left side of the form does not exceed table element's left bound (leftLimit)
   */
  let elementLeft: number;
   if (targetLeft + elementWidth <= rightLimit) {
     // option 1
     if (targetLeft < 0) {
       // left border the form is to the left of viewport
       const leftShiftAmount: number = -targetLeft;
       targetLeft += leftShiftAmount;
       tableScrollContainer.scrollLeft -= leftShiftAmount;
     } else if (targetLeft + elementWidth > viewportWidth) {
       // right border of the form is to the right of viewport
       const rightShiftAmount: number = targetLeft + elementWidth - viewportWidth;
       targetLeft -= rightShiftAmount;
       tableScrollContainer.scrollLeft += rightShiftAmount;
     }
     elementLeft = targetLeft;
   } else if (targetRight - elementWidth >= leftLimit) {
     // option 2
     if (targetRight > viewportWidth) {
       // right border of the form is to the right of viewport
       const rightShiftAmount: number = targetRight - viewportWidth;
       targetRight -= rightShiftAmount;
       tableScrollContainer.scrollLeft += rightShiftAmount;
     } else if (targetRight - elementWidth < 0) {
       // left border of the form is to the left left of viewport
       const leftShiftAmount: number = elementWidth - targetRight;
       targetRight += leftShiftAmount;
       tableScrollContainer.scrollLeft -= leftShiftAmount;
     }
     elementLeft = targetRight - elementWidth;
   }

   element.style.left = `${elementLeft}px`;
}