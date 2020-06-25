import { BasicView } from "./table-data-manager/View";
import { SortingFunctionWithPriority } from "./table-data-manager/ViewFunction";
import { ViewModel } from "./table-data-manager/ViewModel";
import { getTableRow, getRowIndexInSection } from "../../dom/sheet";


function getOffsetFromPageTop(element: HTMLElement): number {
  let offset = 0;
  while (element.offsetParent) {
    offset += element.offsetTop;
    element = element.offsetParent as HTMLElement;
  }
  return offset;
}


export class TabularView extends BasicView {
  get startFillerFromPageTop(): number {
    return getOffsetFromPageTop(this.scrollHandler.startFillerElement);
  }

  get endFillerFromPageTop(): number {
    return getOffsetFromPageTop(this.scrollHandler.endFillerElement);
  }

  get sortingFunctions(): Map<any, SortingFunctionWithPriority<ViewModel>> {
    return this.sortedView.sortingFunctions;
  }

  getElementIndex(element: HTMLTableRowElement): number {
    const currentViewIndex = getRowIndexInSection(element);
    return currentViewIndex + this.partialView.numElementNotRenderedBefore;
  }

  isElementInRenderingView(element: HTMLTableRowElement): boolean {
    return element.parentElement === this.sourceViewModel.element_;
  }

  putElementInRenderingView(element: HTMLTableRowElement): boolean {
    const viewModel = this.sourceViewModel.getChildByElement__(element);
    const elementIndex = this.view.indexOf(viewModel);
    if (elementIndex === -1) {
      return false;
    }
    this.scrollHandler.scrollToElementIndex(elementIndex);
    return true;
  }
}