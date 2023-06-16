//------------------------------- CONSTANTS ------------------------------------

export const errorTxtUploadedFilesNotArray =
    'The "fetchRemoteFiles" function must return a promise that resolves with an array of items with type "IFileData" or an empty array';
export const errorTxtUploadedFileFailedValidation = `Response failed validation in the 'checkResult' function`;
export const errorTxtInvalidFileFields = `File must be an object with required fields [fileName, fileSize]. Use the 'fileFieldMapping' property to set the mapping function`;
export const errorTxtWrongUploadParams =
    'Wrong upload parameters. Make sure the "getUploadParams" function is correct';

//--------------------------------- TYPES --------------------------------------

/**
 * Represents the error codes used in the file manager.
 */
export type TErrorCodes =
    | 'unexpected_error'
    // | 'abort_on_unmount'
    | 'upload_aborted'
    | 'upload_timeout'
    | 'upload_wrong_result'
    | 'upload_error'
    | 'delete_error'
    | 'download_error'
    | 'view_error'
    | 'rename_error'
    | 'multiple_not_allowed'
    | 'exceed_max_file_count'
    | 'invalid_size_max'
    | 'invalid_size_min'
    | 'invalid_type'
    | 'file_exists'
    | 'validation_error';

type TError = {
    message: string;
    data?: any;
};

/**
 * Type for internal errors.
 */
export type TInternalError = {
    errorId: TErrorCodes;
} & TError;

/**
 * Type for custom errors used in the file validator function.
 */
export type TCustomError = {
    errorId: string;
} & TError;

export type TThrowError = (errorId: TErrorCodes, message: string, data?: any) => void;

/**
 * Callback function for handling errors.
 */
export type TOnError = <T extends TInternalError | TCustomError>(args: T | T[]) => void;

//  --------------------------------------------------------------------------------

export const getUploadErrorId = (error: { type: string }): TErrorCodes =>
    error.type === 'abort'
        ? 'upload_aborted'
        : error.type === 'timeout'
        ? 'upload_timeout'
        : error.type === 'wrong_result'
        ? 'upload_wrong_result'
        : 'upload_error';
