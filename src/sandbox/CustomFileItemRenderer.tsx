// File element created using internal components and icons.
// Almost the same as the default file element, but without the override feature.

import React, { ReactElement } from 'react';

import {
    Button,
    ActionMenu,
    TextField,
    AudioThumbnail,
    IMenuItem,
    ImageLazyLoader,
    ILocalFileData,
    IFileItemComponentProps,
    Icons,
    defaultFileItemClassNames as defaultClassNames,
} from '../lib';

const {
    CheckIcon,
    ClearIcon,
    DeleteIcon,
    EditIcon,
    GetAppIcon,
    LoadingIcon,
    LockIcon,
    MoreVertIcon,
    UploadIcon,
    VisibilityIcon,
} = Icons;

// -----------------------------------------------------------------------------

interface IFileActions {
    fileData: ILocalFileData;
    deleteFile: (fileData: ILocalFileData) => void;
    downloadFile: (fileData: ILocalFileData) => void;
    viewFile: (fileData: ILocalFileData) => void;
    changeDescriptionMode: () => void;
}

// -----------------------------------------------------------------------------

const formatDuration = (sec: number) => (
    (sec = sec ? sec : 0), new Date(sec * 1000).toISOString().substr(11, 8)
);

const fileActions = ({
    fileData,
    deleteFile,
    downloadFile,
    viewFile,
    changeDescriptionMode,
}: IFileActions): IMenuItem[] => {
    const rowActions: IMenuItem[] = [];

    if (viewFile)
        rowActions.push({
            icon: <VisibilityIcon />,
            name: 'View',
            action: viewFile.bind(null, fileData),
        });
    if (downloadFile)
        rowActions.push({
            icon: <GetAppIcon />,
            name: 'Download',
            action: downloadFile.bind(null, fileData),
        });
    if (changeDescriptionMode)
        rowActions.push({
            icon: <EditIcon />,
            name: 'Rename',
            action: changeDescriptionMode,
        });
    if (deleteFile)
        rowActions.push({
            icon: <DeleteIcon />,
            name: 'Delete',
            action: deleteFile.bind(null, fileData),
        });

    return rowActions;
};

const getRootStyles = (fileData: ILocalFileData, disabled: boolean, isLocalFile: boolean) => {
    const cls = (key: keyof typeof defaultClassNames) => ({
        className: `${defaultClassNames.base} ${defaultClassNames[key]}`,
    });

    if (disabled || fileData.disabled) return cls('disabled');
    else if (!isLocalFile && fileData.editMode) return cls('editMode');
    else if (fileData.state === 'deletionError') return cls('deletionError');
    else if (fileData.state === 'uploadError') return cls('uploadError');
    else if (fileData.state === 'uploaded') return cls('uploaded');
    else if (fileData.state === 'uploading') return cls('uploading');
    else return cls('initial');
};

const getThumbnail = (fileData: ILocalFileData, type: string, root: HTMLDivElement) => (
    <div role="thumbnail" className={`type-wrapper`}>
        {fileData.file?.type && fileData.previewData && !fileData.previewData.src ? (
            <>
                <div className="type-img">{type}</div>
                <LoadingIcon
                    data-testid="loading-icon"
                    className="image-loading-icon"
                    viewBox="0 0 24 24"
                />
            </>
        ) : (fileData.file?.type?.startsWith('audio/') ||
              fileData.file?.type ===
                  'video/ogg') /* FF bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1240259 */ &&
          fileData?.previewData?.src ? (
            <AudioThumbnail
                src={fileData.previewData.src}
                duration={fileData.previewData.duration}
                type={type}
                root={root}
            />
        ) : (
            (!!fileData?.previewData?.src &&
                fileData?.previewData?.src.search('blob:') === -1 && (
                    <div>
                        {
                            <ImageLazyLoader
                                placeholder={
                                    <LoadingIcon
                                        className="image-loading-icon"
                                        viewBox="0 0 24 24"
                                    />
                                }
                                styles={{
                                    container: { className: 'image-lazy-loader' },
                                    image: {
                                        loading: { className: 'none' },
                                        loaded: { className: 'visible' },
                                    },
                                }}
                                options={{
                                    root: root,
                                    threshold: 0,
                                }}
                            >
                                <img src={fileData.previewData.src} />
                            </ImageLazyLoader>
                        }
                        <div className="type-img">{type}</div>
                        {fileData.previewData.duration && (
                            <div className="duration">
                                {formatDuration(fileData.previewData.duration)}
                            </div>
                        )}
                    </div>
                )) || <div className="type">{type}</div>
        )}
    </div>
);

// -----------------------------------------------------------------------------

const CustomFileItemRenderer = ({
    fileData,
    getTextFieldProps,
    getItemProps,
    getCommonProps,
    getActions,
}: IFileItemComponentProps): ReactElement => {
    const {
        root,
        formatSize,
        isLocalFile,
        showProgress,
        disabled,
        isDragActive,
        noKeyboard,
        readOnly,
    } = getCommonProps();
    const {
        changeDescription,
        changeDescriptionMode,
        confirmDescriptionChanges,
        undoDescriptionChanges,
        deleteFile,
        downloadFile,
        uploadFile,
        viewFile,
    } = getActions();

    const type =
        fileData.fileType ||
        fileData?.file?.type?.split('/')?.pop()?.toUpperCase() ||
        (fileData.fileName.split('.').length > 1
            ? fileData.fileName.split('.').pop().toUpperCase()
            : '?');

    const progress = (fileData.uploadedSize / fileData.totalSize) * 100;

    const disabledOrReadonly = disabled || fileData.disabled || readOnly || fileData.readOnly;
    const tabIndex = noKeyboard ? -1 : 0;

    const compositeComponent = (
        <div
            {...getItemProps()}
            {...getRootStyles(fileData, disabled, isLocalFile)}
            style={{ opacity: isDragActive ? 0.5 : 1 }}
        >
            {fileData.readOnly && (
                <div className="read-only-label" data-testid="read-only-label" title="Read-only">
                    <LockIcon />
                </div>
            )}
            {showProgress && (
                <span
                    role="progressbar"
                    className={`progress`}
                    style={{ width: `calc(${progress}% - 7px)` }}
                ></span>
            )}
            <div className="grid">
                {getThumbnail(fileData, type, root)}
                <>
                    {disabledOrReadonly ||
                    (['uploaded', 'uploading', 'deletionError'].includes(fileData.state) &&
                        !fileData.editMode) ||
                    !!!changeDescription ? (
                        <div title={fileData.fileName} data-testid="read-only-text">
                            {fileData.description || fileData.fileName}
                        </div>
                    ) : (
                        <TextField {...getTextFieldProps()} tabIndex={tabIndex} />
                    )}
                </>
                <div role="filesize">{formatSize(fileData.fileSize)}</div>
                <div role="control">
                    {!['uploaded', 'uploading', 'deletionError'].includes(fileData.state) && (
                        <>
                            {uploadFile && (
                                <Button
                                    title="Upload file"
                                    className="icon-button-pos"
                                    tabIndex={tabIndex}
                                    disabled={disabledOrReadonly}
                                    onClick={() => uploadFile(fileData)}
                                >
                                    <UploadIcon />
                                </Button>
                            )}
                            <Button
                                title="Remove file"
                                className={!!uploadFile ? 'icon-button-neg' : 'icon-button'}
                                tabIndex={tabIndex}
                                disabled={!deleteFile || disabledOrReadonly}
                                onClick={deleteFile && deleteFile.bind(null, fileData)}
                            >
                                <DeleteIcon />
                            </Button>
                        </>
                    )}
                    {fileData.state === 'uploading' && fileData.cancelUpload && (
                        <Button
                            title="Cancel upload"
                            className="icon-button"
                            tabIndex={tabIndex}
                            onClick={fileData.cancelUpload}
                        >
                            <ClearIcon style={{ fill: '#f4645f' }} />
                        </Button>
                    )}
                    {fileData.state === 'uploading' && !fileData.cancelUpload && (
                        <LoadingIcon className="loading-icon" viewBox="0 0 24 24" />
                    )}
                    {['uploaded', 'deletionError'].includes(fileData.state) && !fileData.editMode && (
                        <ActionMenu
                            key={`actionMenu-${fileData.uid}`}
                            id={fileData.uid}
                            actions={fileActions({
                                fileData,
                                deleteFile,
                                downloadFile,
                                viewFile,
                                changeDescriptionMode,
                            })}
                            buttonProps={{
                                title: 'File menu',
                                tabIndex: tabIndex,
                            }}
                            buttonChildren={<MoreVertIcon />}
                            disabled={disabled || fileData.disabled}
                        />
                    )}
                    {['uploaded', 'deletionError'].includes(fileData.state) && fileData.editMode && (
                        <>
                            <Button
                                title="Confirm"
                                className="icon-button-pos"
                                tabIndex={tabIndex}
                                onClick={confirmDescriptionChanges}
                            >
                                <CheckIcon />
                            </Button>
                            <Button
                                title="Confirm"
                                className="icon-button-neg"
                                tabIndex={tabIndex}
                                onClick={undoDescriptionChanges}
                            >
                                <ClearIcon />
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    return compositeComponent;
};

export default CustomFileItemRenderer;
