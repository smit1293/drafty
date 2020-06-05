/**
 * @module This file stores the various server API endpoint as getter functions.
 *
 * Each function is named as:
 *    method + name + URL
 *
 * @example
 * getEditSuggestionURL
 *
 * Function parameters are query parameters whose names are simply key names
 */


// suggestions


export function getEditSuggestionURL(idSuggestion: number) {
  return `/suggestions/foredit?idSuggestion=${idSuggestion}`;
}


// interactions


export function postCellClickURL() {
  return "/click";
}

export function postCellDoubleClickURL() {
  return "/click-double";
}

export function postCellCopyURL() {
  return "/copy-cell";
}

export function postColumnCopyURL() {
  return "/copy-column";
}

export function postColumnSortURL() {
  return "sort";
}

export function postColumnCompleteSearchURL() {
  return "search-full";
}
export function postColumnPartialSearchURL() {
  return "search-full";
}