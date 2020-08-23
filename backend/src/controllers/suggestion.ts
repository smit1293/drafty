import { Request, Response, NextFunction } from "express";
import { getSuggestionsWithSuggestionType, newSuggestion, selectSuggestionsForEdit, insertRowId } from "../database/suggestion";
import { isValidIdSuggestionType } from "../validation/validators";

/**
 * GET /suggestions?idSuggestionType=...
 * get suggestions
 */
export const getSuggestions = async (req: Request, res: Response, next: NextFunction) => {
  if (await isValidIdSuggestionType(req) === false) {
    return res.sendStatus(400);
  }
  const idSuggestionType = req.query.idSuggestionType as string;
  const suggestionType: number = Number.parseInt(idSuggestionType);

  // valid suggestion type, get suggestions from database
  const [error, results] = await getSuggestionsWithSuggestionType(suggestionType);
  if (error) {
    return next(error);
  }

  return res.status(200).json(results);
};


/**
 * GET /suggestions/foredit?idSuggestion=...
 * get suggestions
 */
export const getSuggestionsForEdit = async (req: Request, res: Response, next: NextFunction) => {
  const idSuggestion: number = Number.parseInt(req.query.idSuggestion as string);

  // valid suggestion type, get suggestions from database
  const [error, results] = await selectSuggestionsForEdit(idSuggestion);
  if (error) {
    return next(error);
  }

  return res.status(200).json(results);
};

/**
 * POST /suggestions/new
 * save suggestion (edit)
 *
 * @param {number} req.body.idUniqueID
 * @param {number} req.body.idSuggestion
 * @param {string} req.body.value
 */
export const postNewSuggestion = async (req: Request, res: Response, next: NextFunction) => {
  //const idUniqueID: string = req.body.idUniqueID; //sw: unused
  const idSuggestion: number = Number.parseInt(req.body.idSuggestion);
  const suggestion: string = req.body.suggestion;

  const idProfile: number = Number.parseInt(req.session.user.idProfile);
  const idSession: number = req.session.user.idSession;

  const idInteractionType = 6; // 6 = editRecord
  const idEntryType = 2; // 2 = EditOnline
  const mode = "normal"; // normal is default

  // will get new/old idSuggestion for the edited cell
  const [error, results] = await newSuggestion(idSuggestion, suggestion, idProfile, idSession, idInteractionType, idEntryType, mode);
  if (error) {
    return next(error);
  }

  return res.status(200).json(results);
};

/**
 * POST /new-row
 * Add new row
 *
 * @param {Array<String>} req.body.newRowValues - Contains each value for the new row stored in an array.
 * @param {Array<number>} req.body.newRowFields - Contains the idSuggestionType for each corresponding value in newRowValues.
 * @return {Record<string, number | Array<number> | Array<string>}
 *
 *    {
 *        "idUniqueID": <idUniqueID>,
 *        "newRowIds": Array<idSuggestion>,
 *        "newRowFields": Array<idSuggestionType>
 *    }
 */
export const postNewRow = async (req: Request, res: Response) => {
  const rowValues = req.body.rowValues;
  const rowFields = req.body.rowFields;
  console.log("postNewRow: " + rowValues);
  console.log("postNewRow: " + rowFields);
  try {
    const idUniqueID = await getNewUniqueID();
    //const idInteraction = await getIdInteraction();
    //const idEdit = await getIdEdit();

    const newRowIds: number[] = [];
    const newRowFields: number[] = [];
    for(var i = 0; i < rowFields.length; ++i ) {
      const val = rowValues[i] + 1;
      const field = rowFields[i] + 1;
      console.log(val,field);

      // need a new procedure since we know the uniqueId
      // double-check how we record new rows

      /*
      
      1. insert uniqueId
      2. insert edit
      3. insert all edits
        3a. 

      */
    }

    return res.status(200).json({
      idUniqueID: idUniqueID,
      newRowIds: newRowIds,
      newRowFields: newRowFields
    });
  } catch (error) {
    return res.sendStatus(400);
  }
};

const getNewUniqueID = async () => {
  const [error,results] = await insertRowId();
  if (error) {
    return error;
  }
  return results.insertId;
};

/**
 * POST /new-row
 * Add new row
 *
 * @param {Array<String>} req.body.newRowValues - Contains each value for the new row stored in an array.
 * @param {Array<number>} req.body.newRowFields - Contains the idSuggestionType for each corresponding value in newRowValues.
 * @return {Record<string, number | Array<number> | Array<string>}
 *
 *    {
 *        "idUniqueID": <idUniqueID>,
 *        "newRowIds": Array<idSuggestion>,
 *        "newRowFields": Array<idSuggestionType>
 *    }
 */
export const postNewRowTest = (req: Request, res: Response) => {
  // check for errors
  const rowvalues = req.body.rowValues;
  console.log("postNewRow: " + rowvalues);
  try {
    // TODO change stub
    return res.status(200).json({
      idUniqueID: 100000,
      newRowIds: [1000000, 1000001, 1000002, 1000003, 1000004, 1000005, 1000006],
      newRowFields: [1, 2, 3, 5, 7, 8, 9]
    });
  } catch (error) {
    return res.sendStatus(400);
  }
};
