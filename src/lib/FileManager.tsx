import React, {
    ReactElement,
    Ref,
    useRef,
    useReducer,
    useEffect,
    useCallback,
    useImperativeHandle,
    forwardRef,
} from 'react';

import PropTypes from 'prop-types';

import {
    IOverriddenRoot,
    IRootComponentProps,
    IRootEventProps,
    RootComponent,
} from './RootComponent';

import {
    FileItemComponent,
    IFileItemProps,
    IRemoteFileData,
    ILocalFileData,
    IFileData,
    IOverriddenFileItem,
    IItemMountState,
    IItemRef,
    IFileItemComponentProps,
    TFileSizeFormatter,
} from './FileItemComponent';

import DefaultFileItemRenderer from './DefaultFileItemRenderer';

import {
    guid,
    formatSize as internalFileSizeFormatter,
    saveBlob,
    openBlob,
    submitFormData,
    isEventWithFiles,
    accepts,
    isDragReject,
    makeQueryablePromise,
} from './Utils';

import generatePreview, { TFilePreview } from './Utils/file-preview';

import { PartialBy, SameType } from './Utils/types';

import { getDataTransferFiles } from './Utils/file-selector';
import {
    errorTxtUploadedFilesNotArray,
    errorTxtUploadedFileFailedValidation,
    errorTxtInvalidFileFields,
    errorTxtWrongUploadParams,
    TErrorCodes,
    TInternalError,
    TCustomError,
    TThrowError,
    TOnError,
    getUploadErrorId,
} from './Utils/errors';

//--------------------------------- TYPES --------------------------------------

type TMethod = 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT';

type TUploadError = {
    message: string;
    data: ILocalFileData | ILocalFileData[];
    errorId?: TErrorCodes;
};

/**
 * Represents the upload parameters required by the TGetUploadParams function.
 */
export type TUploadParams = {
    URL: string;
    /**
     * The name of the file field in the upload request
     */
    fileFieldName?: string;
    /**
     * Additional fields to be included in the upload request.
     */
    fields?: { [name: string]: string | Blob };
    /**
     * The body of the upload request.
     */
    body?: BodyInit;
    /**
     * The headers to be included in the upload request.
     */
    headers?: { [name: string]: string };
    method?: TMethod;
    /**
     * The timeout duration for the upload request, in milliseconds.
     * If set to a non-zero value, uploading will terminate after the specified time has passed.
     */
    timeout?: number;
    /**
     * A function to check the result of the upload request and determine if it was successful.
     */
    checkResult?: (result: any) => boolean;
    /**
     * A function to process the response received from the upload request.
     */
    processResponse?: (response: any) => any;
    /**
     * A function to process any errors that occur during the upload request and return a string error message.
     */
    processError?: (error: any) => string;
};

/**
 * A function that returns the upload parameters required for file uploads.
 */
export type TGetUploadParams = (
    localFileData: ILocalFileData | ILocalFileData[]
) => TUploadParams | Promise<TUploadParams>;

type TFetchRemoteFiles = () => Promise<any>;

/**
 * Represents a file manager reference that provides imperative methods for interacting with the file manager.
 */
export interface IFileManagerRef {
    /**
     * Opens a file dialog to select local files.
     */
    openFileDialog: () => void;
    /**
     * Adds local files to the file manager. Can be useful when adding files from the clipboard.
     * @param files - The files to add. Can be a FileList object, a single File object, or an array of File objects.
     */
    addLocalFiles: (files: FileList | File | File[]) => void;
    /**
     * Removes all locally added files from the file manager.
     */
    removeAllLocalFiles: () => void;
    /**
     * Forces an update of the file manager.
     */
    update: () => void;
    /**
     * Uploads local files to a remote server.
     * @param getUploadParams - An optional function that provides the upload parameters. If not specified, the function declared in the getUploadParams property is used as the default implementation.
     * @returns A Promise that resolves when the upload is complete.
     */
    upload: (getUploadParams?: TGetUploadParams) => Promise<any>;
    /**
     * Cancels the ongoing upload process.
     */
    cancelUpload: () => void;
    /**
     * Retrieves remote files from a server.
     * @param request - If not specified, the function declared in the fetchRemoteFiles property is used as the default implementation.
     * @returns A Promise that resolves with an array of remote file data.
     */
    fetchRemoteFiles: (request?: TFetchRemoteFiles) => Promise<IRemoteFileData[]>;
    /**
     * A list of remote files displayed in the file manager.
     */
    remoteFiles: IRemoteFileData[];
    /**
     * A list of local (accepted) files displayed in the file manager.
     */
    localFiles: ILocalFileData[];
}

type TComparedData = Pick<Readonly<IFileItemProps>, 'fileData' | 'isLocalFile'>;
/**
 * Represents a function used for sorting files.
 * The function takes two compared data objects and returns a number indicating the sort order.
 * @param a The first compared data object.
 * @param b The second compared data object.
 * @returns A number representing the sort order.
 */
export type TSortFunc = (a: TComparedData, b: TComparedData) => number;

/**
 * The file validator function allows performing custom validation logic on files.
 * @param file The file to be validated.
 * @param localFiles An array of local file data.
 * @param remoteFiles An array of remote file data.
 * @returns A custom error object, an array of custom error objects, or null if the file is valid.
 */
export type TFileValidator<T = PartialBy<TCustomError, 'errorId'>> = (
    file: File,
    localFiles: ILocalFileData[],
    remoteFiles: IRemoteFileData[]
) => T | T[] | null;

/**
 * Represents the override options for customizing the behavior and appearance of the file manager.
 */
export type TOverrides = {
    /**
     * A function that generates a unique identifier (UID) for file items.
     * If not provided, a default UID generator will be used.
     */
    uidGenerator?: () => string;
    /**
     * A function that formats the file size for display.
     * If not provided, a default function will be used.
     */
    fileSizeFormatter?: TFileSizeFormatter;
    /**
     * This allows overriding the default root component with a custom implementation.
     */
    Root?: IOverriddenRoot;
    /**
     * This allows overriding the default file item component with a custom implementation.
     */
    FileItem?: IOverriddenFileItem;
};

/**
 * Represents the properties for the file manager component.
 */
export interface IFileManagerProps {
    /**
     * Ref callback that gets a DOM reference to the root body element. Can be useful to programmatically scroll.
     * @param root The root body element of the file manager.
     */
    getRoot?: (root: HTMLElement) => void;

    /**
     * Function to retrieve the upload parameters such as URL, headers, etc.
     *
     * See {@link https://www.npmjs.com/package/@nolesh/react-file-manager#getuploadparams getUploadParams} for more information.
     * @returns An object or promise with the parameters required to upload files
     */
    getUploadParams?: TGetUploadParams;

    /**
     * Retrieves remote files from the server.
     *
     * See {@link https://www.npmjs.com/package/@nolesh/react-file-manager#fetchRemoteFiles fetchRemoteFiles} for more information.
     * @returns A promise that resolves to an array of remote file data.
     */
    fetchRemoteFiles?: TFetchRemoteFiles;

    /**
     * Map the file fields received from the server to the file manager's file fields. This property can be omitted if the file manager's file fields match the fields on the server.
     *
     * See {@link https://www.npmjs.com/package/@nolesh/react-file-manager#fileFieldMapping fileFieldMapping} for more information.
     * @param data The data to be mapped.
     * @returns The mapped file data.
     */
    fileFieldMapping?: (data: any) => IFileData;

    /**
     * Remove remote file from the server.
     *
     * See {@link https://www.npmjs.com/package/@nolesh/react-file-manager#deleteFile deleteFile} for more information.
     * @param fileData The data of the file to be deleted.
     * @returns A promise that resolves once the file is deleted.
     */
    deleteFile?: (fileData: IRemoteFileData) => Promise<void>;

    /**
     * Download remote file.
     *
     * See {@link https://www.npmjs.com/package/@nolesh/react-file-manager#downloadFile downloadFile} for more information.
     * @param fileData The data of the file to be downloaded.
     * @returns A promise that resolves to the downloaded file blob and file name.
     */
    downloadFile?: (
        fileData: IRemoteFileData
    ) => Promise<{ blob: Blob; fileName: string } | Blob | void>;

    /**
     * View remote file.
     *
     * See {@link https://www.npmjs.com/package/@nolesh/react-file-manager#viewFile viewFile} for more information.
     * @param fileData The data of the file to be viewed.
     * @returns A promise that resolves to the file blob.
     */
    viewFile?: (fileData: IRemoteFileData) => Promise<Blob | void>;

    /**
     * Set the description for the remote file.
     *
     * See {@link https://www.npmjs.com/package/@nolesh/react-file-manager#setFileDescription setFileDescription} for more information.
     * @param fileData The file data to set the description for.
     * @returns A promise that resolves to the file description.
     */
    setFileDescription?: (fileData: IRemoteFileData) => Promise<string>;

    /**
     * A function that sorts local and remote files.
     *
     * See {@link https://www.npmjs.com/package/@nolesh/react-file-manager#sortFiles sortFiles} for more information.
     */
    sortFiles?: TSortFunc;

    /**
     * Function to provide a custom file preview for unsupported file types or override the default implementation.
     *
     * See {@link https://www.npmjs.com/package/@nolesh/react-file-manager#filePreview filePreview} for more information.
     */
    filePreview?: TFilePreview;

    /**
     * A custom function for file validation.
     * @param files The files to be validated.
     * @returns An array of file validation errors.
     */
    fileValidator?: TFileValidator;

    /**
     * Callback for when files have been uploaded.
     * @param fileData An array containing the data of uploaded files.
     */
    onFilesUploaded?: (fileData: IRemoteFileData[]) => void;

    /**
     * Callback for when files are uploading. Fires every 100ms.
     * @param progress The upload progress percentage.
     * @param sentBytes The number of bytes sent.
     * @param totalBytes The total number of bytes to be sent.
     */
    onUploadProgress?: (progress: number, sentBytes: number, totalBytes: number) => void;

    /**
     * Callback for when files are fetching or uploading.
     * @param isLoading Whether the file manager is currently loading.
     * @param isUploading Whether the file manager is currently uploading files.
     */
    onLoading?: (isLoading: boolean, isUploading: boolean) => void;

    /**
     * Callback for when files are accepted or rejected based on the accept, multiple, minFileSize and other props.
     * @param acceptedFiles The list of accepted files.
     * @param fileRejections The rejected files and their error messages.
     */
    onDropFiles?: (
        acceptedFiles: File[],
        fileRejections: { file: File; errors: TInternalError[] }[]
    ) => void;

    /**
     * Callback for when any of the local files have been added or removed.
     * @param result The resulting local file data after the change.
     * @param changedFiles The data of files that have changed in the local file stack.
     */
    onChangeLocalFileStack?: (result: ILocalFileData[], changedFiles: ILocalFileData[]) => void;

    /**
     * Callback for when any of the file items (local and/or remote) have been mounted or unmounted.
     * @param changedItems The items that have changed mount states.
     * @param mountedItems The currently mounted items.
     * @param unmountedItems The currently unmounted items.
     */
    onChangeItemMountStates?: (
        changedItems: IItemMountState[],
        mountedItems: IItemMountState[],
        unmountedItems: IItemMountState[]
    ) => void;

    /**
     * Callback for when an error occurs.
     *
     * See {@link https://www.npmjs.com/package/@nolesh/react-file-manager#onError onError} for more information.
     */
    onError?: TOnError;

    /**
     * Callback for when component is unmounted.
     * @param root The root element of the file manager.
     * @param fileInput The file input element of the file manager.
     */
    onUnmountComponent?: (root: HTMLDivElement, fileInput: HTMLInputElement) => void;

    /**
     * Enables the user to add a custom description to a file.
     */
    addFileDescription?: boolean;

    /**
     * If true, multiple files will be uploaded in one request.
     */
    uploadFilesInOneRequest?: boolean;

    /**
     * Determines how duplicate files are handled during file acceptance.
     * - 'none': No duplicate file checking is performed.
     * - 'local': Check for duplicates among local files only.
     * - 'remote': Check for duplicates among remote (uploaded) files only.
     * - 'all': Check for duplicates among both local and remote files.
     */
    checkFileDuplicates?: 'none' | 'local' | 'remote' | 'all';

    /**
     * Maximum number of files allowed for local (accepted) and remote (uploaded) files.
     * The default value is undefined, which indicates no limitation on the number of accepted files.
     */
    maxFileCount?: number;

    /**
     * The maximum file size in bytes.
     */
    maxFileSize?: number;

    /**
     * The minimum file size in bytes.
     */
    minFileSize?: number;

    /**
     * The accepted file types based on MIME type.
     * This prop must be a valid {@link http://www.iana.org/assignments/media-types/media-types.xhtml MIME type}
     * according to {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file input element specification} or a valid file extension.
     */
    accept?: string;

    /**
     * If true, automatically uploads files as soon as they are accepted.
     */
    autoUpload?: boolean;

    /**
     * If false, allow dropped items to take over the current browser window.
     */
    preventDropOnDocument?: boolean;

    /**
     * Indicates whether the file manager is in read-only mode.
     */
    readOnly?: boolean;

    /**
     * Indicates whether the file manager is disabled.
     */
    disabled?: boolean;

    /**
     * Indicates whether multiple files can be selected.
     */
    multiple?: boolean;

    /**
     * If true, disables click to open the native file selection dialog.
     */
    noClick?: boolean;

    /**
     * If true, disables the drag 'n' drop feature.
     */
    noDrag?: boolean;

    /**
     * If true, disables SPACE/ENTER to open the native file selection dialog.
     */
    noKeyboard?: boolean;

    /**
     * Sets the tabindex attribute on the root component.
     */
    tabIndex?: number;

    /**
     * Allows overriding the root and file item components.
     *
     * See {@link https://www.npmjs.com/package/@nolesh/react-file-manager#overrides overrides} for more information.
     */
    overrides?: TOverrides;
}

// -----------------------------------------------------------------------------

interface IState {
    // isFocused: boolean;
    isLoading: boolean;
    isUploading: boolean;
    localFiles: ILocalFileData[];
    remoteFiles: IRemoteFileData[];
    forceUpdateTrigger: boolean;
    dragData: SameType<boolean, 'active' | 'reject'>;
}

type TAction =
    | { type: 'forceUpdate' | 'reset' }
    | {
          type: 'setDragData';
          dragData: {
              active: boolean;
              reject: boolean;
          };
      }
    | {
          type: 'setIsLoading' | 'setIsUploading' | 'setIsFocused';
          result: boolean;
      }
    | {
          type: 'setLocalFiles';
          result: ILocalFileData[];
      }
    | {
          type: 'setRemoteFiles';
          result: ((files: IRemoteFileData[]) => IRemoteFileData[]) | IRemoteFileData[];
      };

const initialState: IState = {
    isLoading: false,
    isUploading: false,
    forceUpdateTrigger: false,
    localFiles: [],
    remoteFiles: [],
    dragData: {
        active: false,
        reject: false,
    },
};

function reducer(state: IState, action: TAction): IState {
    switch (action.type) {
        case 'setIsLoading':
            return {
                ...state,
                isLoading: action.result,
            };
        case 'setIsUploading':
            return {
                ...state,
                isUploading: action.result,
            };
        case 'setDragData':
            const { active, reject } = action.dragData;
            return {
                ...state,
                dragData: {
                    active: active,
                    reject: reject,
                },
            };
        case 'setLocalFiles':
            return {
                ...state,
                localFiles: action.result,
            };
        case 'setRemoteFiles':
            return {
                ...state,
                remoteFiles:
                    typeof action.result === 'function'
                        ? action.result(state.remoteFiles)
                        : action.result,
            };
        case 'forceUpdate':
            return {
                ...state,
                forceUpdateTrigger: !state.forceUpdateTrigger,
            };
        /* istanbul ignore next */
        default:
            return state;
    }
}

/**
 * File Manager Component
 */
const FileManager = forwardRef(
    (
        {
            getRoot,
            getUploadParams,
            /* istanbul ignore next */
            fetchRemoteFiles = () => Promise.resolve([]),
            fileFieldMapping,
            deleteFile,
            downloadFile,
            viewFile,
            setFileDescription,
            sortFiles,
            /* istanbul ignore next */
            filePreview = () => Promise.resolve(),
            fileValidator,
            onFilesUploaded,
            onUploadProgress,
            onLoading,
            onDropFiles,
            onChangeLocalFileStack,
            onChangeItemMountStates,
            onError,
            onUnmountComponent,
            addFileDescription,
            uploadFilesInOneRequest: uploadInOneRequest,
            checkFileDuplicates = 'all',
            maxFileCount,
            maxFileSize,
            minFileSize,
            accept = '*',
            autoUpload,
            preventDropOnDocument = true,
            readOnly,
            disabled,
            multiple = true,
            noClick = false,
            noDrag = false,
            noKeyboard = false,
            tabIndex = 0,
            overrides = null,
        }: IFileManagerProps,
        ref: Ref<IFileManagerRef>
    ): ReactElement => {
        const fileInputRef = useRef<HTMLInputElement>();
        const rootRef = useRef<HTMLDivElement>();
        const itemRefs = useRef<IItemRef[]>();
        const itemMountStates = useRef<IItemMountState[]>();
        const savedSortOrder = useRef<string[]>();

        const dataRef = useRef<{
            dragTargetElement: EventTarget;
            onSortFunc: TSortFunc;
            isMounted: boolean;
            uploadingFiles: {
                fileData: ILocalFileData;
                promise: ReturnType<typeof makeQueryablePromise> | null;
            }[];
            uploadPromises: Promise<unknown>[];
        }>({
            dragTargetElement: null,
            onSortFunc: null,
            isMounted: false,
            uploadingFiles: [],
            uploadPromises: [],
        });

        const uploadProgressData = useRef<{
            requests: number;
            intervalId: number;
            cancelUploadFunc: () => void;
        }>({
            requests: 0,
            intervalId: null,
            cancelUploadFunc: null,
        });

        const [state, dispatch] = useReducer(reducer, initialState);
        const { isLoading, isUploading, forceUpdateTrigger, localFiles, remoteFiles, dragData } =
            state;

        const safeDispatch = useCallback(
            (value: TAction) => dataRef.current.isMounted && dispatch(value),
            [dispatch, dataRef.current.isMounted]
        );

        const setIsLoading = useCallback(
            (state: boolean) => safeDispatch({ type: 'setIsLoading', result: state }),
            [safeDispatch]
        );
        const setIsUploading = useCallback(
            (state: boolean) => safeDispatch({ type: 'setIsUploading', result: state }),
            [safeDispatch]
        );
        const forceUpdate = useCallback(
            () => safeDispatch({ type: 'forceUpdate' }),
            [safeDispatch]
        );
        const setLocalFiles = useCallback(
            (files: ILocalFileData[]) => safeDispatch({ type: 'setLocalFiles', result: files }),
            [safeDispatch]
        );
        const setRemoteFiles = useCallback(
            (files: IRemoteFileData[] | ((files: IRemoteFileData[]) => IRemoteFileData[])) =>
                safeDispatch({ type: 'setRemoteFiles', result: files }),
            [safeDispatch]
        );
        const setDragData = useCallback(
            (data: SameType<boolean, 'active' | 'reject'>) =>
                safeDispatch({ type: 'setDragData', dragData: data }),
            [safeDispatch]
        );

        const setSortFilesFunc = useCallback((f) => {
            dataRef.current.onSortFunc = f;
        }, []);

        const generateUID = useCallback(overrides?.uidGenerator ?? guid, [overrides?.uidGenerator]);
        const formatSize = useCallback(overrides?.fileSizeFormatter ?? internalFileSizeFormatter, [
            overrides?.fileSizeFormatter,
        ]);

        const isExceededMaxFileNum = useCallback(
            () => !!maxFileCount && (remoteFiles?.length || 0) + localFiles.length >= maxFileCount,
            [maxFileCount, remoteFiles, localFiles]
        );

        useEffect(() => {
            dataRef.current.isMounted = true;

            const { current: rootHtml } = rootRef;
            const { current: fileInputHtml } = fileInputRef;
            if (getRoot) getRoot(rootHtml);

            return () => {
                dataRef.current.isMounted = false;
                if (onUnmountComponent) onUnmountComponent(rootHtml, fileInputHtml);
            };
        }, []);

        useEffect(() => {
            loadUploadedFiles().catch((err) => console.error(err));
            // Clean up function that cancels upload files
            return cancelUpload;
        }, [fetchRemoteFiles]);

        useEffect(() => {
            if (onLoading) onLoading(isLoading, isUploading);
        }, [isLoading, isUploading]);

        useEffect(() => {
            if (!preventDropOnDocument) return () => undefined;

            const onDocumentDrop = (event: DragEvent) => {
                if (
                    !(noDrag || readOnly || disabled || isExceededMaxFileNum()) &&
                    rootRef.current &&
                    rootRef.current.contains(event.target as Node)
                ) {
                    // If we intercepted an event for our instance, let it propagate down to the instance's onDrop handler
                    return;
                }
                event.preventDefault();
            };

            document.addEventListener('dragover', onDocumentDrop, false);
            document.addEventListener('drop', onDocumentDrop, false);

            return () => {
                document.removeEventListener('dragover', onDocumentDrop);
                document.removeEventListener('drop', onDocumentDrop);
            };
        }, [rootRef, preventDropOnDocument, noDrag, readOnly, disabled, isExceededMaxFileNum]);

        useEffect(() => {
            const { current: mountStates } = itemMountStates;

            if (onChangeItemMountStates && mountStates.length) {
                const mounted = mountStates.filter((x) => x.state === 'mount');
                const unmounted = mountStates.filter((x) => x.state === 'unmount');

                const difference =
                    mounted.length >= unmounted.length
                        ? mounted.filter(
                              (x) =>
                                  !unmounted.some(
                                      (y) =>
                                          y.fileData.uid === x.fileData.uid &&
                                          y.isLocalFile === x.isLocalFile
                                  )
                          )
                        : unmounted.filter(
                              (x) =>
                                  !mounted.some(
                                      (y) =>
                                          y.fileData.uid === x.fileData.uid &&
                                          y.isLocalFile === x.isLocalFile
                                  )
                          );

                onChangeItemMountStates(difference, mounted, unmounted);
            }
        }, [onChangeItemMountStates, itemMountStates.current]);

        useImperativeHandle(
            ref,
            (): IFileManagerRef => ({
                openFileDialog,
                addLocalFiles,
                removeAllLocalFiles,
                update: forceUpdate,
                upload,
                cancelUpload,
                fetchRemoteFiles: loadUploadedFiles,
                remoteFiles,
                localFiles,
            })
        );

        const openFileDialog = useCallback(
            () =>
                !(disabled || readOnly || isLoading) &&
                !(uploadInOneRequest && isUploading) &&
                ((fileInputRef.current.value = null), fileInputRef.current.click()),
            [disabled, readOnly, isLoading, uploadInOneRequest, isUploading, fileInputRef]
        );

        const removeAllLocalFiles = () =>
            !(disabled || readOnly || isLoading) &&
            changeFileStack(
                localFiles.filter((file) => file.state === 'uploading'),
                localFiles.filter((file) => file.state !== 'uploading')
            );

        // Opens the file dialog when SPACE/ENTER occurs on the dropzone
        const onKeyDown = useCallback(
            (event: KeyboardEvent) => {
                // Ignore keyboard events bubbling up the DOM tree
                if (!rootRef.current || !rootRef.current.isEqualNode(event.target as Node)) {
                    return;
                }

                // if (event.keyCode === 32 || event.keyCode === 13) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openFileDialog();
                }
            },
            [rootRef, openFileDialog]
        );

        // ---------------------------------------------------------------------------

        const throwError: TThrowError = useCallback(
            (errorId, message, data) =>
                onError && onError({ errorId, message, ...(data ? { data } : {}) }),
            [onError]
        );

        const handleUploadErrors = useCallback(
            (error: TUploadError | TUploadError[]) => {
                if (Array.isArray(error)) {
                    if (error.length > 1 && onError) onError(error as TInternalError[]);
                    else throwError(error[0].errorId, error[0].message, error[0].data);
                } else throwError(error.errorId, error.message, error.data);
            },
            [onError, throwError]
        );

        // ------------------------ UPLOADING PROCESS --------------------------------

        const processUploadedFiles = (
            remoteFiles: IFileData | IFileData[],
            useFileFieldMapping = true,
            append = false
        ): Promise<IRemoteFileData[]> =>
            new Promise((resolve) => {
                remoteFiles = (Array.isArray(remoteFiles) ? remoteFiles : [remoteFiles]).filter(
                    (file) => file
                );
                if (remoteFiles.length === 0) return resolve([]);

                const checkRequiredFileFields = (file: any) => !(!file.fileName || !file.fileSize);
                const cleanPreviewDataField = (file: IFileData) => {
                    const { previewData, ...rest } = file;
                    return !!file?.previewData?.src ? file : rest;
                };

                // Let's check some fields and add additional fields (e.g. the old description field to be able to discard changes)
                const processedFiles = remoteFiles.map<IRemoteFileData>((file) => {
                    const mappedFile =
                        useFileFieldMapping && fileFieldMapping
                            ? cleanPreviewDataField(fileFieldMapping(file))
                            : file;
                    if (!checkRequiredFileFields(mappedFile))
                        throw Error(errorTxtInvalidFileFields);
                    return {
                        uid: generateUID(),
                        ...mappedFile,
                        ...{ oldDescription: file.description || file.fileName, state: 'uploaded' },
                    };
                });

                if (append) setRemoteFiles((files) => files.concat(processedFiles));
                else setRemoteFiles(processedFiles);
                resolve(processedFiles);
            });

        const loadUploadedFiles = (request?: TFetchRemoteFiles) => {
            return new Promise<IRemoteFileData[]>((resolve, reject) => {
                setIsLoading(true);
                (request ?? fetchRemoteFiles)()
                    .then((remoteFiles) => {
                        if (!dataRef.current.isMounted) return resolve([]);
                        if (!Array.isArray(remoteFiles)) throw Error(errorTxtUploadedFilesNotArray);
                        return processUploadedFiles(remoteFiles).then((result) => {
                            resolve(result);
                        });
                    })
                    .catch((err) => {
                        reject(err);
                    })
                    .finally(() => {
                        setIsLoading(false);
                    });
            });
        };

        const updateLocalFileData = useCallback(
            (
                data: Partial<ILocalFileData>,
                uid: string | null = null,
                files: ILocalFileData[] = localFiles
            ) => {
                files.forEach((item) => {
                    if (!uid || uid === item.uid) Object.assign(item, data);
                });
                forceUpdate();
            },
            [forceUpdate, localFiles]
        );

        const runUploadProgressListener = useCallback(
            (files: ILocalFileData[] = localFiles) => {
                uploadProgressData.current.cancelUploadFunc = () =>
                    files.map((file) => file.cancelUpload).forEach((f) => f && f());

                if (uploadProgressData.current.intervalId)
                    clearInterval(uploadProgressData.current.intervalId);

                uploadProgressData.current.intervalId = window.setInterval(() => {
                    if (!dataRef.current.isMounted) {
                        clearInterval(uploadProgressData.current.intervalId);
                        return;
                    }

                    let uploaded = 0,
                        total = 0;
                    files.forEach((file) => {
                        if (['uploading', 'uploaded'].includes(file.state)) {
                            uploaded += file.uploadedSize;
                            total += file.totalSize;
                        }
                    });

                    const progress = (uploaded / total) * 100;

                    if (onUploadProgress) onUploadProgress(progress, uploaded, total);

                    // Clean up
                    if (uploadProgressData.current.requests === 0) {
                        clearInterval(uploadProgressData.current.intervalId);
                        uploadProgressData.current.intervalId = null;
                        uploadProgressData.current.cancelUploadFunc = null;
                        setIsUploading(false);
                        if (onUploadProgress) onUploadProgress(null, 0, 0);
                    }
                }, 100);
            },
            [setIsUploading, onUploadProgress, localFiles]
        );

        const createSingleFileUploadPromise = useCallback(
            <T extends boolean>(
                fileData: ILocalFileData,
                uploadParams: TUploadParams,
                standalone: T,
                files: ILocalFileData[] = localFiles
            ): T extends true ? void : Promise<unknown> => {
                if (standalone && fileData.state === 'uploading') return null;

                const uploadItem = dataRef.current.uploadingFiles.find(
                    (item) => item.fileData === fileData
                );
                const isInUploadBundle = !!uploadItem;

                const updateFileData = (data: Partial<ILocalFileData>) =>
                    updateLocalFileData(data, fileData.uid, files);

                if (!uploadParams) {
                    updateFileData({ state: 'uploadError' });
                    const err: TUploadError = {
                        errorId: 'upload_error',
                        message: errorTxtWrongUploadParams,
                        data: fileData,
                    };
                    if (standalone && !isInUploadBundle) {
                        handleUploadErrors(err);
                        return null;
                    }
                    return Promise.reject(err) as any;
                }

                const {
                    URL,
                    method,
                    headers,
                    fileFieldName,
                    fields = {} as { [x: string]: any },
                    body,
                    timeout,
                    processResponse,
                    checkResult,
                    processError,
                } = uploadParams;

                uploadProgressData.current.requests++;

                const formData = new FormData();
                formData.append(fileFieldName || 'file', fileData.file);
                for (const field of Object.keys(fields)) formData.append(field, fields[field]);

                updateFileData({ state: 'uploading' });

                let { xhr, promise } = submitFormData(URL, body || formData, {
                    method,
                    headers,
                    timeout,
                    onProgress: (e: ProgressEvent) => {
                        updateFileData({
                            totalSize: e.total,
                            uploadedSize: e.loaded,
                        });
                    },
                });

                promise = promise
                    .then(async (response) => {
                        const processedResponse = processResponse
                            ? processResponse(response)
                            : response;

                        if (checkResult && !checkResult(processedResponse))
                            return Promise.reject({
                                type: 'wrong_result',
                                message: errorTxtUploadedFileFailedValidation,
                            });

                        const remoteFile = (
                            await processUploadedFiles(
                                processedResponse,
                                fileData !== processedResponse,
                                true
                            )
                        )[0];

                        updateFileData({
                            state: 'uploaded',
                            shouldBeRemoved: true,
                        } as any);

                        if (onFilesUploaded) {
                            if (remoteFile) {
                                remoteFile.elementRef = getElementRefById(remoteFile.uid);
                                onFilesUploaded([remoteFile]);
                            } else onFilesUploaded([fileData]);
                        }

                        if (standalone && !isInUploadBundle) return null;
                        return Promise.resolve(processedResponse);
                    })
                    .catch((error) => {
                        if (!dataRef.current.isMounted) return null;

                        updateFileData({
                            totalSize: 0,
                            uploadedSize: 0,
                            state: 'uploadError',
                        });

                        const result = {
                            message: !!processError ? processError(error) : error,
                            data: fileData,
                            errorId: getUploadErrorId(error),
                        };

                        if (standalone && !isInUploadBundle) {
                            handleUploadErrors(result);
                            return null;
                        }

                        return (
                            Promise.reject(result)
                                // To prevent "uncaught (in promise)" error,
                                // we should only throw an error if this promise is handled by the main uploading process
                                .catch((e) => {
                                    if (dataRef.current.uploadPromises.includes(promise)) {
                                        throw e;
                                    }
                                })
                        );
                    })
                    .finally(() => {
                        fileData.cancelUpload = null;
                        uploadProgressData.current.requests--;
                    });

                if (uploadItem) uploadItem.promise = makeQueryablePromise(promise);
                fileData.cancelUpload = () => xhr.abort();

                if (standalone) {
                    runUploadProgressListener();
                    return null;
                }
                return promise as any;
            },
            [updateLocalFileData, runUploadProgressListener, onFilesUploaded, handleUploadErrors]
        );

        const handleFileUploadPromises = async (
            uploadPromises: Promise<unknown>[],
            filteredErrors: TUploadError[]
        ) => {
            dataRef.current.uploadPromises = dataRef.current.uploadPromises.concat(uploadPromises);

            const result = await Promise.all(
                uploadPromises.map((promise) =>
                    promise
                        .then((result) => ({ status: 'fulfilled', value: result }))
                        .catch((error) => ({ status: 'rejected', reason: error }))
                )
            );

            dataRef.current.uploadPromises = dataRef.current.uploadPromises.filter(
                (promise) => !uploadPromises.includes(promise)
            );

            let retVal = result.filter((i) => i.status === 'fulfilled');
            const errors = result
                .filter((i) => i.status === 'rejected')
                .map((i: { status: string; reason: unknown }) => i.reason as TUploadError);

            // Since the user can reupload some rejected files during the main uploading process,
            // we need to exclude files that have already been uploaded and check file upload promises
            const restUploadPromises: Promise<unknown>[] = [];

            const isStillUploading = dataRef.current.uploadingFiles.some((item) =>
                item?.promise?.isPending()
            );

            errors.forEach(async (error) => {
                const file = error.data as ILocalFileData;
                const uploadPromise = dataRef.current.uploadingFiles.find(
                    (item) => item.fileData === file
                )?.promise;

                if (uploadPromise?.isPending()) {
                    restUploadPromises.push(uploadPromise);
                } else if (file.state === 'uploadError') {
                    if (!isStillUploading) {
                        filteredErrors.push(error);
                        retVal.push({ status: 'rejected', reason: error });
                    } else restUploadPromises.push(new Promise((_, reject) => reject(error)));
                } else if (file.state === 'uploaded') {
                    const result = await uploadPromise;
                    retVal.push({ status: 'fulfilled', value: result || file });
                }
            });

            if (restUploadPromises.length) {
                const restRetVal = await handleFileUploadPromises(
                    restUploadPromises,
                    filteredErrors
                );
                retVal = retVal.concat(restRetVal);
            }

            return Promise.resolve(retVal);
        };

        const obtainUploadParams = useCallback(
            async (
                fileData: ILocalFileData | ILocalFileData[],
                getUploadParamsExt?: TGetUploadParams
            ) => {
                const uploadParams =
                    (!!getUploadParamsExt &&
                        typeof getUploadParamsExt === 'function' &&
                        (await getUploadParamsExt(fileData))) ||
                    (!!getUploadParams &&
                        typeof getUploadParams === 'function' &&
                        (await getUploadParams(fileData))) ||
                    ({} as TUploadParams);

                const { URL } = uploadParams;

                if (!URL) return null;
                return uploadParams;
            },
            [getUploadParams]
        );

        const uploadSingleFile = useCallback(
            async (fileData: ILocalFileData) => {
                setIsUploading(true);
                const uploadParams = await obtainUploadParams(fileData);
                if (!uploadParams) setIsUploading(false);
                return createSingleFileUploadPromise(fileData, uploadParams, true);
            },
            [setIsUploading, obtainUploadParams, createSingleFileUploadPromise]
        );

        const uploadFilesSeparately = async (
            files: ILocalFileData[],
            getUploadParams?: TGetUploadParams
        ) => {
            if (!files.length) return Promise.resolve();

            setIsUploading(true);

            const uploadPromises = [];
            const uploadingFiles: ILocalFileData[] = [];

            for (const fileData of files) {
                if (!['local', 'uploadError'].includes(fileData.state)) continue;
                // Getting upload parameters for each file
                const uploadParams = await obtainUploadParams(fileData, getUploadParams);
                // Creating an upload promise for each file
                const promise = createSingleFileUploadPromise(fileData, uploadParams, false, files);
                uploadPromises.push(promise);
                uploadingFiles.push(fileData);
            }

            if (!uploadPromises.length) {
                setIsUploading(false);
                return Promise.resolve();
            }

            runUploadProgressListener(files);

            dataRef.current.uploadingFiles = dataRef.current.uploadingFiles.concat(
                uploadingFiles.map((fileData) => ({ fileData, promise: null }))
            );

            const filteredErrors: TUploadError[] = [];

            const result = await handleFileUploadPromises(uploadPromises, filteredErrors);

            if (filteredErrors.length && dataRef.current.isMounted)
                handleUploadErrors(filteredErrors);

            dataRef.current.uploadingFiles = dataRef.current.uploadingFiles.filter(
                (item) => !uploadingFiles.includes(item.fileData)
            );

            return Promise.resolve(result);
        };

        const uploadFilesInOneRequest = async (
            files: ILocalFileData[],
            getUploadParams?: TGetUploadParams
        ) => {
            if (!files.length || isUploading) return Promise.resolve();

            setIsUploading(true);

            const updateFileData = (data: Partial<ILocalFileData>) =>
                updateLocalFileData(data, undefined, files);

            const processUploadError = (errorId: TErrorCodes, message: string) => {
                updateFileData({
                    state: 'uploadError',
                });

                const reason: TUploadError = {
                    errorId,
                    message,
                    data: files,
                };
                handleUploadErrors(reason);

                return Promise.resolve({ status: 'rejected', reason });
            };

            const uploadParams = await obtainUploadParams(files, getUploadParams);
            if (!uploadParams) {
                setIsUploading(false);
                return processUploadError('upload_error', errorTxtWrongUploadParams);
            }

            const {
                URL,
                method,
                headers,
                fileFieldName,
                fields = {} as { [x: string]: any },
                body,
                timeout,
                processResponse,
                checkResult,
                processError,
            } = uploadParams;

            const formData = new FormData();
            for (const fileData of files) {
                formData.append(fileFieldName || 'file', fileData.file);
            }
            for (const field of Object.keys(fields)) formData.append(field, fields[field]);

            updateFileData({ state: 'uploading' });

            const { xhr, promise } = submitFormData(URL, body || formData, {
                method,
                headers,
                timeout,
                onProgress: (e: ProgressEvent) => {
                    const progress = (e.loaded / e.total) * 100;
                    if (onUploadProgress) onUploadProgress(progress, e.loaded, e.total);
                    else {
                        updateFileData({
                            totalSize: e.total,
                            uploadedSize: e.loaded,
                        });
                    }
                },
            });

            uploadProgressData.current.cancelUploadFunc = () => xhr.abort();

            return promise
                .then(async (response) => {
                    const processedResponse = processResponse
                        ? processResponse(response)
                        : response;

                    if (checkResult && !checkResult(processedResponse))
                        return Promise.reject({
                            type: 'wrong_result',
                            message: errorTxtUploadedFileFailedValidation,
                        });

                    const remoteFiles = await processUploadedFiles(
                        processedResponse,
                        files !== processedResponse,
                        true
                    );

                    updateFileData({
                        state: 'uploaded',
                        shouldBeRemoved: true,
                    } as any);

                    if (onFilesUploaded) {
                        if (remoteFiles.length) {
                            remoteFiles.forEach(
                                (file) => (file.elementRef = getElementRefById(file.uid))
                            );
                            onFilesUploaded(remoteFiles);
                        } else onFilesUploaded(files);
                    }

                    return Promise.resolve({ status: 'fulfilled', value: processedResponse });
                })
                .catch((error) => {
                    if (!dataRef.current.isMounted) return null;

                    return processUploadError(
                        getUploadErrorId(error),
                        !!processError ? processError(error) : error
                    );
                })
                .finally(() => {
                    if (onUploadProgress) onUploadProgress(null, 0, 0);
                    if (dataRef.current.isMounted) setIsUploading(false);
                    uploadProgressData.current.cancelUploadFunc = null;
                });
        };

        const upload = (getUploadParams?: TGetUploadParams) => {
            if (readOnly || disabled) return Promise.resolve();
            return immediateUpload(localFiles, getUploadParams);
        };

        const immediateUpload = (files: ILocalFileData[], getUploadParams?: TGetUploadParams) => {
            if (uploadInOneRequest) return uploadFilesInOneRequest(files, getUploadParams);
            else return uploadFilesSeparately(files, getUploadParams);
        };

        const cancelUpload = () =>
            uploadProgressData.current.cancelUploadFunc &&
            uploadProgressData.current.cancelUploadFunc();

        // ---------------------------------------------------------------------------

        const getElementRefById = (uid: string) => {
            const { current: elements } = itemRefs;
            const elementRef =
                elements.length && elements.find((x) => x.fileData.uid === uid)?.elementRef;
            return elementRef;
        };

        const changeFileStack = useCallback(
            (result: ILocalFileData[], changedFiles: ILocalFileData[]) => {
                if (!changedFiles.length) return;
                setLocalFiles(result);
                if (onChangeLocalFileStack) {
                    setTimeout(() => {
                        result.forEach((item) => (item.elementRef = getElementRefById(item.uid)));
                        changedFiles.forEach(
                            (item) => (item.elementRef = getElementRefById(item.uid))
                        );
                        onChangeLocalFileStack(result, changedFiles);
                    });
                }
            },
            [setLocalFiles, onChangeLocalFileStack]
        );

        const deleteLocalFile = useCallback(
            (fileData: ILocalFileData | ILocalFileData[]) =>
                changeFileStack(
                    localFiles.filter((file) =>
                        Array.isArray(fileData)
                            ? !fileData.includes(file)
                            : file.uid != fileData.uid
                    ),
                    Array.isArray(fileData) ? fileData : [fileData]
                ),
            [changeFileStack, localFiles]
        );

        const getDeleteUploadedFileFunc = useCallback(
            !readOnly && !!deleteFile
                ? (fileData: IRemoteFileData) =>
                      deleteFile(
                          ((fileData.elementRef = getElementRefById(fileData.uid)), fileData)
                      )
                          .then(() =>
                              setRemoteFiles((files) =>
                                  files.filter((file) => file.uid !== fileData.uid)
                              )
                          )
                          .catch((message: string | void) => {
                              if (!message) return;
                              setRemoteFiles((files) =>
                                  files.map((file) => ({
                                      ...file,
                                      ...(file.uid === fileData.uid
                                          ? { state: 'deletionError' }
                                          : {}),
                                  }))
                              );
                              throwError('delete_error', message, { file: fileData });
                          })
                : null,
            [readOnly, setRemoteFiles, deleteFile]
        );

        const getDownloadFileFunc = useCallback(
            !!downloadFile
                ? (fileData: IRemoteFileData) =>
                      downloadFile(
                          ((fileData.elementRef = getElementRefById(fileData.uid)), fileData)
                      )
                          .then((resp) => {
                              if (resp instanceof Blob) {
                                  saveBlob(resp as Blob, fileData.description || fileData.fileName);
                              } else if (resp && (resp as { fileName: string }).fileName) {
                                  saveBlob(resp.blob, resp.fileName);
                              } else {
                              } // do nothing....
                          })
                          .catch((message: string) =>
                              throwError('download_error', message, { file: fileData })
                          )
                : null,
            [downloadFile]
        );

        const getViewFileFunc = useCallback(
            !!viewFile
                ? (fileData: IRemoteFileData) =>
                      viewFile(((fileData.elementRef = getElementRefById(fileData.uid)), fileData))
                          .then((resp) => {
                              if (resp instanceof Blob) {
                                  openBlob(resp as Blob, fileData.description || fileData.fileName);
                              } else {
                              } // do nothing....
                          })
                          .catch((message: string) =>
                              throwError('view_error', message, { file: fileData })
                          )
                : null,
            [viewFile]
        );

        const updateRemoteFileData = useCallback(
            (
                input: Partial<IRemoteFileData> | ((item: IRemoteFileData) => IRemoteFileData),
                uid: string
            ) => {
                const update =
                    typeof input === 'function'
                        ? (item: IRemoteFileData) => input(item)
                        : (item: IRemoteFileData) => ({ ...item, ...input });
                setRemoteFiles((remoteFiles) =>
                    remoteFiles.map((item) => (item.uid === uid ? update(item) : item))
                );
            },
            [setRemoteFiles]
        );

        const getFileItems = () => {
            const fileItems: IFileItemProps[] = [];
            const { active: isDragActive } = dragData;
            const root = rootRef.current;

            itemRefs.current = [];
            itemMountStates.current = [];

            // Delete local files marked as removed
            const wasteFiles = localFiles.filter((f: any) => f.shouldBeRemoved);
            deleteLocalFile(wasteFiles);

            // Grouping common properties
            const commonProps = {
                itemRefs,
                root,
                component:
                    overrides?.FileItem?.component ||
                    ((props: IFileItemComponentProps) => (
                        <DefaultFileItemRenderer
                            {...props}
                            {...{ overrides: overrides?.FileItem }}
                        />
                    )),
                formatSize,
                itemMountStates,
                readOnly,
                disabled,
                isDragActive,
                noKeyboard,
            };

            // Add already uploaded files to the list
            remoteFiles.forEach((item) => {
                const fileData = {
                    ...item,
                } as ILocalFileData;

                fileItems.push({
                    fileData,
                    throwError,
                    deleteFile:
                        (!(fileData.readOnly || readOnly) && getDeleteUploadedFileFunc) || null,
                    downloadFile: getDownloadFileFunc,
                    viewFile: getViewFileFunc,
                    setFileDescription: !(fileData.readOnly || readOnly)
                        ? setFileDescription
                        : null,
                    updateFileData: updateRemoteFileData,
                    showProgress: false,
                    isLocalFile: false,
                    ...commonProps,
                });
            });

            // Add local files to the list
            for (const fileData of localFiles) {
                fileItems.push({
                    fileData,
                    uploadFile:
                        // (!uploadInOneRequest && ((fileData) => uploadSingleFile(fileData))) || null,
                        (!uploadInOneRequest && !!getUploadParams && uploadSingleFile) || null,
                    deleteFile: (fileData.state !== 'uploading' && deleteLocalFile) || null,
                    updateFileData: (addFileDescription && updateLocalFileData) || null,
                    showProgress:
                        fileData.state === 'uploading' &&
                        !(uploadInOneRequest && !!onUploadProgress),
                    isLocalFile: true,
                    ...commonProps,
                });
            }

            const sortedFileItems = sort(fileItems);

            return sortedFileItems.map((item, i) => (
                <FileItemComponent key={`fileItemComponent-${i}-${item.fileData.uid}`} {...item} />
            ));
        };

        const sort = (fileItems: IFileItemProps[]): IFileItemProps[] => {
            const isRemoteFileInEditMode = !!remoteFiles.find((file) => file.editMode);
            const isLocalFileInEditMode = !!localFiles.find((file) => file.editMode);

            if (savedSortOrder.current && (isRemoteFileInEditMode || isLocalFileInEditMode)) {
                const { current: sortOrder } = savedSortOrder;

                return fileItems.sort(
                    (a, b) => sortOrder.indexOf(a.fileData.uid) - sortOrder.indexOf(b.fileData.uid)
                );

                // OR

                // https://stackoverflow.com/a/31213792/925504
                // Map for efficient lookup of sortIndex
                // const ordering: {[key: string] : number} = {};
                // for (var i=0; i<sortOrder.length; i++) ordering[sortOrder[i]] = i;
                // return fileItems.sort((a, b) => ordering[a.fileData.uid] - ordering[b.fileData.uid]);
            }

            const sortFunc = sortFiles || dataRef.current.onSortFunc;
            if (sortFunc)
                fileItems.sort((a, b) =>
                    sortFunc(
                        { isLocalFile: a.isLocalFile, fileData: a.fileData },
                        { isLocalFile: b.isLocalFile, fileData: b.fileData }
                    )
                );

            // Preserve the sort order to freeze it during file renaming
            savedSortOrder.current = fileItems.map((item) => item.fileData.uid);

            return fileItems;
        };

        const createFile = (file: File): Promise<ILocalFileData> =>
            new Promise((resolve) => {
                const newFile: ILocalFileData = {
                    uid: generateUID(),
                    file: file,
                    state: 'local',
                    fileName: file.name,
                    fileSize: file.size,
                    uploadedSize: 0,
                    previewData: { src: null },
                    totalSize: file.size,
                    ...((addFileDescription && { description: file.name }) || {}),
                };

                resolve(newFile);
                generatePreview(newFile, filePreview, (fileData) => {
                    updateLocalFileData(
                        {
                            totalSize: fileData.totalSize,
                            previewData: fileData.previewData,
                        },
                        fileData.uid,
                        localFiles.concat(newFile)
                    );
                });
            });

        /**************************** Drag & drop *********************************/

        const onDragEnter = (e: React.DragEvent<HTMLElement>) => {
            e.preventDefault();
            e.stopPropagation();

            if (!isEventWithFiles(e)) return;

            dataRef.current.dragTargetElement = e.target;

            setDragData({
                active: true,
                reject: isDragReject(e, accept),
            });
        };

        const onDragLeave = (e: React.DragEvent<HTMLElement>) => {
            // https://stackoverflow.com/a/26459269/925504
            // Only if the two target are equal it means the drag has left the window
            if (dataRef.current.dragTargetElement == e.target) {
                setDragData({ active: false, reject: false });
            }
        };

        const onDragOver = (e: React.DragEvent<HTMLElement>) => {
            e.preventDefault();
            e.stopPropagation();

            if (!isEventWithFiles(e)) return;
            e.dataTransfer.dropEffect = 'copy';
        };

        const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            e.preventDefault();
            addLocalFiles(e.target.files);
        };

        const onDropFile = (e: React.DragEvent<HTMLInputElement>) => {
            e.preventDefault();
            if (!isEventWithFiles(e)) return;

            getDataTransferFiles(e).then((files) => addLocalFiles(files));
        };

        const addLocalFiles = (files: FileList | File | File[]) => {
            setDragData({
                active: false,
                reject: false,
            });

            let fileCounter = (remoteFiles?.length || 0) + localFiles.length;
            const filePromises = [];
            const allErrors: TInternalError[] = [];

            const acceptedFiles: File[] = [];
            const fileRejections: { file: File; errors: TInternalError[] }[] = [];

            if (files instanceof FileList) files = Array.from(files);
            if (!Array.isArray(files)) files = [files];
            for (const file of files) {
                // assuming it's a folder
                if (file.type === '' && file.size === 0) continue;
                if (!(file instanceof File)) continue;

                let hasError = false;
                const errors: TInternalError[] = [];

                if (minFileSize && minFileSize > file.size) {
                    const fileSize = formatSize(file.size);
                    const minFileSizeStr = formatSize(minFileSize);
                    errors.push({
                        errorId: 'invalid_size_min',
                        message: `The size (${fileSize}) of file (${file.name}) is smaller than minimum allowed size (${minFileSizeStr})`,
                        data: { file, fileSize: file.size, minFileSize },
                    });
                    hasError = true;
                }

                if (maxFileSize && maxFileSize < file.size) {
                    const fileSize = formatSize(file.size);
                    const maxFileSizeStr = formatSize(maxFileSize);
                    errors.push({
                        errorId: 'invalid_size_max',
                        message: `The size (${fileSize}) of file (${file.name}) is larger than maximum allowed size (${maxFileSizeStr})`,
                        data: { file, fileSize: file.size, maxFileSize },
                    });
                    hasError = true;
                }

                const accepted = accepts(file, accept);
                if (!accepted) {
                    errors.push({
                        errorId: 'invalid_type',
                        message: `The type of file (${file.name}) must be "${accept}"`,
                        data: { file, accept },
                    });
                    hasError = true;
                }

                // checks local files for duplicates
                if (['all', 'local'].includes(checkFileDuplicates)) {
                    localFiles.forEach((item) => {
                        if (
                            item.file.name === file.name &&
                            item.file.size === file.size &&
                            item.file.type === file.type
                        ) {
                            errors.push({
                                errorId: 'file_exists',
                                message: `File (${file.name}${
                                    item.description && item.description !== file.name
                                        ? ' [' + item.description + ']'
                                        : ''
                                }) already exists`,
                                data: { file },
                            });
                            hasError = true;
                        }
                    });
                }

                // checks uploaded files for duplicates
                if (['all', 'remote'].includes(checkFileDuplicates)) {
                    remoteFiles.forEach((item) => {
                        if (item.fileName === file.name && item.fileSize === file.size) {
                            errors.push({
                                errorId: 'file_exists',
                                message: `File (${file.name}${
                                    item.description && item.description !== file.name
                                        ? ' [' + item.description + ']'
                                        : ''
                                }) already exists`,
                                data: { file },
                            });
                            hasError = true;
                        }
                    });
                }

                // custom file validation function
                if (fileValidator) {
                    const error = fileValidator(file, localFiles, remoteFiles);
                    if (error) {
                        if (Array.isArray(error))
                            error.forEach((err) =>
                                (errors as TCustomError[]).push({
                                    errorId: 'validation_error',
                                    ...err,
                                })
                            );
                        else
                            (errors as TCustomError[]).push({
                                errorId: 'validation_error',
                                ...error,
                            });
                        hasError = true;
                    }
                }

                if (!hasError) {
                    const exceeded = !!maxFileCount && ++fileCounter > maxFileCount;
                    if (
                        (!multiple && acceptedFiles.length >= 1) ||
                        exceeded ||
                        (multiple && exceeded)
                    ) {
                        if (!multiple && acceptedFiles.length >= 1)
                            errors.push({
                                errorId: 'multiple_not_allowed',
                                message: `It's not allowed to drag & drop multiple files at once. File (${file.name}) was rejected`,
                                data: { file },
                            });
                        else
                            errors.push({
                                errorId: 'exceed_max_file_count',
                                message: `Exceeded the maximum numbers of files (${maxFileCount}). File (${file.name}) was rejected`,
                                data: { file, maxFileCount },
                            });

                        fileRejections.push({ file, errors });
                    } else {
                        acceptedFiles.push(file);
                        filePromises.push(createFile(file));
                    }
                } else fileRejections.push({ file, errors });

                allErrors.push(...errors);
            }

            Promise.all(filePromises)
                .then(
                    (filteredFiles) => (
                        changeFileStack(localFiles.concat(filteredFiles), filteredFiles),
                        localFiles.concat(filteredFiles)
                    )
                )
                .then((files) => {
                    if (autoUpload) immediateUpload(files);
                });

            if (onDropFiles) onDropFiles(acceptedFiles, fileRejections);
            if (allErrors.length > 0 && onError) onError(allErrors);
        };

        /**************************************************************************/
        const { active, reject } = dragData;

        const isDraggable =
            !(disabled || readOnly || noDrag || isLoading || isExceededMaxFileNum()) &&
            !(uploadInOneRequest && isUploading);

        const fileItems = getFileItems();

        const getEventProps = (): IRootEventProps => ({
            onClick: !(noClick || isExceededMaxFileNum()) ? openFileDialog : null,
            onKeyDown: !noKeyboard ? onKeyDown : null,
            onDragEnter: isDraggable ? onDragEnter : null,
            onDragOver: isDraggable ? onDragOver : null,
            onDragLeave: isDraggable ? onDragLeave : null,
            onDrop: isDraggable ? onDropFile : null,
        });

        const args: IRootComponentProps = {
            componentRef: rootRef,
            getEventProps,
            sortFiles: setSortFilesFunc,
            update: forceUpdate,
            fileItems,
            isDragActive: active,
            isDragReject: reject,
            disabled,
            isLoading,
            isUploading,
            readOnly,
            tabIndex: !disabled && !noKeyboard ? tabIndex : -1,
        };

        const NewRootComponent = overrides?.Root?.component;
        const rootComponent = NewRootComponent ? (
            <NewRootComponent {...args} />
        ) : (
            <RootComponent {...{ ...args, overrides: overrides?.Root }} />
        );

        return (
            <div className="react-file-manager">
                <input
                    role="fileinput"
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    style={{ display: 'none' }}
                    onChange={onChange}
                    multiple={multiple}
                    // disabled={!!!getUploadParams}
                    autoComplete="off"
                    tabIndex={-1}
                />
                {rootComponent}
            </div>
        );
    }
);

FileManager.displayName = 'FileManager';

FileManager.defaultProps = {
    getUploadParams: null,
    getRoot: null,
    fetchRemoteFiles: () => Promise.resolve([]),
    fileFieldMapping: null,
    onFilesUploaded: null,
    onUploadProgress: null,
    onChangeLocalFileStack: null,
    onChangeItemMountStates: null,
    deleteFile: null,
    downloadFile: null,
    viewFile: null,
    filePreview: () => Promise.resolve(),
    setFileDescription: null,
    onLoading: null,
    sortFiles: null,
    onDropFiles: null,
    fileValidator: null,
    onError: null,
    addFileDescription: false,
    uploadFilesInOneRequest: false,
    checkFileDuplicates: 'all',
    maxFileCount: null,
    maxFileSize: null,
    minFileSize: 0,
    accept: '*',
    autoUpload: false,
    preventDropOnDocument: true,
    readOnly: false,
    disabled: false,
    multiple: true,
    noClick: false,
    noDrag: false,
    noKeyboard: false,
    tabIndex: 0,
    overrides: null,
};

FileManager.propTypes = {
    getUploadParams: PropTypes.func,
    getRoot: PropTypes.func,
    fetchRemoteFiles: PropTypes.func,
    fileFieldMapping: PropTypes.func,
    onFilesUploaded: PropTypes.func,
    onUploadProgress: PropTypes.func,
    onChangeLocalFileStack: PropTypes.func,
    onChangeItemMountStates: PropTypes.func,
    deleteFile: PropTypes.func,
    downloadFile: PropTypes.func,
    viewFile: PropTypes.func,
    filePreview: PropTypes.func,
    setFileDescription: PropTypes.func,
    onLoading: PropTypes.func,
    sortFiles: PropTypes.func,
    onDropFiles: PropTypes.func,
    fileValidator: PropTypes.func,
    onError: PropTypes.func,
    addFileDescription: PropTypes.bool,
    uploadFilesInOneRequest: PropTypes.bool,
    checkFileDuplicates: PropTypes.oneOf(['none', 'local', 'remote', 'all']),
    maxFileCount: PropTypes.number,
    maxFileSize: PropTypes.number,
    minFileSize: PropTypes.number,
    accept: PropTypes.string,
    autoUpload: PropTypes.bool,
    preventDropOnDocument: PropTypes.bool,
    readOnly: PropTypes.bool,
    disabled: PropTypes.bool,
    multiple: PropTypes.bool,
    noClick: PropTypes.bool,
    noDrag: PropTypes.bool,
    noKeyboard: PropTypes.bool,
    tabIndex: PropTypes.number,
    overrides: PropTypes.exact({
        uidGenerator: PropTypes.func,
        fileSizeFormatter: PropTypes.func,
        Root: PropTypes.exact({
            hideHeader: PropTypes.bool,
            hideFooter: PropTypes.bool,
            texts: PropTypes.objectOf(PropTypes.string),
            classNames: PropTypes.objectOf(PropTypes.string),
            styles: PropTypes.objectOf(PropTypes.object),
            component: PropTypes.func,
        }),
        FileItem: PropTypes.exact({
            titles: PropTypes.objectOf(PropTypes.string),
            rootStyles: PropTypes.objectOf(
                PropTypes.exact({
                    className: PropTypes.string,
                    style: PropTypes.object,
                })
            ),
            thumbnailFieldStyles: PropTypes.func,
            thumbnailFieldComponent: PropTypes.func,
            inputFieldStyles: PropTypes.func,
            inputFieldComponent: PropTypes.func,
            sizeFieldStyle: PropTypes.func,
            sizeFieldComponent: PropTypes.func,
            controlField: PropTypes.exact({
                buttons: PropTypes.func,
                menu: PropTypes.func,
                component: PropTypes.func,
            }),
            progressBarComponent: PropTypes.func,
            readOnlyIconComponent: PropTypes.func,
            component: PropTypes.func,
        }),
    }),
};

export default FileManager;
