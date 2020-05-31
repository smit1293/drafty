import { activeClass, activeAccompanyClass, copiedClass, invalidClass } from "./modules/constants/css-classes";
import "./modules/components/welcome-screen";
import { hasCopyModifier, clearCopyBuffer, copyCurrentSelectionToCopyBuffer, copyTextToCopyBuffer, copyCopyBuffer } from "./modules/utils/copy";
import { hasTextSelected} from "./modules/utils/selection";
import { getViewportWidth, getViewportHeight, measureTextWidth } from "./modules/utils/length";
import { getLeftTableCellElement, getRightTableCellElement, getUpTableCellElement, getDownTableCellElement } from "./modules/dom/navigate";
import { isTableData, isTableHead, isTableCell, isTableBody, isInput, isTemplate } from "./modules/dom/types";
import { fuseSelect, initializeFuseSelect, updateFuseSelect } from "./modules/components/sheet/suggestions";
import { recordCellEdit, recordCellClick, recordCellDoubleClick, recordCellCopy, recordColumnCopy, recordColumnSearch, recordColumnSort } from "./modules/api/record-interactions";
import { tableElement, tableColumnLabels, isColumnAutocompleteOnly, getColumnLabel, getTableDataText, tableScrollContainer, getLongestColumnTextWidth, getColumnLabelSortButton, isColumnLabelSortButton, getTableCellText, getTableCellTextsInColumn, isColumnSearchInput, isTableCellEditable, getColumnSearchInput, isColumnLabel, isFirstTableCell, isLastTableCell, isColumnSearch, getTableCellElementsInColumn, getColumnSearch, getTableColElement, isColumnSearchInputFocused, getColumnLabelText, tableRowHeight } from "./modules/dom/sheet";
import { getMinimumColumnWidth, updateTableColumnSearchWidth, updateTableCellWidth } from "./modules/components/sheet/column-width";
import { getIdSuggestion, getIdSuggestionType } from "./modules/api/record-interactions";


// TODO ARROW KEY not functioning when scrolling off screen
// TODO add new row

/* which table column is active: a table column is activated when associated head is clicked */
let activeTableColElement: null | HTMLTableColElement = null;

function isSortPanelSorterOrderButton(element: HTMLElement): boolean {
  return element && element.classList.contains("column-sorter-order");
}
function isSortPanelSorterDeleteButton(element: HTMLElement): boolean {
  return element && element.classList.contains("column-sorter-delete");
}
const descendingClass: string = "desc";
function isDescendingSorted(element: HTMLElement): boolean {
  return element && element.classList.contains(descendingClass);
}
const columnSorterColumnSelectClass: string = "column-sorter-column-select";
function isColumnSorterColumnSelect(element: HTMLElement): boolean {
  return element && element.classList.contains(columnSorterColumnSelectClass);
}
const columnSorterReorderGripClass = "column-sorter-reorder-grip";
function isColumnSorterReorderGrip(element: HTMLElement): boolean {
  return element && element.classList.contains(columnSorterReorderGripClass);
}


function getOffsetFromPageTop(element: HTMLElement): number {
  let offset = 0;
  while (element.offsetParent) {
    offset += element.offsetTop;
    element = element.offsetParent as HTMLElement;
  }
  return offset;
}


function getColumnIndexFromColumnSorterContainer(columnSorterContainer: HTMLElement): number {
  return Number.parseInt(columnSorterContainer.dataset.columnIndex);
}
const tableColumnSortPanelColumnSorterClass: string = "column-sorter";
function getColumnSorterContainerFromChildElement(childElement: HTMLElement): HTMLElement {
  return childElement.closest(`.${tableColumnSortPanelColumnSorterClass}`);
}


// input editor
/* input editor element */
const tableCellInputFormElement: HTMLFormElement = document.getElementById("table-cell-input-form") as HTMLFormElement;
function isTableCellInputFormActive() {
  return tableCellInputFormElement.classList.contains(activeClass);
}
/* the input element in the input editor */
const tableCellInputFormInputElement: HTMLInputElement = document.getElementById("table-cell-input-entry") as HTMLInputElement;
const tableCellInputFormInputInvalidFeedbackElement: HTMLInputElement = document.getElementById("table-cell-input-feedback") as HTMLInputElement;
const tableCellInputFormInputSaveButtonElement: HTMLButtonElement = document.getElementById("table-cell-input-save") as HTMLButtonElement;
/* the target element the input editor is associated with */

// input editor location
/* the location element */
const tableCellInputFormLocateCellElement: HTMLButtonElement = document.getElementById("locate-cell") as HTMLButtonElement;
/* the row index element in the location element */
const tableCellInputFormLocateCellRowElement: HTMLSpanElement = document.getElementById("locate-cell-associated-row") as HTMLSpanElement;
/* the column index element in the location element */
const tableCellInputFormLocateCellColElement: HTMLSpanElement = document.getElementById("locate-cell-associated-col") as HTMLSpanElement;
/* whether the location element is shown in the input editor */
let tableCellInputFormLocationActive: boolean = false;

const tableCellInputFormInputContainer: HTMLElement = tableCellInputFormLocateCellElement.parentElement;

function activateInvalidFeedback(invalidFeedback: string) {
  tableCellInputFormInputInvalidFeedbackElement.textContent = invalidFeedback;
  tableCellInputFormInputInvalidFeedbackElement.classList.add(activeClass);
  tableCellInputFormInputElement.classList.add(invalidClass);
}
function deactivateInvalidFeedback() {
  tableCellInputFormInputInvalidFeedbackElement.textContent = "";
  tableCellInputFormInputInvalidFeedbackElement.classList.remove(activeClass);
  tableCellInputFormInputElement.classList.remove(invalidClass);
}

function verifyEdit(edit: string, tableCellElement: HTMLTableCellElement): boolean {
  if (isColumnAutocompleteOnly(getColumnLabel(tableCellElement.cellIndex))) {
    if (fuseSelect.hasAutocompleteSuggestion(edit)) {
      deactivateInvalidFeedback();
    } else {
      activateInvalidFeedback("Value must from Completions");
      return false;
    }
  }
  return true;
}

/**
 * Updates the text inside the input element inside the input editor and resizes the input eidtor properly.
 *
 * @param {HTMLTableCellElement} targetHTMLTableCellElement - Target HTMLTableCellElement to associate the input editor with.
 * @param {string} input - The text to initialize the input element with.
 */
function updateTableCellInputFormInput(targetHTMLTableCellElement: HTMLTableCellElement, input?: string) {
  const text = input === undefined ? getTableDataText(targetHTMLTableCellElement): input;
  tableCellInputFormInputElement.value = text;

  // resize
  const minWidth = targetHTMLTableCellElement.offsetWidth;
  const resizeWidth = measureTextWidth(text) + 120 + 24;
  const width = Math.max(minWidth, resizeWidth);
  tableCellInputFormElement.style.width = `${width}px`;
}
function updateTableCellInputFormWidthToFitText(textToFit: string) {
  const textWidth = measureTextWidth(textToFit);
  const slack = 124;
  const newWidth = textWidth + slack;

  const formWidth = tableCellInputFormElement.offsetWidth;
  if (newWidth > formWidth) {
    tableCellInputFormElement.style.width = `${newWidth}px`;
  }
}

  // if(tableCellInputFormInputElement.value.length === 2) {
  //   if(tableCellInputFormInputElement.value.charAt(0) === tableCellInputFormInputElement.value.charAt(1)) {
  //     tableCellInputFormInputElement.value = tableCellInputFormInputElement.value.charAt(0);
  //   }
  // }

/* visual cue during resize */
function initializeResizeVisualCue() {
  const visualCue = document.createElement("div");
  visualCue.id = "resize-visual-cue";
  tableScrollContainer.appendChild(visualCue);
  return visualCue;
}
const resizeVisualCue: HTMLElement = initializeResizeVisualCue();
function resizeVisualCueMininumX(tableCellElement: HTMLTableCellElement) {
  const elementLeft = tableCellElement.getBoundingClientRect().left;
  const index = tableCellElement.cellIndex;
  return elementLeft + getMinimumColumnWidth(index);
}
function repositionResizeVisualCue(newXPos: number) {
  resizeVisualCue.style.left = `${newXPos}px`;
}
function updateResizeVisualCuePosition(tableCellElement: HTMLTableCellElement, newXPos: number, nearLeftBorder?: boolean) {
  let minX: number;
  if (nearLeftBorder) {
    minX = resizeVisualCueMininumX(getLeftTableCellElement(tableCellElement));
  } else {
    // near right border
    minX = resizeVisualCueMininumX(tableCellElement);
  }

  repositionResizeVisualCue(Math.max(minX, newXPos));
}
function activateResizeVisualCue() {
  resizeVisualCue.classList.add(activeClass);
}
function deactivateResizeVisualCue() {
  resizeVisualCue.classList.remove(activeClass);
}

// events
const tableColumnSortPanel: HTMLElement = document.getElementById("table-column-sort-panel");
const tableColumnSortPanelColumnSorterContainers: HTMLCollection = tableColumnSortPanel.getElementsByTagName("div");
const tableColumnSortPanelColumnSorterContainerTemplate: HTMLTemplateElement = tableColumnSortPanel.firstElementChild as HTMLTemplateElement;
(tableColumnSortPanelColumnSorterContainerTemplate.content.querySelector(`.${columnSorterColumnSelectClass}`) as HTMLElement).style.width = `${getLongestColumnTextWidth() + 50}px`;

function modifyColumnSorterContainer(container: HTMLElement, columnIndex: number, containerIndex: number) {
  container.dataset.columnIndex = columnIndex.toString();

  const sortbyText = containerIndex === 0 ? "Sort by" : "Then by";
  container.querySelector(".column-sorter-sortby-text").textContent = sortbyText;

  const columnLabel = getColumnLabel(columnIndex);
  const columnLabelSortButton = getColumnLabelSortButton(columnLabel);
  if (isDescendingSorted(columnLabelSortButton)) {
    container.querySelector(".column-sorter-order").classList.add(descendingClass);
  }

  const columnSorterColumnSelect: HTMLSelectElement = container.querySelector(`.${columnSorterColumnSelectClass}`);
  columnSorterColumnSelect.selectedIndex = columnIndex;
}
function updateSorterBasedOnSortPanel() {
  const ordering: Map<number, number> = new Map();

  let order = 0;
  for (const columnSorterContainer of tableColumnSortPanelColumnSorterContainers) {
    const columnIndex: number = getColumnIndexFromColumnSorterContainer(columnSorterContainer as HTMLElement);
    ordering.set(columnIndex, order);

    columnSorterContainer.querySelector(".column-sorter-sortby-text").textContent = order === 0? "Sort by" : "Then by";

    order++;
  }

  tableDataManager.reorderSorter(ordering);
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
function alignElementHorizontally(element: HTMLElement, targetDimensions: DOMRect) {

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
function activateSortPanel(targetElement: HTMLElement) {
  // show sort panel
  tableColumnSortPanel.classList.add(activeClass);

  // patch sort panel
  const sorters = Array.from(tableDataManager.getSorters());
  sorters.sort((s1, s2) => s1[1].order - s2[1].order);
  const numSorter: number = sorters.length;

  let sorterContainerIndex = 0;
  for (const columnSorterContainer of tableColumnSortPanelColumnSorterContainers) {
    if (sorterContainerIndex < numSorter) {
      const columnIndex: number = sorters[sorterContainerIndex][0];
      modifyColumnSorterContainer(columnSorterContainer as HTMLElement, columnIndex, sorterContainerIndex);
    } else {
      columnSorterContainer.remove();
    }
    sorterContainerIndex++;
  }

  for (; sorterContainerIndex < numSorter; sorterContainerIndex++) {
    const templateContainer = tableColumnSortPanelColumnSorterContainerTemplate.content.firstElementChild;
    const columnSorterContainer = templateContainer.cloneNode(true) as HTMLElement;
    const columnIndex: number = sorters[sorterContainerIndex][0];
    modifyColumnSorterContainer(columnSorterContainer, columnIndex, sorterContainerIndex);
    tableColumnSortPanel.appendChild(columnSorterContainer);
  }

  // position sort panel
  const targetDimensions = targetElement.getBoundingClientRect();
  alignElementHorizontally(tableColumnSortPanel, targetDimensions);
  tableColumnSortPanel.style.top = `${targetDimensions.bottom}px`;
}
function deactivateSortPanel() {
  tableColumnSortPanel.classList.remove(activeClass);
}
function sortPanelSorterOrderButtonOnClick(sorterOrderButton: HTMLElement) {
  const columnIndex = getColumnIndexFromColumnSorterContainer(getColumnSorterContainerFromChildElement(sorterOrderButton));
  if (isDescendingSorted(sorterOrderButton)) {
      // ascending sort
      sorterOrderButton.classList.remove(descendingClass);
      changeColumnSorterSortOrder(columnIndex);
  } else {
      // descending sort
      sorterOrderButton.classList.add(descendingClass);
      changeColumnSorterSortOrder(columnIndex);
  }
}
function sortPanelSorterDeleteButtonOnClick(sorterDeleteButton: HTMLElement) {
  const columnSorterContainer: HTMLElement = getColumnSorterContainerFromChildElement(sorterDeleteButton);
  const columnIndex = getColumnIndexFromColumnSorterContainer(columnSorterContainer);
  deleteColumnSorter(columnIndex, true);
  columnSorterContainer.remove();

  if (tableColumnSortPanelColumnSorterContainers.length === 0) {
    deactivateSortPanel();
  }
}
// click event handler
tableColumnSortPanel.addEventListener("click", function(event: MouseEvent) {
  const target: HTMLElement = event.target as HTMLElement;
  if (isSortPanelSorterOrderButton(target)) {
    sortPanelSorterOrderButtonOnClick(target);
  } else if (isSortPanelSorterDeleteButton(target)) {
    sortPanelSorterDeleteButtonOnClick(target);
  }
  event.preventDefault();
  event.stopPropagation();
}, true);
// change (select value change) event handler
function sortPanelColumnSelectOnChange(selectElement: HTMLSelectElement, event: Event) {
  const columnSorterContainer = getColumnSorterContainerFromChildElement(selectElement);
  const columnIndex: number = getColumnIndexFromColumnSorterContainer(columnSorterContainer);
  deleteColumnSorter(columnIndex, true);

  const selectedIndex = selectElement.selectedIndex;
  setColumnSorter(selectedIndex);
  columnSorterContainer.dataset.columnIndex = selectedIndex.toString();
}

tableColumnSortPanel.addEventListener("change", function(event: Event) {
  const target = event.target as HTMLElement;
  if (isColumnSorterColumnSelect(target)) {
    sortPanelColumnSelectOnChange(target as HTMLSelectElement, event);
  } else {
    event.preventDefault();
  }

  event.stopPropagation();
}, true);
// mouse event handlers
let activeColumnSorterReorderGrip: HTMLElement = undefined;
function activateColumnSorterReorderGrip(element: HTMLElement) {
  element.classList.add(activeClass);
  activeColumnSorterReorderGrip = element;
}
function deactivateColumnSorterReorderGrip(event: MouseEvent) {
  if (activeColumnSorterReorderGrip) {
    const {clientX: x, clientY: y} = event;
    const elementAtPoint = document.elementFromPoint(x, y) as HTMLElement;
    if (elementAtPoint) {
      const columnSorterContainer = getColumnSorterContainerFromChildElement(elementAtPoint);
      const {top, bottom} = columnSorterContainer.getBoundingClientRect();
      if (columnSorterContainer) {
        const initialColumnSorterContainer = getColumnSorterContainerFromChildElement(activeColumnSorterReorderGrip);

        let insertBefore: boolean;
        if (columnSorterContainer.nextElementSibling === initialColumnSorterContainer) {
          insertBefore = true;
        } else if (columnSorterContainer.previousElementSibling === initialColumnSorterContainer) {
          insertBefore = false;
        } else {
          // will insert before if closer to top
          insertBefore = Math.abs(top - y) < Math.abs(bottom - y);
        }

        if (insertBefore) {
          columnSorterContainer.before(initialColumnSorterContainer);
        } else {
          columnSorterContainer.after(initialColumnSorterContainer);
        }
        updateSorterBasedOnSortPanel();
      }
    }

    activeColumnSorterReorderGrip.classList.remove(activeClass);
    activeColumnSorterReorderGrip = undefined;
  }
}
tableColumnSortPanel.addEventListener("mousedown", function(event: MouseEvent) {
  const target: HTMLElement = event.target as HTMLElement;
  if (isColumnSorterReorderGrip(target)) {
    activateColumnSorterReorderGrip(target);
    event.preventDefault();
  }
  event.stopPropagation();
}, true);
tableColumnSortPanel.addEventListener("mouseup", function(event: MouseEvent) {
  deactivateColumnSorterReorderGrip(event);
  event.preventDefault();
  event.stopPropagation();
}, true);


type TextSortingFunction = (s1: string, s2: string) => number;
enum SortingDirection {
  ASCENDING,
  DESCENDING,
}
const clickClass = "clicked";
function setColumnSorter(columnIndex: number, sortingDirection: SortingDirection = SortingDirection.ASCENDING, order: number = columnIndex, recordColumnSortInteraction: boolean = true) {
  const buttonElement = getColumnLabelSortButton(getColumnLabel(columnIndex));
  buttonElement.classList.add(clickClass);

  let sorter: TextSortingFunction;
  if (sortingDirection === SortingDirection.ASCENDING) {
    sorter = (text1, text2) => text1.localeCompare(text2);
  } else {
    sorter = (text1, text2) => text2.localeCompare(text1);
  }
  tableDataManager.addSorter(columnIndex, sorter, order);
  if (recordColumnSortInteraction) {
    recordColumnSort(columnIndex, sortingDirection);
  }
}
function changeColumnSorterSortOrder(
  columnIndex: number,
  columnLabelSortButton: HTMLButtonElement = getColumnLabelSortButton(getColumnLabel(columnIndex)),
  newSortOrder: SortingDirection = isDescendingSorted(columnLabelSortButton) ? SortingDirection.ASCENDING : SortingDirection.DESCENDING,
  recordColumnSort: boolean = true) {
    columnLabelSortButton.classList.toggle(descendingClass);
    setColumnSorter(columnIndex, newSortOrder, undefined, recordColumnSort);
}

function deleteColumnSorter(columnIndex: number, refreshRenderingViewIfNeeded: boolean = true) {
  const columnLabel = getColumnLabel(columnIndex);
  const columnLabelSortButton = getColumnLabelSortButton(columnLabel);
  columnLabelSortButton.classList.remove(clickClass, descendingClass);
  tableDataManager.deleteSorter(columnIndex, refreshRenderingViewIfNeeded);
}
function tableCellSortButtonOnClick(buttonElement: HTMLButtonElement, recordColumnSort: boolean = true) {
  const columnIndex = (buttonElement.parentElement as HTMLTableDataCellElement).cellIndex;
  // '' => 'clicked' => 'clicked desc' => 'clicked'
  // since we are sorting on the current displayed data elements, we need to collect
  // data elements from rendered table data sections
  if (buttonElement.classList.contains(clickClass)) {
    changeColumnSorterSortOrder(columnIndex, buttonElement, undefined, recordColumnSort);
  } else {
    // ascending sort
    setColumnSorter(columnIndex, SortingDirection.ASCENDING, undefined, recordColumnSort);
  }
}
tableElement.addEventListener("click", function(event: MouseEvent) {
  const target: HTMLElement = event.target as HTMLElement;
  if (isTableCell(target)) {
    tableStatusManager.tableCellElementOnClick(target as HTMLTableCellElement, event);
  } else if (isColumnLabelSortButton(target)) {
    tableCellSortButtonOnClick(target as HTMLButtonElement);
    activateSortPanel(target);
  }
  event.stopPropagation();
}, true);


tableCellInputFormInputSaveButtonElement.addEventListener("click", function(event) {
   tableStatusManager.quitTableCellInputForm(true);
   event.preventDefault();
   event.stopPropagation();
});

/* keyboard event */
interface ConsumableKeyboardEvent extends KeyboardEvent {
  consumed?: boolean;
}
function copyCellTextToCopyBuffer(tableCellElement: HTMLTableCellElement) {
  copyTextToCopyBuffer(getTableCellText(tableCellElement));
}
function copyTableColumnToCopyBuffer(index: number) {
  let textToCopy = "";
  for (const text of getTableCellTextsInColumn(index, true, true)) {
    textToCopy += `${text}\n`;
  }
  copyTextToCopyBuffer(textToCopy.trimRight());
}

// paste event
function tableCellElementOnPaste(tableCellElement: HTMLTableCellElement, text: string) {
  // invoke edit editor
  tableStatusManager.tableCellInputFormAssignTarget(tableCellElement, text, true);
}
function tableCellElementOnPasteKeyPressed(tableCellElement: HTMLTableCellElement, event: ConsumableKeyboardEvent) {
  if (isTableHead(tableCellElement)) {
    return;
  }
  if (!hasCopyModifier(event)) {
    return;
  }
  // handle potential CTRL+v or CMD+v
  if (navigator.clipboard) {
    navigator.clipboard.readText().then(text => {
      tableCellElementOnPaste(tableCellElement, text);
    });
    event.consumed = true;
  } else {
    const copyTarget = tableStatusManager.copyTarget;
    if (!copyTarget) {
      return;
    }

    if (!isTableData(copyTarget)) {
      return;
    }

    const text = getTableDataText(copyTarget as HTMLTableCellElement);
    tableCellElementOnPaste(tableCellElement, text);
    event.consumed = true;
  }
}
tableElement.addEventListener("paste", function (event: ClipboardEvent) {
  const pasteContent = event.clipboardData.getData("text");
  const target: HTMLElement = event.target as HTMLElement;
  if(isColumnSearchInput(target)) {
    const targetInput: HTMLInputElement = event.target as HTMLInputElement;
    targetInput.value = pasteContent;
    targetInput.dispatchEvent(new Event("input"));
  } else if (isTableData(target) && isTableCellEditable(target as HTMLTableCellElement)) {
    tableCellElementOnPaste(target as HTMLTableCellElement, pasteContent);
  }
  event.preventDefault();
  event.stopPropagation();
}, true);

type FilterFunction = (s: string) => boolean;
function constructTableRowFilter(query: string): FilterFunction {
  const queryRegex = new RegExp(query, "i");
  return (cellText: string) => queryRegex.test(cellText);
}
function updateTableColumnFilter(columnIndex: number, query: string) {
  if (query == "") {
    tableDataManager.deleteFilter(columnIndex);
  } else {
    const filter: FilterFunction = constructTableRowFilter(query);
    tableDataManager.addFilter(columnIndex, filter);
  }
}

let columnSearchFilteringTimeoutId: number | null = null;

function tableColumnSearchElementOnInput(tableColumnSearchInputElement: HTMLInputElement, tableColumnSearchElement: HTMLTableCellElement) {
  if (columnSearchFilteringTimeoutId) {
    window.clearTimeout(columnSearchFilteringTimeoutId);
  }
  columnSearchFilteringTimeoutId = window.setTimeout(() => {
    recordColumnSearch(tableColumnSearchElement, false);
    updateTableColumnFilter(tableColumnSearchElement.cellIndex, tableColumnSearchInputElement.value);
  }, 400);
}

function tableColumnSearchElementOnChange(tableColumnSearchInputElement: HTMLInputElement, tableColumnSearchElement: HTMLTableCellElement) {
  recordColumnSearch(tableColumnSearchElement, true);
}

function tableColumnSearchElementOnKeyDown(tableColumnSearchElement: HTMLTableCellElement, event: ConsumableKeyboardEvent) {
  // focus on the input
  const columnSearchInput: HTMLInputElement = getColumnSearchInput(tableColumnSearchElement);
  const activeElement = document.activeElement;
  if (activeElement !== columnSearchInput) {
    // give focus to the column search input
    columnSearchInput.focus();
    // update the text
    columnSearchInput.value = event.key;
    // update the query regex
    updateTableColumnFilter(tableColumnSearchElement.cellIndex, columnSearchInput.value);
  }

  updateTableColumnSearchWidth(tableColumnSearchElement);
  event.consumed = true;
}
function tableCellElementOnInput(event: ConsumableKeyboardEvent) {
  const tableCellElement: HTMLTableCellElement = event.target as HTMLTableCellElement;
  // ignore if input on table head
  if (isTableData(tableCellElement)) {
    tableStatusManager.tableDataElementOnInput(tableCellElement, event);
  }
}
tableElement.addEventListener("keydown", function(event: KeyboardEvent) {
  const target: HTMLElement = event.target as HTMLElement;
  if (isTableCell(target)) {
    tableStatusManager.tableCellElementOnKeyDown(target as HTMLTableCellElement, event);
  } else if (isInput(target)) {
    // inputting on column search
    const columnSearch = target.closest("th.column-search");
    if (columnSearch) {
      const tableColumnSearchElement: HTMLTableCellElement = columnSearch as HTMLTableCellElement;
      tableColumnSearchElementOnKeyDown(tableColumnSearchElement, event);
    }
  }
  event.stopPropagation();
}, true);

tableCellInputFormElement.addEventListener("keydown", function(event: KeyboardEvent) {
  if (isTableCellInputFormActive()) {
    tableStatusManager.tableCellInputFormOnKeyDown(event);
  }
});

// mouse event handlers
let isRepositioningTableCellInputForm = false;
tableCellInputFormElement.addEventListener("mousedown", function(event: MouseEvent) {
  tableStatusManager.activateTableCellInputFormLocation();
  isRepositioningTableCellInputForm = true;
  event.stopPropagation();
}, {passive: true, capture: true});
let tableCellInputFormElementXShift: number = 0;
let tableCellInputFormElementYShift: number = 0;
function tableCellInputFormElementOnMouseMove(event: MouseEvent) {
  const {movementX: xShift, movementY: yShift } = event;
  // debounce
  tableCellInputFormElementXShift += xShift;
  tableCellInputFormElementYShift += yShift;
  tableCellInputFormElement.style.transform = `translate(${tableCellInputFormElementXShift}px, ${tableCellInputFormElementYShift}px)`;
}
tableCellInputFormElement.addEventListener("mousemove", function(event: MouseEvent) {
  if (isRepositioningTableCellInputForm) {
    tableCellInputFormElementOnMouseMove(event);
  }
});
function tableCellInputFormElementOnMouseUp() {
  isRepositioningTableCellInputForm = false;
  tableCellInputFormInputElement.focus({preventScroll: true});
}
tableCellInputFormElement.addEventListener("mouseup", function(event: MouseEvent) {
  if (isRepositioningTableCellInputForm) {
    tableCellInputFormElementOnMouseUp();
  }
});


/* for handling complete searches */
let lastColumnSearchIndex: number = -1;
let lastColumnSearchRecorded: boolean = true;
tableElement.addEventListener("input", function(event: Event) {
  const target: HTMLElement = event.target as HTMLElement;
  if (isInput(target)) {
    // inputting on column search
    const columnSearch = target.closest("th.column-search");
    if (columnSearch) {
      const tableColumnSearchElement: HTMLTableCellElement = columnSearch as HTMLTableCellElement;
      lastColumnSearchIndex = tableColumnSearchElement.cellIndex;
      lastColumnSearchRecorded = false;
      tableColumnSearchElementOnInput(target as HTMLInputElement, tableColumnSearchElement);
    }
  }
  event.stopPropagation();
}, true);

tableElement.addEventListener("blur", function(event: Event) {
  const target: HTMLElement = event.target as HTMLElement;
  if (isInput(target)) {
    const columnSearch = target.closest("th.column-search");
    if (columnSearch) {
      const tableColumnSearchElement: HTMLTableCellElement = columnSearch as HTMLTableCellElement;
      // only recording full search when completing a previous partial search
      if(tableColumnSearchElement.cellIndex === lastColumnSearchIndex && lastColumnSearchRecorded === false) {
        lastColumnSearchRecorded = true;
        tableColumnSearchElementOnChange(target as HTMLInputElement, tableColumnSearchElement);
      }
    }
  }
  event.stopPropagation();
}, true);

/* mouse events */
interface ResizableHTMLTableCellElement extends HTMLTableCellElement {
  atResize?: boolean;
  nearLeftBorder?: boolean;
  nearRightBorder?: boolean;
  startMouseX?: number;
}
let tableCellElementUnderMouse: null | ResizableHTMLTableCellElement = null;
const nearLeftBorderClass = "near-left-border";
const nearRightBorderClass = "near-right-border";
function nearElementLeftBorder(element: HTMLElement) {
  return element.classList.contains(nearLeftBorderClass);
}
function nearElementRightBorder(element: HTMLElement) {
  return element.classList.contains(nearRightBorderClass);
}
function removeNearBorderStatus() {
  for (const element of tableColumnLabels.querySelectorAll(`.${nearLeftBorderClass}`)) {
    element.classList.remove(nearLeftBorderClass);
  }
  for (const element of tableColumnLabels.querySelectorAll(`.${nearRightBorderClass}`)) {
    element.classList.remove(nearRightBorderClass);
  }
}
const resizingBorderClass = "resize-border";
function isResizingTableHeadBorder() {
  return tableColumnLabels.classList.contains(resizingBorderClass);
}
function startResizingBorderOnTableHead(tableCellElement: ResizableHTMLTableCellElement, event: MouseEvent) {
  tableColumnLabels.classList.add(resizingBorderClass);
  tableCellElement.startMouseX = event.clientX;
}
function finishResizingBorderOnTableHead(event: MouseEvent) {
  const startMouseX = tableCellElementUnderMouse.startMouseX;
  if (isNaN(startMouseX)) {
    return;
  } else {
    tableCellElementUnderMouse.startMouseX = undefined;
  }
  const finishMouseX = event.clientX;
  const resizeAmount = finishMouseX - startMouseX;
  if (resizeAmount !== 0) {
    if (nearElementLeftBorder(tableCellElementUnderMouse)) {
      updateTableCellWidth(getLeftTableCellElement(tableCellElementUnderMouse), resizeAmount);
    } else {
      updateTableCellWidth(tableCellElementUnderMouse, resizeAmount);
    }
  }
}
function updateTableCellElementUnderMouse(tableCellElement: HTMLTableCellElement) {
  if (tableCellElementUnderMouse) {
    removeNearBorderStatus();
  }
  tableCellElementUnderMouse = tableCellElement;
}
const distanceConsideredNearToBorder = 10;
/**
 * Handle mouse move near the borders of elements.
 *
 * @param {ResizableHTMLTableCellElement} tableCellElement - An resizable table cell element.
 * @param {MouseEvent} event - The invoking mouse event.
 */
function handleMouseMoveNearElementBorder(tableCellElement: ResizableHTMLTableCellElement, event: MouseEvent) {
  if (!isColumnLabel(tableCellElement)) {
    // ignore mouse moving near borders on elements other than column labels
    return;
  }
  const {left: elementLeft, right: elementRight} = tableCellElement.getBoundingClientRect();
  const mouseX = event.clientX;
  const distanceFromLeftBorder = mouseX - elementLeft;
  const distanceFromRightBorder = elementRight - mouseX;
  if (distanceFromLeftBorder > distanceConsideredNearToBorder && distanceFromRightBorder > distanceConsideredNearToBorder) {
    // reset indicator classes if far from both borders
    removeNearBorderStatus();
  } else if (distanceFromLeftBorder <= distanceConsideredNearToBorder && distanceFromLeftBorder < distanceFromRightBorder && !isFirstTableCell(tableCellElement)) {
    // near left border
    tableCellElement.classList.add(nearLeftBorderClass);
    getLeftTableCellElement(tableCellElement).classList.add(nearRightBorderClass);
  } else if (distanceFromRightBorder <= distanceConsideredNearToBorder && distanceFromRightBorder <= distanceFromLeftBorder) {
    // near right border
    tableCellElement.classList.add(nearRightBorderClass);

    if (!isLastTableCell(tableCellElement)) {
      // last tale column does not have a right border
      getRightTableCellElement(tableCellElement).classList.add(nearLeftBorderClass);
    }
  }
}
function tableColumnColorify(columnIndex: number, originalWidth: string = "50%", newWidth: string = "100%", bufferBackgroundColor: string = "#f8f9fa") {
  for (const tableCellElement of getTableCellElementsInColumn(columnIndex, false, false)) {
    if (isColumnLabel(tableCellElement) || isColumnSearch(tableCellElement)) {
      tableCellElement.style.paddingRight = `calc(0.75rem + calc(${newWidth} - ${originalWidth}))`;
    }

    const currentBackgroundColor: string = getComputedStyle(tableCellElement, null).backgroundColor;
    tableCellElement.style.background = `linear-gradient(to right, ${currentBackgroundColor} 0%, ${currentBackgroundColor} ${originalWidth}, ${bufferBackgroundColor} ${originalWidth}, ${bufferBackgroundColor} ${newWidth})`;
  }
}
function tableColumnDecolorify(columnIndex: number) {
  for (const tableCellElement of getTableCellElementsInColumn(columnIndex, false, false)) {
    if (isColumnSearch(tableCellElement)) {
      tableCellElement.style.paddingRight = "";
    }

    tableCellElement.style.background = "";
  }
}
function tableHeadOnMouseMove(tableCellElement: HTMLTableCellElement, event: MouseEvent) {
  if (isResizingTableHeadBorder()) {
    // reposition visual cue
    updateResizeVisualCuePosition(tableCellElementUnderMouse, event.clientX, nearElementLeftBorder(tableCellElementUnderMouse));
  } else {
    if (tableCellElement !== tableCellElementUnderMouse) {
      // different element under mouse move
      updateTableCellElementUnderMouse(tableCellElement);
    }
    // handle mouse move to element border
    handleMouseMoveNearElementBorder(tableCellElement, event);
  }
}
function tableHeadOnMouseDown(tableCellElement: HTMLTableCellElement, event: MouseEvent) {
  if (tableCellElementUnderMouse !== tableCellElement) {
    updateTableCellElementUnderMouse(tableCellElement);
  }

  // when near a border, start resizing
  if (isColumnLabel(tableCellElementUnderMouse)) {
    if (nearElementLeftBorder(tableCellElementUnderMouse) || nearElementRightBorder(tableCellElementUnderMouse)) {
      startResizingBorderOnTableHead(tableCellElementUnderMouse, event);
      updateResizeVisualCuePosition(tableCellElementUnderMouse, event.clientX, nearElementLeftBorder(tableCellElementUnderMouse));
      activateResizeVisualCue();
    }
  }
}
function tableHeadOnMouseUp(event: MouseEvent) {
  if (isResizingTableHeadBorder()) {
    finishResizingBorderOnTableHead(event);
  }
  deactivateResizeVisualCue();
  tableColumnLabels.classList.remove(resizingBorderClass);
  updateTableCellElementUnderMouse(null);
}
// mouse event handlers
tableElement.addEventListener("mousedown", function(event: MouseEvent) {
  const target: HTMLElement = event.target as HTMLElement;
  if (isTableHead(target)) {
    tableHeadOnMouseDown(target as HTMLTableCellElement, event);
  }
  event.stopPropagation();
}, {passive: true, capture: true});
tableElement.addEventListener("mousemove", function(event: MouseEvent) {
  const target: HTMLElement = event.target as HTMLElement;
  if (isTableHead(target)) {
    tableHeadOnMouseMove(target as HTMLTableCellElement, event);
  } else if (isRepositioningTableCellInputForm) {
    tableCellInputFormElementOnMouseMove(event);
  }
  event.stopPropagation();
}, {passive: true, capture: true});
tableElement.addEventListener("mouseup", function(event: MouseEvent) {
  if (isRepositioningTableCellInputForm) {
    // stop moving the input form editor
  tableCellInputFormElementOnMouseUp();
  } else {
    tableHeadOnMouseUp(event);
  }
  event.stopPropagation();
}, {passive: true, capture: true});


// scroll
/* scroll event */
let scrollTimeoutId: number | null = null;
function whenScrollFinished() {
  tableStatusManager.tableCellInputFormLocationOnScroll();
  // detect out of sync and rerendering
  tableDataManager.refreshRenderingViewIfNeeded();
}
tableScrollContainer.addEventListener("scroll", function(event: Event) {
  if (scrollTimeoutId) {
    window.clearTimeout(scrollTimeoutId);
  }
  scrollTimeoutId = window.setTimeout(whenScrollFinished, 400);
  event.stopPropagation();
}, {passive: true, capture: true});

/* submit event */
tableCellInputFormElement.addEventListener("submit", function(event: Event) {
  // disable submitting
  event.stopPropagation();
  event.preventDefault();
  return false;
}, true);

/* input event */
tableCellInputFormInputElement.addEventListener("input", function(event) {
  const query: string = tableCellInputFormInputElement.value;
  fuseSelect.query(query);
  event.stopPropagation();
}, { passive: true});


// HTML
class DataSectionElements {
  elements: Array<HTMLTemplateElement> | Array<HTMLTableSectionElement> | HTMLCollection;

  constructor(elements: Array<HTMLTemplateElement> | Array<HTMLTableSectionElement> | HTMLCollection = undefined) {
    if (elements) {
      this.elements = elements;
    } else {
      this.elements = [];
    }
  }

  get length(): number {
    return this.elements.length;
  }

  * getDataElements(): IterableIterator<DataElement> {
    for (const dataSectionElement of this.elements) {
      yield* new DataSectionElement(dataSectionElement as HTMLTableDataSectionElement).getDataElements();
    }
  }

  * getDataSectionElements() {
    for (const element of this.elements) {
      yield new DataSectionElement(element as HTMLTableDataSectionElement);
    }
  }

  removeRange(start: number, end: number) {
    if (end <= start) {
      // invalid range
      return;
    }

    // remove from end because HTMLCollection is live
    for (let i = end - 1; i >= start; i--) {
      this.elements[i].remove();
    }
  }
}

// JS variable
type DataCollections = Array<DataCollection>;

interface DataCollectionLike {
  children: HTMLCollection | Array<DataLike> | NodeList;
}
// HTML
type HTMLTableDataSectionElement = HTMLTemplateElement | HTMLTableSectionElement;

class DataSectionElement {
  element: HTMLTemplateElement | HTMLTableSectionElement;
  isTbody: boolean;

  constructor(element: HTMLTableDataSectionElement = undefined, asTbody: boolean = true) {
    if (element) {
      this.element = element;
    } else {
      this.element = document.createElement(asTbody ? "tbody" : "template");
    }
    this.isTbody = isTableBody(this.element);
  }

  get root(): DocumentFragment | HTMLTableSectionElement {
    if (isTableBody(this.element)) {
      return this.element as HTMLTableSectionElement;
    } else if (isTemplate(this.element)) {
      return (this.element as HTMLTemplateElement).content;
    }
  }

  querySelector(selector: string): HTMLElement {
    return this.root.querySelector(selector);
  }

  querySelectorAll(selector: string): NodeList {
    return this.root.querySelectorAll(selector);
  }

  get tableRows() {
    return this.querySelectorAll("tr");
  }

  get children() {
    return this.tableRows;
  }

  * getDataElements(): IterableIterator<DataElement> {
    for (const dataElement of this.tableRows) {
      yield new DataElement(dataElement as HTMLTableRowElement);
    }
  }

  appendChild(aChild: Node | DataElement) {
    if (aChild instanceof DataElement) {
      this.appendChild(aChild.element);
    } else {
      if (this.isTbody) {
        this.element.appendChild(aChild);
      } else {
        (this.element as HTMLTemplateElement).content.appendChild(aChild);
      }
    }
  }

  patch(dataCollection: DataCollectionLike) {
    const children = dataCollection.children;
    const numData: number = children.length;

    let dataIndex = 0;
    for (const dataElement of this.getDataElements()) {
      if (dataIndex < numData) {
        // in place patch
        dataElement.patch(children[dataIndex] as DataLike);
      } else {
        dataElement.remove();
      }
      dataIndex++;
    }

    for (; dataIndex < numData; dataIndex++) {
      const data = children[dataIndex];
      if (data instanceof Data) {
        this.appendChild(data.toDataElement());
      } else {
        this.appendChild(data as HTMLElement);
      }
    }
  }

  toDataCollection(): DataCollection {
    return DataCollection.from(this);
  }
}

// JS variable
interface OrderedTextSorter {
  order: number;
  sorter: TextSortingFunction;
}
type DataIndexSortingFunction = (d1: number, d2: number) => number;
type DataIndexFilterFunction = (d: number) => boolean;
interface IndexedDatum {
  childIndex: number;
  datum: Datum;
}

class DataCollection {
  /**
   * Instead of an actual array, think children is a *view*.
   *
   * When returning children, `shouldRegenerateView` will be used to determine whether last view can be reused.
   *   + If `shouldRegenerateView` is true, last view can be reused. `childrenView` will be returned as the children.
   *   + If `shouldRegenerateView` is false, last `view` cannot be reused.
   *     1. `childrenIndex` will be re-compiled by applying first all the filter functions and then all the sorting functions.
   *     2. `childrenView` will be remapped from `store` using `childrenIndex`.
   *     3. `shouldRegenerateView` will be set to false to enable caching.
   *     4. `childrenView` will be returned as `children`
   */

  /** store of underlying data elements */
  store: Array<Data>
  /** indexes of data element of current children view */
  childrenIndex: Array<number>;
  /** current children view */
  childrenView: Array<Data>
  /** whether current children view needs to be regenrated */
  shouldRegenrateView: boolean = true;

  /** from datum id (cell id) to datum (only for datum in view) */
  datumIdToDatum: Map<string, IndexedDatum> = new Map();
  dataIdToChildIndex: Map<string, number> = new Map();

  cellIndexToSorter: Map<number, OrderedTextSorter> = new Map();
  cellIndexToFilter: Map<number, FilterFunction> = new Map();

  constructor(children: Array<Data>) {
    this.children = children;
  }

  [Symbol.iterator]() {
    return this.children.values();
  }

  get children(): Array<Data> {
    if (this.shouldRegenrateView) {
      this.regenerateView();
    }
    return this.childrenView;
  }

  set children(children: Array<Data>) {
    this.store = children;
    this.shouldRegenrateView = true;
  }

  get length(): number {
    return this.children.length;
  }

  get numCell(): number {
    const firstChild: Data = this.children[0];
    if (!firstChild) {
      return null;
    }
    return firstChild.length;
  }

  get sorter(): DataIndexSortingFunction {
    const numSorter: number = this.cellIndexToSorter.size;
    if (numSorter === 0) {
      return null;
    }

    const sorters: Array<[number, OrderedTextSorter]> = Array.from(this.cellIndexToSorter);
    sorters.sort((s1, s2) => s1[1].order - s2[1].order);

    return (dataIndex1, dataIndex2) => {
      const d1Cells = this.store[dataIndex1].cells;
      const d2Cells = this.store[dataIndex2].cells;

      // apply text sorting functions sequentially by order
      let sorterIndex = 0;
      while (sorterIndex < numSorter) {
        const [cellIndex, {sorter}] = sorters[sorterIndex];
        const sorterResult = sorter(d1Cells[cellIndex].textContent, d2Cells[cellIndex].textContent);
        if (sorterResult !== 0) {
          // two entries are ordered after applying current sorter
          return sorterResult;
        }
        // need to apply next sorter
        sorterIndex++;
      }

      return 0;
    };
  }

  addSorter(cellIndex: number, sorter: TextSortingFunction, order: number = cellIndex) {
    this.cellIndexToSorter.set(cellIndex, { order, sorter });
    return this.shouldRegenrateView = true;
  }

  deleteSorter(cellIndex: number): boolean {
    if (this.cellIndexToSorter.delete(cellIndex)) {
      return this.shouldRegenrateView = true;
    }

    return false;
  }

  clearSorter(): boolean {
    if (this.cellIndexToSorter.size === 0) {
      return false;
    }

    this.cellIndexToSorter.clear();
    return this.shouldRegenrateView = true;
  }

  reorderSorter(ordering: Map<number, number>): boolean {
    let shouldRegenrateView = false;

    for (const [cellIndex, order] of ordering) {
      const { order: existingOrder, sorter } = this.cellIndexToSorter.get(cellIndex);
      if (existingOrder !== order) {
        this.cellIndexToSorter.set(cellIndex, {order, sorter });
        shouldRegenrateView = true;
      }
    }

    return this.shouldRegenrateView = shouldRegenrateView;
  }

  get filter(): DataIndexFilterFunction {
    const numFilter: number = this.cellIndexToFilter.size;
    if (numFilter === 0) {
      return null;
    }

    return (dataIndex) => {
      const cells = this.store[dataIndex].cells;

      for (const [cellIndex, filter] of this.cellIndexToFilter) {
        const cellText: string = cells[cellIndex].textContent;
        if (!filter(cellText)) {
          // not satisfying current filter
          return false;
        }
        // try next filter
      }

      return true;
    };
  }

  addFilter(cellIndex: number, filter: FilterFunction) {
    this.cellIndexToFilter.set(cellIndex, filter);
    return this.shouldRegenrateView = true;
  }

  deleteFilter(cellIndex: number): boolean {
    if (this.cellIndexToFilter.delete(cellIndex)) {
      return this.shouldRegenrateView = true;
    }

    return false;
  }

  clearFilter() {
    if (this.cellIndexToSorter.size === 0) {
      return false;
    }

    this.cellIndexToFilter.clear();
    return this.shouldRegenrateView = true;
  }

  regenerateView() {
    let childrenIndex = [...this.store.keys()];

    const filter: DataIndexFilterFunction = this.filter;
    if (filter) {
      childrenIndex = childrenIndex.filter(filter);
    }

    const sorter: DataIndexSortingFunction = this.sorter;
    if (sorter) {
      childrenIndex.sort(sorter);
    }

    this.datumIdToDatum.clear();
    this.dataIdToChildIndex.clear();

    this.childrenIndex = childrenIndex;
    this.childrenView = this.childrenIndex.map((dataIndex, childIndex) => {
      const data: Data = this.store[dataIndex];
      const dataid: string = data.id;
      for (const [datumid, datum] of data.datumIdToDatum) {
        this.datumIdToDatum.set(datumid, {datum, childIndex});
      }
      this.dataIdToChildIndex.set(dataid, childIndex);
      return data;
    });
    this.shouldRegenrateView = false;
  }

  getData(i: number): Data {
    return this.children[i];
  }

  getChildIndexByDataId(dataid: string): number {
   return this.dataIdToChildIndex.get(dataid);
  }

  getDatumByDatumId(datumid: string): Datum {
    const indexedDatum: IndexedDatum = this.datumIdToDatum.get(datumid);
    if (indexedDatum) {
      return indexedDatum.datum;
    } else {
      return null;
    }
  }

  updateDatumByDatumId(datumId: string, newDatum: Partial<DatumLike>) {
    const { datum, childIndex } = this.datumIdToDatum.get(datumId);

    Object.assign(datum, newDatum);

    if ("id" in newDatum) {
      const newDatumId: string = newDatum.id;
      // updates the entry in datumIdToDatum when a new id is given to the datum
      this.datumIdToDatum.delete(datumId);
      this.datumIdToDatum.set(newDatumId, {datum, childIndex});
    }
  }

  getChildIndexByDatumId(datumid: string): number {
    const indexedDatum: IndexedDatum = this.datumIdToDatum.get(datumid);
    if (indexedDatum) {
      return indexedDatum.childIndex;
    } else {
      return null;
    }
  }

  slice(begin: number = undefined, end: number = undefined) {
    return this.children.slice(begin, end);
  }

  static from(dataCollection: DataCollectionLike): DataCollection {
    const children = [];
    for (const data of dataCollection.children) {
      children.push(Data.from(data as DataLike));
    }
    return new DataCollection(children);
  }

  toDataDataSectionElement(): DataSectionElement {
    const dataSectionElement = new DataSectionElement();
    for (const data of this) {
      const dataElement: DataElement = data.toDataElement();
      dataSectionElement.appendChild(dataElement);
    }
    return dataSectionElement;
  }
}

// HTML
interface DataLike {
  id: string;
  cells: HTMLCollection | Array<DatumLike>;
}
class DataElement implements DataLike {
  element: HTMLTableRowElement;

  constructor(element: HTMLTableRowElement = undefined) {
    if (element) {
      this.element = element;
    } else {
      this.element = document.createElement("tr");
    }
  }

  get id() {
    return this.element.dataset.id;
  }

  set id(id: string) {
    this.element.dataset.id = id;
  }

  * getDataCellElements(): IterableIterator<DataCellElement> {
    for (const cellElement of this.cells) {
      yield new DataCellElement(cellElement);
    }
  }

  get cells() {
    return this.element.cells;
  }

  appendChild(aChild: Node | DataCellElement) {
    if (aChild instanceof DataCellElement) {
      this.element.appendChild(aChild.element);
    } else {
      this.element.appendChild(aChild);
    }
  }

  remove() {
    this.element.remove();
  }

  patch(data: DataLike) {
    this.id = data.id;

    const datums = data.cells;
    const numDatum: number = datums.length;

    let datumIndex = 0;
    for (const dataElement of this.getDataCellElements()) {
      if (datumIndex < numDatum) {
        // in place patch
        dataElement.patch(datums[datumIndex] as DatumLike);
      } else {
        dataElement.remove();
      }
      datumIndex++;
    }

    for (; datumIndex < numDatum; datumIndex++) {
      const datum = datums[datumIndex];
      if (datum instanceof Datum) {
        this.appendChild(datum.toDataCellElement());
      } else {
        this.appendChild(datum as HTMLElement);
      }
    }
  }

  isSameId(other: DataLike): boolean {
    return this.id === other.id;
  }

  toData(): Data {
    return Data.from(this);
  }
}

// JS variable
class Data implements DataLike {
  id: string;
  datums: Array<Datum>;
  datumIdToDatum: Map<string, Datum> = new Map();

  constructor(id: string, datums: Array<Datum>) {
    this.id = id;
    this.datums = datums;
    datums.forEach((datum) => this.datumIdToDatum.set(datum.id, datum));
  }

  get length(): number {
    return this.datums.length;
  }

  /**
   * @alias datums
   */
  get cells(): Array<Datum> {
    return this.datums;
  }

  getDatum(i: number): Datum {
    return this.datums[i];
  }

  [Symbol.iterator]() {
    return this.datums.values();
  }

  static from(data: DataLike) {
    const datums = [];
    for (const tableCellElement of data.cells) {
      datums.push(Datum.from(tableCellElement as DatumLike));
    }
    return new Data(data.id, datums);
  }

  isSameId(other: DataLike): boolean {
    return this.id === other.id;
  }

  toDataElement(): DataElement {
    const dataElement = new DataElement();
    dataElement.id = this.id;
    for (const datum of this) {
      dataElement.appendChild(datum.toDataCellElement());
    }
    return dataElement;
  }
}


interface DatumLike {
  id: string;
  textContent: string;
  className: string;
  contentEditable: string;
}
// HTML
class DataCellElement implements DatumLike {
  element: HTMLTableCellElement;

  get id() {
    return this.element.id;
  }

  set id(id: string) {
    this.element.id = id;
  }

  get textContent() {
    return this.element.textContent;
  }

  set textContent(textContent: string) {
    this.element.textContent = textContent;
  }

  get className() {
    return this.element.className;
  }

  set className(className: string) {
    this.element.className = className;
  }

  get contentEditable() {
    return this.element.contentEditable;
  }

  set contentEditable(contentEditable: string) {
    this.element.contentEditable = contentEditable;
  }

  constructor(element: HTMLTableCellElement = undefined) {
    if (element) {
      this.element = element;
    } else {
      this.element = document.createElement("td");
      this.element.tabIndex = -1;
    }
  }

  remove() {
    this.element.remove();
  }

  patch(datum: DatumLike) {
    this.id = datum.id;
    this.textContent = datum.textContent;
    this.className = datum.className;
    this.contentEditable = datum.contentEditable;
  }

  toDatum(): Datum {
    return Datum.from(this);
  }
}
// JS variable
class Datum implements DatumLike {
  id: string;
  textContent: string;
  className: string;
  contentEditable: string;

  constructor(id: string, textContent: string, className: string, contentEditable: string) {
    this.id = id;
    this.textContent = textContent;
    this.className = className;
    this.contentEditable = contentEditable;
  }

  static from(datum: DatumLike) {
    return new Datum(datum.id, datum.textContent, datum.className, datum.contentEditable);
  }

  toDataCellElement(): DataCellElement {
    const dataCellElement = new DataCellElement();
    dataCellElement.id = this.id;
    dataCellElement.textContent = this.textContent;
    dataCellElement.className = this.className;
    dataCellElement.contentEditable = this.contentEditable;
    return dataCellElement;
  }
}

enum Direction {
    Up,
    Down,
    Left,
    Right,
    Stay
}

type ViewChangeHandler = () => void;
class TableDataManager {
  tableElement: HTMLTableElement;

  dataCollection: DataCollection;
  dataSectionElement: DataSectionElement;

  /* callback */
  /** a callback executed when old view is about to leave */
  beforeViewUpdate: ViewChangeHandler;
  /** a callback executed when new view finished rendering */
  afterViewUpdate: ViewChangeHandler;

  /* filler */
  static fillerClass = "filler-row";
  topFiller: HTMLTableRowElement;
  static topFillerClass: string = "filler-row-top";
  topFillerObserver: IntersectionObserver;
  topFillerOffsetTop: number;
  bottomFiller: HTMLTableRowElement;
  static bottomFillerClass: string = "filler-row-bottom";
  bottomFillerObserver: IntersectionObserver;

  /* scroll */
  elementHeight: number;
  lastScrollPosition: number = 0;
  scrollTarget: HTMLElement;
  topSentinelObserver: IntersectionObserver;
  bottomSentinelObserver: IntersectionObserver;

  static numElementToEnableLazyLoad: number = 200;

  get topFillerRowIndex(): number {
    return this.topFiller.rowIndex;
  }

  get scrollPosition(): number {
    return this.scrollTarget.scrollTop;
  }

  get numElementToShift(): number {
    return Math.floor(TableDataManager.numElementToEnableLazyLoad / 2);
  }

  get shouldLazyLoad(): boolean {
    return this.numElement >= TableDataManager.numElementToEnableLazyLoad;
  }

  get numElement(): number {
    return this.dataCollection.length;
  }

  get numElementRendered(): number {
    return this.dataSectionElement.children.length;
  }

  get numElementToRender(): number {
    return Math.min(this.numElement, TableDataManager.numElementToEnableLazyLoad);
  }

  get topFromPageTop(): number {
    return getOffsetFromPageTop(this.topFiller);
  }

  get height(): number {
    return this.numElement * this.elementHeight;
  }

  /**
   * @return {number} How far the bottom of the dataSectionElement is from the top of the page
   */
  get bottomFromPageTop(): number {
    return getOffsetFromPageTop(this.bottomFiller);
  }

  get numElementNotRenderedAbove(): number {
    return Number.parseInt(this.topFiller.dataset.numElement, 10);
  }
  set numElementNotRenderedAbove(n: number) {
    this.topFiller.dataset.numElement = n.toString();
    const fillerHeight = `${n * this.elementHeight}px`;
    this.topFiller.style.height = fillerHeight;
  }

  get reachedTop(): boolean {
    return this.numElementNotRenderedAbove === 0;
  }

  /**
   * @alias numElementNotRenderedAbove
   * First rendered data element index in this.dataCollection
   */
  get renderedFirstElementIndex(): number {
    return this.numElementNotRenderedAbove;
  }

  /**
   * This corresponds to the virtual row index of the first rendered data element. That is the hypothetical row index of this element when all data elements are rendered.
   */
  get renderedFirstElementRowIndex(): number {
    return this.elementIndexToRowIndex(this.renderedFirstElementIndex);
  }

  get numElementNotRenderedBelow(): number {
    return Number.parseInt(this.bottomFiller.dataset.numElement, 10);
  }
  set numElementNotRenderedBelow(n: number) {
    if (n === undefined) {
      n = this.numElement - this.numElementNotRenderedAbove - this.numElementRendered;
    }

    this.bottomFiller.dataset.numElement = n.toString();
    const fillerHeight = `${n * this.elementHeight}px`;
    this.bottomFiller.style.height = fillerHeight;
  }

  get reachedBottom(): boolean {
    return this.numElementNotRenderedBelow === 0;
  }

  /*
   * Last rendered data element index in this.dataCollection
   */
  get renderedLastElementIndex(): number {
    return this.renderedFirstElementIndex + this.numElementRendered - 1;
  }

  /* sentinel */
  get topSentinelIndex(): number {
    return this.getSafeIndex(Math.floor(this.numElementRendered / 4) - 1, 0, this.numElementRendered);
  }
  get topSentinel(): HTMLTableRowElement {
    return this.dataSectionElement.children[this.topSentinelIndex] as HTMLTableRowElement;
  }

  get bottomSentinelIndex(): number {
    return this.getSafeIndex(Math.floor(this.numElementRendered / 4) * 3 - 1, 0, this.numElementRendered);
  }
  get bottomSentinel(): HTMLTableRowElement {
    return this.dataSectionElement.children[this.bottomSentinelIndex] as HTMLTableRowElement;
  }

  /**
   * store current scroll position and report whether the scroll direction is going upward or downward
   */
  get scrollDirection(): Direction {
    const scrollPosition = this.scrollPosition;
    let scrollDirection;
    if (scrollPosition > this.lastScrollPosition) {
      scrollDirection = Direction.Down;
    } else if (scrollPosition === this.lastScrollPosition) {
      scrollDirection = Direction.Stay;
    } else {
      scrollDirection = Direction.Up;
    }
    this.lastScrollPosition = scrollPosition;
    return scrollDirection;
  }

  /**
   * @proxy
   */
  set dataSource(dataSource: HTMLElement | DataCollections | DataCollection | DataSectionElement | DataSectionElements) {
    if (dataSource instanceof DataSectionElements) {
      this.dataCollection = DataCollection.from({
        children: Array.from(dataSource.getDataElements())
      });
    } else if (dataSource instanceof DataSectionElement) {
      this.dataCollection = dataSource.toDataCollection();
    } else if (dataSource instanceof DataCollection) {
      this.dataCollection = dataSource;
    } else if (dataSource instanceof HTMLElement) {
      this.dataSource = new DataSectionElements(dataSource.children);
    } else {
      this.dataCollection = new DataCollection([].concat(...dataSource));
    }
  }

  /**
   * @returns A default view of first `this.numElementToRender` data elements of `this.dataCollection`
   */
  get defaultView(): DataCollectionLike {
    return {
      children: this.dataCollection.slice(0, this.numElementToRender)
    };
  }

  get viewToRender() {
    return {
      children: this.dataSectionElement.children
    };
  }

  /**
   * @proxy
   * Triggers rerendering
   */
  set viewToRender(dataCollection: DataCollectionLike) {
    this.beforeViewUpdate();
    this.dataSectionElement.patch(dataCollection);
    this.afterViewUpdate();
  }

  setViewToRender(dataCollection: DataCollectionLike = this.defaultView, numElementNotRenderedAbove: number = 0, numElementNotRenderedBelow: number = undefined) {
    this.viewToRender = dataCollection;
    this.numElementNotRenderedAbove = numElementNotRenderedAbove;
    this.numElementNotRenderedBelow = numElementNotRenderedBelow;
  }

  constructor(
    tableElement: HTMLTableElement,
    dataSource: HTMLElement | DataCollections | DataCollection | DataSectionElement | DataSectionElements,
    scrollTarget: HTMLElement,
    elementHeight: number,
    beforeViewUpdate: ViewChangeHandler = () => undefined,
    afterViewUpdate: ViewChangeHandler = () => undefined) {
    this.beforeViewUpdate = beforeViewUpdate;
    this.afterViewUpdate = afterViewUpdate;

    this.tableElement = tableElement;
    this.elementHeight = elementHeight;

    this.dataSource = dataSource;

    // set up
    this.initializeTopFiller();
    this.initializeDataSectionElement();
    this.initializeBottomFiller();

    // scroll
    this.scrollTarget = scrollTarget;
    this.numElementNotRenderedAbove = 0;
    this.numElementNotRenderedBelow = undefined;
    this.initializeSentinelObservers();

    this.activateObservers();
  }

  getSafeIndex(index: number, lowerBound: number = 0, upperBound: number = this.numElement - 1) {
    return Math.min(upperBound, Math.max(lowerBound, index));
  }

  getElementIndexByScrollAmount(scrollAmount: number = this.scrollPosition) {
    const elementOffsetTop: number = Math.max(0, scrollAmount - this.topFillerOffsetTop);
    return this.getSafeIndex(Math.floor(elementOffsetTop / this.elementHeight));
  }

  initializeTopFiller() {
    this.topFiller = document.createElement("tr");
    this.topFiller.classList.add(TableDataManager.fillerClass, TableDataManager.topFillerClass);
    this.tableElement.appendChild(this.topFiller);
    this.topFillerOffsetTop = this.topFiller.offsetTop;
    this.initializeTopFillerObserver();
  }

  initializeBottomFiller() {
    this.bottomFiller = document.createElement("tr");
    this.bottomFiller.classList.add(TableDataManager.fillerClass, TableDataManager.bottomFillerClass);
    this.tableElement.appendChild(this.bottomFiller);
    this.initializeBottomFillerObserver();
  }

  initializeDataSectionElement() {
    this.dataSectionElement = new DataSectionElement(undefined, true);
    this.viewToRender = this.defaultView;
    this.tableElement.appendChild(this.dataSectionElement.element);
  }

  initializeTopFillerObserver() {
    this.topFillerObserver = new IntersectionObserver((entries) => this.fillerReachedHandler(entries), {
      "root": this.scrollTarget,
      "threshold": [0, 0.25, 0.5, 0.75, 1],
    });
  }

  initializeBottomFillerObserver() {
    this.bottomFillerObserver = new IntersectionObserver((entries) => this.fillerReachedHandler(entries), {
      "root": this.scrollTarget,
      "threshold": [0, 0.25, 0.5, 0.75, 1],
    });
  }

  initializeSentinelObservers() {
    this.topSentinelObserver = new IntersectionObserver((entries) => this.sentinelReachedHandler(entries), {
      "threshold": [0, 0.25, 0.5, 0.75, 1],
    });
    this.bottomSentinelObserver = new IntersectionObserver((entries) => this.sentinelReachedHandler(entries), {
      "threshold": [0, 0.25, 0.5, 0.75, 1],
    });
  }

  activateSentinelObservers() {
    if (!this.shouldLazyLoad) {
      return;
    }
    this.topSentinelObserver.observe(this.topSentinel);
    this.bottomSentinelObserver.observe(this.bottomSentinel);
  }

  deactivateSentinelObservers() {
    // both disconnect and unobserve are used to maximize compatibility
    this.topSentinelObserver.disconnect();
    this.bottomSentinelObserver.disconnect();
  }

  activateTopFillerObserver() {
    this.topFillerObserver.observe(this.topFiller);
  }

  activateBottomFillerObserver() {
    this.bottomFillerObserver.observe(this.bottomFiller);
  }

  activateFillerObservers() {
    this.activateTopFillerObserver();
    this.activateBottomFillerObserver();
  }

  deactivateFillerObservers() {
    this.topFillerObserver.unobserve(this.topFiller);
    this.bottomFillerObserver.unobserve(this.bottomFiller);
  }

  activateObservers() {
    this.activateFillerObservers();
    this.activateSentinelObservers();
  }

  deactivateObservers() {
    this.deactivateFillerObservers();
    this.deactivateSentinelObservers();
  }

  /* filtering */
  addFilter(cellIndex: number, filter: FilterFunction) {
    if (this.dataCollection.addFilter(cellIndex, filter)) {
      this.setViewToRender();
    }
  }

  deleteFilter(cellIndex: number) {
    if (this.dataCollection.deleteFilter(cellIndex)) {
      this.setViewToRender();
    }
  }

  clearFilter() {
    if (this.dataCollection.clearFilter()) {
      this.setViewToRender();
    }
  }

  /* sorting */
  getSorters(): Map<number, OrderedTextSorter> {
    return this.dataCollection.cellIndexToSorter;
  }

  addSorter(cellIndex: number, sorter: TextSortingFunction, order: number = cellIndex) {
    if (this.dataCollection.addSorter(cellIndex, sorter, order)) {
      this.setViewToRender();
    }
  }

  deleteSorter(cellIndex: number, refreshViewImmediately: boolean = true) {
    if (this.dataCollection.deleteSorter(cellIndex) && refreshViewImmediately) {
      this.setViewToRender();
    }
  }

  reorderSorter(ordering: Map<number, number>) {
    if (this.dataCollection.reorderSorter(ordering)) {
      this.setViewToRender();
    }
  }

  clearSorter(refreshViewImmediately: boolean = true) {
    if (this.dataCollection.clearSorter() && refreshViewImmediately) {
      this.setViewToRender();
    }
  }

  /**
   * @arg {number} elementIndex - data element's index in `this.dataCollection`.
   * @returns {number} The virtual row index of this data element if all data elements are actually rendered.
   */
  elementIndexToRowIndex(elementIndex: number): number {
    return this.topFillerRowIndex + 1 + elementIndex;
  }

  /* handlers */

  fillerReachedHandler(entries: Array<IntersectionObserverEntry>) {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRect.height > 0) {
        // the last element of the first data section is appearing into view
        this.deactivateObservers();
        const targetElementIndex = this.getElementIndexByScrollAmount(this.scrollPosition);
        const numElementToShiftDown = targetElementIndex - this.renderedFirstElementIndex;
        this.shiftRenderingView(numElementToShiftDown);
        this.activateObservers();
      }
    });
  }

  sentinelReachedHandler(entries: Array<IntersectionObserverEntry>) {
    const scrollDirection: Direction = this.scrollDirection;

    entries.forEach(entry => {
      const desiredDirection: Direction = this.topSentinel === entry.target ? Direction.Up : Direction.Down;
      if (entry.isIntersecting && entry.intersectionRect.height > 0 && scrollDirection === desiredDirection) {
        // the last element of the first data section is appearing into view
        this.deactivateObservers();
        const numElementToShiftDown: number = scrollDirection === Direction.Up ?  -this.numElementToShift : this.numElementToShift;
        this.shiftRenderingView(numElementToShiftDown);
        this.activateObservers();
      }
    });
  }

  /* rendering view */
  isElementInRenderingView(elementIndex: number): boolean {
    return elementIndex >= this.renderedFirstElementIndex && elementIndex <= this.renderedLastElementIndex;
  }

  isCellInRenderingView(cellid: string): boolean {
    const elementIndex = this.getElementIndexByCellId(cellid);
    return this.isElementInRenderingView(elementIndex);
  }
  /**
   * @param {string} cellid - The id of cell element.
   * @return {boolean} whether a table cell element specified by `cellid` can appear within rendering view by scrolling
   */
  isCellInPotentialRenderingView(cellid: string): boolean {
    if (!cellid) {
      return false;
    }
    return Boolean(this.dataCollection.getDatumByDatumId(cellid));
  }

  /**
   * Makes change to a Datum (data layer) and control whether the change will be reflected in the view layer (actual HTML Element encapsulated by DataCellElement).
   */
  updateCellInRenderingView(cellid: string, newDatum: Partial<DatumLike>, shouldRefreshCurrentView: boolean = true) {
    this.dataCollection.updateDatumByDatumId(cellid, newDatum);
    if (shouldRefreshCurrentView) {
      this.refreshCurrentView();
    }
  }

  getElementIndexByCellId(cellid: string): number {
    return this.dataCollection.getChildIndexByDatumId(cellid);
  }

  /**
   * @arg {number} elementIndex - the element index of a data element currently inside rendeirng view.
   * @returns The desired node if it is inside rendering view. `undefined` otherwise.
   */
  getElementInRenderingView(elementIndex: number) {
    return this.dataSectionElement.children[elementIndex - this.renderedFirstElementIndex];
  }

  /**
   * Put a data element in desired position in rendering view.
   *
   * @arg {number} elementIndex - data element's index in `this.dataCollection`.
   * @arg {number} indexInRenderingView - the desired offset from the first element in rendering view. For example, if `indexInRenderingView` is 5, the specified element index will be the fifth element in rendering view. Should not exceed `this.numElementRendered`.
   * @arg {boolean = true} scrollIntoView - whether scroll the pag so that the eleement will be aligned to the top of the visible area of the scrollable container. Should set to true when element is not in rendering view already or otherwise the filler observe will cause the original position to be restored.
   */
  putElementInRenderingView(elementIndex: number, indexInRenderingView: number = this.numElementRendered / 2, scrollIntoViewOptions: ScrollIntoViewOptions = { block: "center", inline: "start"}) {
    this.deactivateObservers();
    let dataElement = this.getElementInRenderingView(elementIndex) as HTMLElement;

    if (!dataElement) {
      // put element in view
      const numElementToShiftDown: number = elementIndex - indexInRenderingView - this.renderedFirstElementIndex;
      this.shiftRenderingView(numElementToShiftDown);
      dataElement = this.getElementInRenderingView(elementIndex) as HTMLElement;
    }

    if (scrollIntoViewOptions) {
      dataElement.scrollIntoView(scrollIntoViewOptions);
    }

    this.activateObservers();
  }

  putElementInRenderingViewByDataId(dataid: string): boolean {
    const childIndex: number = this.dataCollection.getChildIndexByDataId(dataid);
    if (childIndex === undefined) {
      // data element not in data collection, scroll failed
      return false;
    }
    this.putElementInRenderingView(childIndex);
    return true;
  }

  putElementInRenderingViewByCellId(cellid: string): boolean {
    const elementIndex: number = this.getElementIndexByCellId(cellid);
    if (elementIndex === undefined) {
      // data element not in data collection, scroll failed
      return false;
    }
    this.putElementInRenderingView(elementIndex);
    return true;
  }

  refreshRenderingViewIfNeeded(): boolean {
    const elementIndex: number = this.getElementIndexByScrollAmount(this.scrollPosition);
    if (!this.isElementInRenderingView(elementIndex)) {
      // out of sync
      this.updateRenderingView(elementIndex);
      return true;
    }
    return false;
  }

  /**
   * Usually execute after a change is made to DataCollection (data layer) and before the change is reflected in the DataSectionElement (view layer)
   * Will cause the view layer to reflect the changes made to rendering slice of DataCollection
   */
  refreshCurrentView() {
    this.updateRenderingView(this.renderedFirstElementIndex);
  }

  updateRenderingView(startIndex: number) {
    this.deactivateObservers();
    const end: number = startIndex + this.numElementToRender;
    this.setViewToRender({
      children: this.dataCollection.slice(startIndex, end)
    }, startIndex);
    this.activateObservers();
  }


  shiftRenderingView(numElementToShiftDown: number) {
    const isScrollDown: boolean = numElementToShiftDown >= 0;
    if ((isScrollDown && this.reachedBottom) || (!isScrollDown && this.reachedTop)) {
        // already reached ends, no need to shift view
      return;
    }

    const startIndex: number = this.renderedFirstElementIndex;
    const newStartIndex: number = this.getSafeIndex(startIndex + numElementToShiftDown);
    const end: number = newStartIndex + this.numElementToRender;
    this.setViewToRender({
      children: this.dataCollection.slice(newStartIndex, end)
    }, newStartIndex);
  }
}


/* this interface is used to detect double click (two clicks within short interval specified by {@link recentTimeLimit} */
interface ActiveHTMLTableCellElement extends HTMLTableCellElement {
  lastActiveTimestamp?: number;
}
type CopyTarget = HTMLTableColElement | HTMLTableCellElement;

class TableStatusManager {
  static recentTimeLimit = 1000;

  constructor() {
    tableCellInputFormLocateCellElement.addEventListener("click", (event: MouseEvent) => {
      this.restoreTableCellInputFormLocation();
      event.stopPropagation();
    });

  }

  /** which table cell (either a table head or a table data) element is currently active */
  activeTableCellElementId: string = null;
  /** which table cell element (either a table head or a table data) was copied */
  copyTargetId: string = null;

  get copyTarget(): CopyTarget {
    if (!this.copyTargetId) {
      return null;
    }
    return document.getElementById(this.copyTargetId) as CopyTarget;
  }

  set copyTarget(copyTarget: CopyTarget) {
    if (copyTarget) {
      this.copyTargetId = copyTarget.id;
    } else {
      this.copyTargetId = null;
    }
  }

  removeCurrentCopyTarget() {
    const copyTarget: CopyTarget = this.copyTarget;
    if (copyTarget) {
      copyTarget.classList.remove(copiedClass);
      this.copyTarget = null;
    }
  }

  makeElementCopyTarget(element: HTMLTableCellElement | HTMLTableColElement) {
    this.copyTarget = element;
    element.classList.add(copiedClass);
  }

  tableCellElementOnCopy(tableCellElement: HTMLTableCellElement, event: ConsumableKeyboardEvent) {
    if (hasCopyModifier(event)) {
      this.removeCurrentCopyTarget();
      clearCopyBuffer();

      let elementToHighlight;
      if (activeTableColElement) {
        // copy entire column
        const columnIndex: number = this.activeTableCellElement.cellIndex;
        copyTableColumnToCopyBuffer(columnIndex);
        elementToHighlight = activeTableColElement;
        recordColumnCopy(getColumnLabel(columnIndex));
      } else if (!(isColumnSearch(tableCellElement))) {
        if (hasTextSelected(tableCellElement)) {
          // copy selected part
          copyCurrentSelectionToCopyBuffer();
        } else {
          // copy single table cell
          copyCellTextToCopyBuffer(tableCellElement);
        }
        elementToHighlight = tableCellElement;
        if (isTableData(tableCellElement)) {
          // do not record copy on table head element
          recordCellCopy(tableCellElement);
        }

        // regain focus
        elementToHighlight.focus();
      }

      copyCopyBuffer();
      this.makeElementCopyTarget(elementToHighlight);
      event.consumed = true;
    }
    // ignore when only C is pressed
  }

  get activeTableCellElement(): ActiveHTMLTableCellElement {
    if (!this.activeTableCellElementId) {
      return null;
    }
    return document.getElementById(this.activeTableCellElementId) as ActiveHTMLTableCellElement;
  }

  set activeTableCellElement(tableCellElement: ActiveHTMLTableCellElement) {
    if (tableCellElement) {
      this.activeTableCellElementId = tableCellElement.id;
    } else {
      this.activeTableCellElementId = null;
    }
  }

  /**
   * renew the timestamp on the active table cell element.
   */
  updateActiveTimestamp() {
    this.activeTableCellElement.lastActiveTimestamp = Date.now();
  }

  /**
   * Whether the table data is activated recently.
   */
  isTableDataLastActivatedRecently() {
    const activeTableCellElement = this.activeTableCellElement;
    if (activeTableCellElement === null) {
      return false;
    }

    if (activeTableCellElement.lastActiveTimestamp === null) {
      return false;
    }

    return Date.now() - activeTableCellElement.lastActiveTimestamp <= TableStatusManager.recentTimeLimit;
  }

  isClickOnActiveElement(tableCellElement: HTMLTableCellElement) {
    return tableCellElement === this.activeTableCellElement;
  }

  activeElementOnRepeatedClick(event: MouseEvent) {
    const activeTableCellElement = this.activeTableCellElement;
    if (!activeTableCellElement) {
      return;
    }
    if (isTableData(activeTableCellElement)) {
      if (this.isTableDataLastActivatedRecently()) {
        this.tableCellInputFormAssignTarget(activeTableCellElement);
        activeTableCellElement.lastActiveTimestamp = null;
        recordCellDoubleClick(activeTableCellElement);
      } else {
        this.updateActiveTimestamp();
      }
    } else if (isTableHead(activeTableCellElement)) {
      this.activeTableHeadOnRepeatedClick(event);
    }
  }

  activeTableHeadOnRepeatedClick(event: MouseEvent) {
    if (activeTableColElement) {
      // table column is active, deactivate column and focus only on table head
      this.deactivateTableCol();
    } else {
      // only activate table column at repeated click (after even number of clicks)
      this.activateTableCol();
    }
  }
  /* activate */
  activateTableData(shouldUpdateTimestamp=true, shouldGetFocus=true) {
    const activeTableCellElement = this.activeTableCellElement;
    activeTableCellElement.classList.add(activeClass);
    if (shouldUpdateTimestamp) {
      this.updateActiveTimestamp();
    }
    if (shouldGetFocus) {
      activeTableCellElement.focus({preventScroll: true});
    }
  }
  activateTableHead(shouldGetFocus=true) {
    const activeTableCellElement = this.activeTableCellElement;
    const index = activeTableCellElement.cellIndex;
    if (isColumnLabel(activeTableCellElement)) {
      const columnSearch = getColumnSearch(index);
      columnSearch.classList.add(activeAccompanyClass);
    } else if (isColumnSearch(activeTableCellElement)) {
      const columnLabel = getColumnLabel(index);
      columnLabel.classList.add(activeAccompanyClass);
    }
    activeTableCellElement.classList.add(activeClass);
    if (shouldGetFocus) {
      activeTableCellElement.focus({preventScroll: true});
    }
  }
  activateTableCol() {
    const index = this.activeTableCellElement.cellIndex;
    const tableColElement = getTableColElement(index);
    if (tableColElement) {
      activeTableColElement = tableColElement;
      activeTableColElement.classList.add(activeClass);
    }
  }
  activateTableCellElement(tableCellElement: HTMLTableCellElement, shouldUpdateTimestamp=true, shouldGetFocus=true) {
    this.activeTableCellElement = tableCellElement;
    if (isTableData(tableCellElement)) {
      this.activateTableData(shouldUpdateTimestamp, shouldGetFocus);
      // record whether this table cell is editable
      isTableCellEditable(tableCellElement);
    } else if (isTableHead(tableCellElement)) {
      this.activateTableHead(shouldGetFocus);
    }
  }

  /* deactivate */
  deactivateTableData() {
    const activeTableCellElement = this.activeTableCellElement;
    activeTableCellElement.classList.remove(activeClass);
    activeTableCellElement.lastActiveTimestamp = null;
  }
  deactivateTableHead() {
    const index = this.activeTableCellElement.cellIndex;
    const columnLabel = getColumnLabel(index);
    const columnSearch = getColumnSearch(index);
    columnLabel.classList.remove(activeClass);
    columnSearch.classList.remove(activeClass);
    columnLabel.classList.remove(activeAccompanyClass);
    columnSearch.classList.remove(activeAccompanyClass);
  }
  deactivateTableCol() {
    if (activeTableColElement) {
      activeTableColElement.classList.remove(activeClass);
      activeTableColElement = null;
    }
  }
  deactivateTableCellElement() {
    const activeTableCellElement = this.activeTableCellElement;
    if (isTableData(activeTableCellElement)) {
      this.deactivateTableData();
    } else if (isTableHead(activeTableCellElement)) {
      this.deactivateTableHead();
      this.deactivateTableCol();
    }
    this.activeTableCellElement = null;
  }

  /**
   * @public
   * Use this function to change table cell element to ensure previous active element is properly deactivated
   */
  updateActiveTableCellElement(tableCellElement: HTMLTableCellElement | null, shouldGetFocus: boolean = true) {
    if (!tableCellElement) {
      return;
    }

    if (this.activeTableCellElement) {
      this.deactivateTableCellElement();
      deactivateSortPanel();
      // remove input form
      this.deactivateTableCellInputForm();
    }

    this.activateTableCellElement(tableCellElement, undefined, shouldGetFocus);
  }

  // input editor exit
  quitTableCellInputForm(saveContent = false) {
    const activeTableCellElement = this.activeTableCellElement;
    if (saveContent) {
      if (verifyEdit(tableCellInputFormInputElement.value, this.tableCellInputFormTargetElement)) {
        this.saveTableCellInputForm();
      } else {
        return;
      }
      // move to next cell to allow continuous edit
      if (activeTableCellElement) {
        const nextCell = getRightTableCellElement(activeTableCellElement);
        if (nextCell) {
          this.updateActiveTableCellElement(nextCell);
        }
      }
    }

    this.tableCellInputFormAssignTarget(null);
  }

  /* click event */
  tableCellElementOnClick(tableCellElement: HTMLTableCellElement, event: MouseEvent) {
    if (this.isClickOnActiveElement(tableCellElement)) {
      // handle repeated click differently
      this.activeElementOnRepeatedClick(event);
    } else {
      this.updateActiveTableCellElement(tableCellElement);
      recordCellClick(tableCellElement);
    }
    event.preventDefault();
  }

  tableCellElementOnKeyDown(tableCellElement: HTMLTableCellElement, event: ConsumableKeyboardEvent) {
    event.consumed = false;
    switch (event.key) {
      case "Down": // IE/Edge specific value
      case "ArrowDown":
        this.updateActiveTableCellElement(getDownTableCellElement(tableCellElement));
        event.consumed = true;
        break;
      case "Up": // IE/Edge specific value
      case "ArrowUp":
        this.updateActiveTableCellElement(getUpTableCellElement(tableCellElement));
        event.consumed = true;
        break;
      case "Left": // IE/Edge specific value
      case "ArrowLeft":
        this.updateActiveTableCellElement(getLeftTableCellElement(tableCellElement));
        event.consumed = true;
        break;
      case "Right": // IE/Edge specific value
      case "ArrowRight":
      case "Tab": // handle Tab as a pressing Right arrow
        this.updateActiveTableCellElement(getRightTableCellElement(tableCellElement));
        event.consumed = true;
        break;
      case "c": // handle potential CTRL+c or CMD+c
        this.tableCellElementOnCopy(tableCellElement, event);
        break;
      case "v":
        tableCellElementOnPasteKeyPressed(tableCellElement, event);
        break;
      case "Alt":
      case "AltLock":
      case "CapsLock":
      case "Control":
      case "Fn":
      case "FnLock":
      case "Hyper":
      case "Meta":
      case "NumLock":
      case "ScrollLock":
      case "Shift":
      case "Super":
      case "Symbol":
      case "SymbolLock":
        event.consumed = true;
    }
    if (event.consumed) {
      event.preventDefault();
    } else {
      tableCellElementOnInput(event);
    }
  }

  tableCellInputFormOnKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case "Esc": // IE/Edge specific value
      case "Escape":
        this.quitTableCellInputForm(false);
        break;
      case "Enter":
        this.quitTableCellInputForm(true);
        break;
    }
    event.stopPropagation();
  }

  /* restore */
  restoreActiveTableCellElement() {
    const activeTableCellElement = this.activeTableCellElement;
    if (!activeTableCellElement) {
      return;
    }

    if (isTableHead(activeTableCellElement)) {
      // no need to recover active element since table header is the active element (will not disappear because of scrolling)
      return;
    }

    const shouldGetFocus: boolean = !isColumnSearchInputFocused();
    // active element is in view: tableDataSectionRendered
    this.activateTableCellElement(activeTableCellElement, false, shouldGetFocus);
  }

  restoreCopyTarget() {
    const recoveredCopyTarget = this.copyTarget;
    if (recoveredCopyTarget) {
      // copy target is in view
      this.makeElementCopyTarget(recoveredCopyTarget as HTMLTableCellElement);
      return;
    }
  }

  static inputtingClass = "inputting";
  tableCellInputFormTargetElementId: string = null;

  get tableCellInputFormTargetElement(): HTMLTableCellElement {
    if (!this.tableCellInputFormTargetElementId) {
      return null;
    }
    return document.getElementById(this.tableCellInputFormTargetElementId) as HTMLTableCellElement;
  }

  set tableCellInputFormTargetElement(tableCellElement: HTMLTableCellElement) {
    if (tableCellElement) {
      this.tableCellInputFormTargetElementId = tableCellElement.id;
    } else {
      this.tableCellInputFormTargetElementId = null;
    }
  }


  activateTableCellInputFormLocation() {
    if (isTableCellInputFormActive() && !tableCellInputFormLocationActive) {
      tableCellInputFormLocateCellElement.classList.add(activeClass);
      tableCellInputFormLocationActive = true;
      // reposition the tableCellInputFormElement
      const buttonHeight = tableCellInputFormLocateCellElement.offsetHeight;
      const formTop = parseFloat(tableCellInputFormElement.style.top);
      tableCellInputFormElement.style.top = `${formTop - buttonHeight}px`;
    }
  }
  deactivateTableCellInputFormLocation() {
    tableCellInputFormLocateCellElement.classList.remove(activeClass);
    tableCellInputFormLocationActive = false;
  }

  updateTableCellInputFormLocation(targetHTMLTableCellElement: HTMLTableCellElement) {
    // row index
    /* since recordIndex is 0-based */
    const elementIndex = tableDataManager.getElementIndexByCellId(targetHTMLTableCellElement.id);
    tableCellInputFormLocateCellRowElement.textContent = `${elementIndex + 1}`;
    // column index
    const colIndex = targetHTMLTableCellElement.cellIndex;
    const columnLabelText = getColumnLabelText(getColumnLabel(colIndex));
    tableCellInputFormLocateCellColElement.textContent = columnLabelText;
  }

  restoreTableCellInputFormLocation() {
    if (tableCellInputFormLocationActive) {
      const cellid = this.tableCellInputFormTargetElementId;
      if (tableDataManager.isCellInRenderingView(cellid)) {
        // cell is in rendering view, only alignment is needed
        this.alignTableCellInputForm();
      } else {
        // cell not in rendering view, need to put cell into rendering view before setting alignment
        if (tableDataManager.putElementInRenderingViewByCellId(cellid)) {
          this.alignTableCellInputForm();
        }
      }
    }
  }

  activateTableCellInputForm(targetHTMLTableCellElement: HTMLTableCellElement, getFocus: boolean = true) {
    // show the form
    tableCellInputFormElement.classList.add(activeClass);

    // focus the input
    if (getFocus) {
      tableCellInputFormInputElement.focus({preventScroll: true});
    }

    // highlight the table head
    const cellIndex = targetHTMLTableCellElement.cellIndex;
    const columnLabel: HTMLTableCellElement = getColumnLabel(cellIndex);
    if (columnLabel) {
      columnLabel.classList.add(TableStatusManager.inputtingClass);
    }

    // highlight the target cell
    targetHTMLTableCellElement.classList.add(TableStatusManager.inputtingClass);
    this.tableCellInputFormTargetElement = targetHTMLTableCellElement;
  }

  /**
   * @public
   * Use this function to change the editor associated table cell.
   */
  tableCellInputFormAssignTarget(targetHTMLTableCellElement: HTMLTableCellElement, input?: string, getFocus: boolean = true) {
    // ignore if input on table head
    if (isTableHead(targetHTMLTableCellElement)) {
      return;
    }

    this.deactivateTableCellInputForm();
    this.deactivateTableCellInputFormLocation();

    tableCellInputFormInputElement.value = "";
    deactivateInvalidFeedback();

    if (targetHTMLTableCellElement) {
      if (!isTableCellEditable(targetHTMLTableCellElement)) {
        return;
      }

      this.activateTableCellInputForm(targetHTMLTableCellElement, getFocus);
      updateTableCellInputFormInput(targetHTMLTableCellElement, input);

			// remount the fuse select
			fuseSelect.mount(element => tableCellInputFormInputContainer.appendChild(element));
			const columnLabel = getColumnLabel(targetHTMLTableCellElement.cellIndex);
			updateFuseSelect(getIdSuggestion(targetHTMLTableCellElement), getIdSuggestionType(columnLabel), () => {
				this.alignTableCellInputForm();
				// resize form editor
				updateTableCellInputFormWidthToFitText(fuseSelect.longestText);
			});

      this.updateTableCellInputFormLocation(targetHTMLTableCellElement);
			updateTableCellInputFormWidthToFitText(fuseSelect.longestText);
      this.alignTableCellInputForm();
    }
  }

  alignTableCellInputForm(tableCellInputFormLocateCellElementActive: boolean = tableCellInputFormLocationActive) {
    // reset last shifting
    tableCellInputFormElement.style.transform = "";
    tableCellInputFormElementXShift = 0;
    tableCellInputFormElementYShift = 0;

    // configure placement
    const targetCellElement = this.tableCellInputFormTargetElement;
    const cellDimensions = targetCellElement.getBoundingClientRect();
    const cellHeight = cellDimensions.height;
    let {top: cellTop, bottom: cellBottom} = cellDimensions;
    let {width: formWidth, height: formHeight} = tableCellInputFormElement.getBoundingClientRect();

    const verticalScrollBarWidth = tableScrollContainer.offsetWidth - tableScrollContainer.clientWidth;
    const viewportWidth = getViewportWidth() - verticalScrollBarWidth;
    const horizontalScrollBarHeight = tableScrollContainer.offsetHeight - tableScrollContainer.clientHeight;
    const viewportHeight = getViewportHeight() - horizontalScrollBarHeight;

    const topFromPageTopLimit = tableDataManager.topFromPageTop;
    // the concerned viewport is restricted to the table rows in <tbody>
    const viewportTopPadding = topFromPageTopLimit;
    const bottomFromPageTopLimit = Math.max(viewportHeight, tableDataManager.bottomFromPageTop);

    if (formWidth > viewportWidth) {
      formWidth = viewportWidth;
      tableCellInputFormElement.style.width = `${formWidth}px`;
    }

    /* set horizontal placement */
    alignElementHorizontally(tableCellInputFormElement, cellDimensions);

    if (formHeight > viewportHeight) {
      fuseSelect.unmount();
      formHeight = tableCellInputFormElement.getBoundingClientRect().height;
    }
    /**
     * set vertical placement
     * two choices for vertical placement
     *   1. top border (offset by buttonHeight) of form stick to the top border of the target cell
     *   2. bottom border of form stick to the bottom border of the target cell
     */
    const buttonHeight = tableCellInputFormLocateCellElementActive? tableCellInputFormLocateCellElement.offsetHeight: 0;

    const cellTopFromPageTop = targetCellElement.offsetTop;
    const cellBottomFromPageTop = cellTopFromPageTop + cellHeight;
    let formTop: number;
    if (cellTopFromPageTop + formHeight - buttonHeight < bottomFromPageTopLimit) {
      // option 1
      if (cellTop < viewportTopPadding) {
        // top border of form is to the top of the viewport
        const upShiftAmount: number = viewportTopPadding - cellTop;
        cellTop += upShiftAmount;
        tableScrollContainer.scrollTop -= upShiftAmount;
      } else if (cellTop + formHeight - buttonHeight > viewportHeight) {
        // bottom border of form is to the bottom of the viewport
        const downShiftAmount: number = cellTop + formHeight - buttonHeight - viewportHeight;
        cellTop -= downShiftAmount;
        tableScrollContainer.scrollTop += downShiftAmount;
      }
      formTop = cellTop - buttonHeight;
    } else if (cellBottomFromPageTop - formHeight + buttonHeight >= topFromPageTopLimit) {
      // option 2
      if (cellBottom > viewportHeight) {
        // bottom border of form is to the bottom of the viewport
        const downShiftAmount: number = cellBottom - viewportHeight;
        cellBottom -= downShiftAmount;
        tableScrollContainer.scrollTop += downShiftAmount;
      } else if (cellBottom - formHeight + buttonHeight < viewportTopPadding) {
        // top border of form is to the top of the viewport
        const upShiftAmount: number = viewportTopPadding - (cellBottom - formHeight + buttonHeight);
        cellBottom += upShiftAmount;
        tableScrollContainer.scrollTop -= upShiftAmount;
      }
      formTop = cellBottom - formHeight + buttonHeight;
    }
    tableCellInputFormElement.style.top = `${formTop}px`;
  }

  saveTableCellInputForm() {
    const tableCellInputFormTargetElement = this.tableCellInputFormTargetElement;
    const text = tableCellInputFormInputElement.value;
    if (tableCellInputFormTargetElement) {
      // call backend api to send user submission
      recordCellEdit(tableCellInputFormTargetElement, text, idSuggestion => tableDataManager.updateCellInRenderingView(tableCellInputFormTargetElement.id, {
        id: idSuggestion.toString(),
        textContent: text,
      }, true));
    }
  }

  tableCellInputFormLocationOnScroll() {
    this.activateTableCellInputFormLocation();
  }

  deactivateTableCellInputForm() {
    const tableCellInputFormTargetElement = this.tableCellInputFormTargetElement;
    if (isTableCellInputFormActive()) {
      // hide the form
      tableCellInputFormElement.classList.remove(activeClass);

      // unhighlight the table head
      const columnLabel: HTMLTableCellElement = tableColumnLabels.querySelector(`.${TableStatusManager.inputtingClass}`);
      if (columnLabel) {
        columnLabel.classList.remove(TableStatusManager.inputtingClass);
      }

      // unhighlight the target cell
      if (tableCellInputFormTargetElement) {
        this.tableCellInputFormTargetElement = null;
      }
    }
  }

  tableDataElementOnInput(tableDataElement: HTMLTableCellElement, event: ConsumableKeyboardEvent) {
    this.tableCellInputFormAssignTarget(tableDataElement);
    event.consumed = true;
  }

  restoreTableCellInputFormTargetElement() {
    const tableCellInputFormTargetElement = this.tableCellInputFormTargetElement;
    if (tableCellInputFormTargetElement) {
      const getFocus: boolean = !isColumnSearchInputFocused();
      // form target is in view
      this.tableCellInputFormAssignTarget(tableCellInputFormTargetElement, undefined, getFocus);
    } else {
      if (!isTableCellInputFormActive()) {
        return;
      }

      if (tableDataManager.isCellInPotentialRenderingView(this.tableCellInputFormTargetElementId)) {
        // row index
        const elementIndex = tableDataManager.getElementIndexByCellId(this.tableCellInputFormTargetElementId);
        tableCellInputFormLocateCellRowElement.textContent = `${elementIndex + 1}`;
      } else {
        // the target element has moved out of view
        this.tableCellInputFormAssignTarget(null);
      }
    }
  }

  restoreStatus() {
    this.restoreActiveTableCellElement();
    this.restoreCopyTarget();
    this.restoreTableCellInputFormTargetElement();
  }
}

initializeFuseSelect(tableCellInputFormInputElement, (element: HTMLElement) => tableCellInputFormInputContainer.appendChild(element));
const tableStatusManager: TableStatusManager = new TableStatusManager();
const tableDataManager = new TableDataManager(tableElement, document.getElementById("table-data"), tableScrollContainer, tableRowHeight, undefined, () => tableStatusManager.restoreStatus());
// sort on University A-Z
tableCellSortButtonOnClick(tableElement.querySelectorAll(".sort-btn")[1] as HTMLButtonElement, false);
