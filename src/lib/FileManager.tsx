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
} from './Utils/errors';

//--------------------------------- TYPES --------------------------------------

type TMethod = 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT';

type TUploadError = {
    message: string;
    data: ILocalFileData | ILocalFileData[];
    errorId?: TErrorCodes;
};

type TUploadParams = {
    URL: string;
    fileFieldName?: string;
    fields?: { [name: string]: string | Blob };
    body?: BodyInit;
    headers?: { [name: string]: string };
    method?: TMethod;
    timeout?: number;
    checkResult?: (result: any) => boolean;
    processResponse?: (response: any) => any;
    processError?: (error: any) => string;
};

export type TGetUploadParams = (
    localFileData: ILocalFileData | ILocalFileData[]
) => TUploadParams | Promise<TUploadParams>;

export interface IFileManagerRef {
    openFileDialog: () => void;
    addLocalFiles: (files: FileList | File | File[]) => void;
    removeAllLocalFiles: () => void;
    update: () => void;
    upload: () => Promise<any>;
    cancelUpload: () => void;
    reloadRemoteFiles: () => Promise<IRemoteFileData[]>;
    remoteFiles: IRemoteFileData[];
    localFiles: ILocalFileData[];
}

type TComparedData = Pick<Readonly<IFileItemProps>, 'fileData' | 'isLocalFile'>;
export type TSortFunc = (a: TComparedData, b: TComparedData) => number;

export type TFileValidator<T = PartialBy<TCustomError, 'errorId'>> = (
    file: File,
    localFiles: ILocalFileData[],
    remoteFiles: IRemoteFileData[]
) => T | T[] | null;

export type TOverrides = {
    uidGenerator?: () => string;
    fileSizeFormatter?: TFileSizeFormatter;
    Root?: IOverriddenRoot;
    FileItem?: IOverriddenFileItem;
};

export interface IFileManagerProps {
    getRoot?: (root: HTMLElement) => void;
    getUploadParams?: TGetUploadParams;
    fetchRemoteFiles?: () => Promise<Array<IFileData>>;
    fileFieldMapping?: (data: any) => IFileData;
    deleteFile?: (fileData: IRemoteFileData) => Promise<void>;
    downloadFile?: (
        fileData: IRemoteFileData
    ) => Promise<{ blob: Blob; fileName: string } | Blob | void>;
    viewFile?: (fileData: IRemoteFileData) => Promise<Blob | void>;
    setFileDescription?: (fileData: IRemoteFileData) => Promise<string>;
    sortFiles?: TSortFunc;
    filePreview?: TFilePreview;
    fileValidator?: TFileValidator;
    onFilesUploaded?: (fileData: IRemoteFileData[]) => void;
    onUploadProgress?: (progress: number, sentBytes: number, totalBytes: number) => void;
    onLoading?: (isLoading: boolean, isUploading: boolean) => void;
    onDropFiles?: (
        acceptedFiles: File[],
        fileRejections: { file: File; errors: TInternalError[] }[]
    ) => void;
    onChangeLocalFileStack?: (result: ILocalFileData[], changedFiles: ILocalFileData[]) => void;
    onChangeItemMountStates?: (
        changedItems: IItemMountState[],
        mountedItems: IItemMountState[],
        unmountedItems: IItemMountState[]
    ) => void;
    onError?: TOnError;
    onUnmountComponent?: (root: HTMLDivElement, fileInput: HTMLInputElement) => void;
    addFileDescription?: boolean;
    uploadFilesInOneRequest?: boolean;
    ignoreFileDuplicates?: 'none' | 'local' | 'remote' | 'all';
    maxFileCount?: number;
    maxFileSize?: number;
    minFileSize?: number;
    accept?: string;
    autoUpload?: boolean;
    preventDropOnDocument?: boolean;
    readOnly?: boolean;
    disabled?: boolean;
    multiple?: boolean;
    noClick?: boolean;
    noDrag?: boolean;
    noKeyboard?: boolean;
    tabIndex?: number;
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
            ignoreFileDuplicates = 'none', // excludeFileDuplicates
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

        const setIsLoading = useCallback(
            (state: boolean) => dispatch({ type: 'setIsLoading', result: state }),
            [dispatch]
        );
        const setIsUploading = useCallback(
            (state: boolean) => dispatch({ type: 'setIsUploading', result: state }),
            [dispatch]
        );
        const forceUpdate = useCallback(
            () => dataRef.current.isMounted && dispatch({ type: 'forceUpdate' }),
            [dispatch, dataRef]
        );
        const setLocalFiles = useCallback(
            (files: ILocalFileData[]) => dispatch({ type: 'setLocalFiles', result: files }),
            [dispatch]
        );
        const setRemoteFiles = useCallback(
            (files: IRemoteFileData[] | ((files: IRemoteFileData[]) => IRemoteFileData[])) =>
                dispatch({ type: 'setRemoteFiles', result: files }),
            [dispatch]
        );
        const setDragData = useCallback(
            (data: SameType<boolean, 'active' | 'reject'>) =>
                dispatch({ type: 'setDragData', dragData: data }),
            [dispatch]
        );

        const setSortFilesFunc = useCallback((f) => {
            dataRef.current.onSortFunc = f;
        }, []);

        const generateUID = useCallback(overrides?.uidGenerator ?? guid, [overrides?.uidGenerator]);
        const formatSize = useCallback(overrides?.fileSizeFormatter ?? internalFileSizeFormatter, [
            overrides?.fileSizeFormatter,
        ]);

        useEffect(() => {
            dataRef.current.isMounted = true;

            loadUploadedFiles().catch((err) => console.error(err));

            const { current: rootHtml } = rootRef;
            const { current: fileInputHtml } = fileInputRef;
            if (getRoot) getRoot(rootHtml);

            // Clean up function that cancels upload files
            return () => {
                dataRef.current.isMounted = false;
                cancelUpload();
                if (onUnmountComponent) onUnmountComponent(rootHtml, fileInputHtml);
            };
        }, []);

        useEffect(() => {
            if (onLoading) onLoading(isLoading, isUploading);
        }, [isLoading, isUploading]);

        useEffect(() => {
            const onDocumentDrop = (event: DragEvent) => {
                if (
                    !noDrag &&
                    !readOnly &&
                    !disabled &&
                    rootRef.current &&
                    rootRef.current.contains(event.target as Node)
                ) {
                    // If we intercepted an event for our instance, let it propagate down to the instance's onDrop handler
                    return;
                }
                event.preventDefault();
            };

            if (preventDropOnDocument) {
                document.addEventListener('dragover', onDocumentDrop, false);
                document.addEventListener('drop', onDocumentDrop, false);
            }
            return () => {
                if (preventDropOnDocument) {
                    document.removeEventListener('dragover', onDocumentDrop);
                    document.removeEventListener('drop', onDocumentDrop);
                }
            };
        }, [rootRef, preventDropOnDocument, noDrag]);

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
                reloadRemoteFiles: loadUploadedFiles,
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

        const getUploadErrorId = (error: any): TErrorCodes =>
            error.type === 'abort'
                ? 'upload_aborted'
                : error.type === 'timeout'
                ? 'upload_timeout'
                : error.type === 'wrong_result'
                ? 'upload_wrong_result'
                : 'upload_error';

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

        const loadUploadedFiles = () => {
            return new Promise<IRemoteFileData[]>((resolve, reject) => {
                setIsLoading(true);
                fetchRemoteFiles()
                    .then((remoteFiles) => {
                        if (!dataRef.current.isMounted) return resolve([]);
                        if (!Array.isArray(remoteFiles)) throw Error(errorTxtUploadedFilesNotArray);
                        return processUploadedFiles(remoteFiles).then((result) => {
                            setIsLoading(false);
                            resolve(result);
                        });
                    })
                    .catch((err) => {
                        setIsLoading(false);
                        reject(err);
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

                const {
                    URL,
                    method,
                    headers,
                    fileFieldName,
                    fields = {},
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

                const updateFileData = (data: Partial<ILocalFileData>) =>
                    updateLocalFileData(data, fileData.uid, files);

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
                        });

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
            async (fileData: ILocalFileData | ILocalFileData[]) => {
                const uploadParams =
                    !!getUploadParams && typeof getUploadParams === 'function'
                        ? await getUploadParams(fileData)
                        : ({} as TUploadParams);
                const { URL } = uploadParams;

                if (!URL) {
                    setIsUploading(false);
                    throw Error(errorTxtWrongUploadParams);
                }
                return uploadParams;
            },
            [setIsUploading, getUploadParams]
        );

        const uploadSingleFile = useCallback(
            async (fileData: ILocalFileData) => {
                setIsUploading(true);
                const uploadParams = await obtainUploadParams(fileData);
                return createSingleFileUploadPromise(fileData, uploadParams, true);
            },
            [setIsUploading, obtainUploadParams, createSingleFileUploadPromise]
        );

        const uploadFilesSeparately = async (files: ILocalFileData[]) => {
            if (!files.length) return Promise.resolve();

            setIsUploading(true);

            const uploadPromises = [];
            const uploadingFiles: ILocalFileData[] = [];
            const uploadParams = await obtainUploadParams(files);

            for (const fileData of files) {
                if (!['initial', 'uploadError'].includes(fileData.state)) continue;
                const promise = createSingleFileUploadPromise(fileData, uploadParams, false, files);
                uploadPromises.push(promise);
                uploadingFiles.push(fileData);
            }

            if (!uploadPromises.length) {
                setIsUploading(false);
                return Promise.resolve();
            }

            // setIsUploading(true);
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

        const uploadFilesInOneRequest = async (files: ILocalFileData[]) => {
            if (!files.length || isUploading) return Promise.resolve();

            setIsUploading(true);

            const {
                URL,
                method,
                headers,
                fileFieldName,
                fields = {},
                body,
                timeout,
                processResponse,
                checkResult,
                processError,
            } = await obtainUploadParams(files);

            const formData = new FormData();
            for (const fileData of files) {
                formData.append(fileFieldName || 'file', fileData.file);
            }
            for (const field of Object.keys(fields)) formData.append(field, fields[field]);

            const updateFileData = (data: Partial<ILocalFileData>) =>
                updateLocalFileData(data, undefined, files);

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
                    });

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

                    updateFileData({
                        state: 'uploadError',
                    });

                    const reason = {
                        message: !!processError ? processError(error) : error,
                        data: files,
                        errorId: getUploadErrorId(error),
                    };
                    handleUploadErrors(reason);

                    return Promise.resolve({ status: 'rejected', reason });
                })
                .finally(() => {
                    if (onUploadProgress) onUploadProgress(null, 0, 0);
                    if (dataRef.current.isMounted) setIsUploading(false);
                    uploadProgressData.current.cancelUploadFunc = null;
                });
        };

        const upload = () => {
            if (readOnly || disabled) return Promise.resolve();
            return immediateUpload(localFiles);
        };

        const immediateUpload = (files: ILocalFileData[]) => {
            if (uploadInOneRequest) return uploadFilesInOneRequest(files);
            else return uploadFilesSeparately(files);
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
            const wasteFiles = localFiles.filter((f) => f.shouldBeRemoved);
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
                        (!uploadInOneRequest && uploadSingleFile) || null,
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
                    state: 'initial',
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
                if (['none', 'local'].includes(ignoreFileDuplicates)) {
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
                if (['none', 'remote'].includes(ignoreFileDuplicates)) {
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
                    fileCounter++;

                    const exceeded = !!maxFileCount && fileCounter > maxFileCount;
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
            !(disabled || readOnly || noDrag || isLoading) && !(uploadInOneRequest && isUploading);

        const fileItems = getFileItems();

        const getEventProps = (): IRootEventProps => ({
            onClick: !noClick ? openFileDialog : null,
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
                    disabled={!!!getUploadParams}
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
    ignoreFileDuplicates: 'none',
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
    ignoreFileDuplicates: PropTypes.oneOf(['none', 'local', 'remote', 'all']),
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
