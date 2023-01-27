import React, { ReactElement, useEffect, useMemo } from 'react';

import {
    Button,
    ActionMenu,
    TextField,
    AudioThumbnail,
    IMenuItem,
    ImageLazyLoader,
    IAudioThumbnailProps,
} from './Components';

import {
    ILocalFileData,
    IFileItemComponentProps,
    IOverriddenFileItem,
    TTitles,
    TMenuItemNames,
    defaultClassNames,
} from './FileItemComponent';
import {
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
} from './SvgIcons';
import { mergeObjects, formatDuration, insertIntoObject, mergeStyles } from './Utils';
import { TStyle } from './Utils/types';

// -----------------------------------------------------------------------------

interface IFileActions {
    fileData: ILocalFileData;
    deleteFile: (fileData: ILocalFileData) => void;
    downloadFile: (fileData: ILocalFileData) => void;
    viewFile: (fileData: ILocalFileData) => void;
    changeDescriptionMode: () => void;
    displayIcons: boolean;
    itemNames: TMenuItemNames;
}

interface IThumbnailStyles {
    container?: React.CSSProperties;
    type?: React.CSSProperties;
    loading?: React.CSSProperties;
    audio?: Omit<IAudioThumbnailProps['styles'], 'type'>;
    image?: React.CSSProperties;
    default?: React.CSSProperties;
}

// -----------------------------------------------------------------------------

const defaultTitles: TTitles = {
    uploadFile: 'Upload file',
    cancelUpload: 'Cancel upload',
    removeLocalFile: 'Remove file',
    confirmDescription: 'Confirm',
    undoDescription: 'Cancel',
    menuButtonTitle: 'File menu',
    menuItemView: 'View',
    menuItemDownload: 'Download',
    menuItemRename: 'Rename',
    menuItemDelete: 'Delete',
};

// -----------------------------------------------------------------------------

export const fileActions = ({
    fileData,
    deleteFile,
    downloadFile,
    viewFile,
    changeDescriptionMode,
    displayIcons = true,
    itemNames,
}: IFileActions): IMenuItem[] => {
    const rowActions: IMenuItem[] = [];

    if (viewFile)
        rowActions.push({
            icon: displayIcons && <VisibilityIcon />,
            name: itemNames.menuItemView,
            action: viewFile.bind(null, fileData),
        });
    if (downloadFile)
        rowActions.push({
            icon: displayIcons && <GetAppIcon />,
            name: itemNames.menuItemDownload,
            action: downloadFile.bind(null, fileData),
        });
    if (changeDescriptionMode)
        rowActions.push({
            icon: displayIcons && <EditIcon />,
            name: itemNames.menuItemRename,
            action: changeDescriptionMode,
        });
    if (deleteFile)
        rowActions.push({
            icon: displayIcons && <DeleteIcon />,
            name: itemNames.menuItemDelete,
            action: deleteFile.bind(null, fileData),
        });

    return rowActions;
};

const getRootStyles = <T extends IOverriddenFileItem['rootStyles']>(
    overrides: T,
    fileData: ILocalFileData,
    disabled: boolean
    // isLocalFile: boolean
) => {
    const getOverriddenStyle = (overrides: T, field: 'className' | 'style') =>
        Object.entries(overrides || {})
            .map((x) => (x[1][field] ? { [x[0]]: x[1][field] } : {}))
            .reduce((acc, val) => ({ ...acc, ...val }), {});

    const overriddenRootClassNames = getOverriddenStyle(overrides, 'className');
    const overriddenRootStyles = getOverriddenStyle(overrides, 'style');

    const { classNames, styles, mergedResult } = mergeStyles(
        defaultClassNames,
        overriddenRootClassNames,
        overriddenRootStyles
    );

    const rootStyle = {
        className: classNames.base,
        style: styles.base,
    };

    const extStyles = <T, R extends Record<string, React.CSSProperties>>(
        defaultStyles: TStyle,
        classNames: T,
        styles: R,
        fieldName: keyof (T | R)
    ) => ({
        className: `${defaultStyles.className} ${classNames[fieldName]}`,
        style: { ...(defaultStyles.style || {}), ...(styles[fieldName] || {}) },
    });

    if ((disabled || fileData.disabled) && fileData.state !== 'uploading') {
        return ['uploaded', 'deletionError'].includes(fileData.state)
            ? extStyles(rootStyle, classNames, styles, 'uploadedDisabled')
            : extStyles(rootStyle, classNames, styles, 'localDisabled');
    } else if (fileData.state === 'deletionError')
        return extStyles(rootStyle, classNames, styles, 'deletionError');
    else if (fileData.state === 'uploadError')
        return extStyles(rootStyle, classNames, styles, 'uploadError');
    else if (fileData.state === 'uploaded') {
        return fileData.editMode
            ? extStyles(rootStyle, classNames, styles, 'editMode')
            : extStyles(rootStyle, classNames, styles, 'uploaded');
    } else if (fileData.state === 'uploading')
        return extStyles(rootStyle, classNames, styles, 'uploading');
    else return extStyles(rootStyle, classNames, styles, 'local');
};

const getThumbnail = (
    fileData: ILocalFileData,
    readOnly: boolean,
    disabled: boolean,
    type: string,
    root: HTMLDivElement,
    overrides?: ReturnType<IOverriddenFileItem['thumbnailFieldStyles']>,
    component?: IOverriddenFileItem['thumbnailFieldComponent']
) =>
    component ? (
        component({ fileData, readOnly, disabled })
    ) : (
        <div role="thumbnail" className={`type-wrapper`} style={overrides?.container}>
            {fileData.file?.type && fileData.previewData && !fileData.previewData.src ? (
                <>
                    <div className="type-img" style={overrides?.type}>
                        {type}
                    </div>
                    <LoadingIcon
                        data-testid="loading-icon"
                        className="image-loading-icon"
                        viewBox="0 0 24 24"
                        style={overrides?.loading}
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
                    styles={{
                        type: overrides?.type,
                        duration: overrides?.duration,
                        ...overrides?.audio,
                    }}
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
                                            style={overrides?.loading}
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
                                    <img src={fileData.previewData.src} style={overrides?.image} />
                                </ImageLazyLoader>
                            }
                            <div className="type-img" style={overrides?.type}>
                                {type}
                            </div>
                            {fileData.previewData.duration && (
                                <div className="duration" style={overrides?.duration}>
                                    {formatDuration(fileData.previewData.duration)}
                                </div>
                            )}
                        </div>
                    )) || (
                    <div className="type" style={overrides?.default}>
                        {type}
                    </div>
                )
            )}
        </div>
    );

const fileDataKeys: (keyof ILocalFileData)[] = [
    'uid',
    'file',
    'description',
    'disabled',
    'editMode',
    'elementRef',
    'fileName',
    'fileSize',
    'fileType',
    'previewData',
    'readOnly',
    'state',
];

// -----------------------------------------------------------------------------

const DefaultFileItemRenderer = ({
    fileData,
    getInputFieldProps,
    getItemProps,
    getCommonProps,
    getActions,
    overrides, // additional property that contains overrides
}: IFileItemComponentProps & { overrides: IOverriddenFileItem }): ReactElement => {
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

    const progress = ((fileData.uploadedSize || 0) / (fileData.totalSize || 1)) * 100;

    const disabledOrReadonly = disabled || fileData.disabled || readOnly || fileData.readOnly;

    const tabIndex = noKeyboard ? -1 : 0;

    const fileDataDeps = fileDataKeys.map((x) => fileData[x]);
    const commonDeps = [readOnly, disabled, ...fileDataDeps];

    const titles: TTitles = useMemo(
        () => ({
            ...defaultTitles,
            ...overrides?.titles,
        }),
        [overrides?.titles]
    );

    const rootStyle = useMemo(() => {
        const overriddenRoot = insertIntoObject(
            overrides?.rootStyles || {},
            { opacity: isDragActive ? 0.5 : 1 },
            'base.style'
        );
        return getRootStyles(overriddenRoot, fileData, disabled);
    }, [overrides?.rootStyles, isDragActive, ...commonDeps]);

    const thumbnail = useMemo(
        () =>
            getThumbnail(
                fileData,
                readOnly,
                disabled,
                type,
                root,
                overrides?.thumbnailFieldStyles?.({ fileData, readOnly, disabled }),
                overrides?.thumbnailFieldComponent
            ),
        [
            overrides?.thumbnailFieldStyles,
            overrides?.thumbnailFieldComponent,
            root,
            type,
            ...commonDeps,
        ]
    );

    const inputComponent = useMemo(() => {
        const customComponent =
            overrides?.inputFieldComponent?.({
                fileData,
                readOnly,
                disabled,
                changeDescription,
                changeDescriptionMode,
                confirmDescriptionChanges,
                undoDescriptionChanges,
                getInputFieldProps,
            }) ?? null;
        if (customComponent) return customComponent;

        // or return default implementation
        const fileNameStyles = overrides?.inputFieldStyles?.({
            fileData,
            readOnly,
            disabled,
        });
        return (
            <>
                {disabledOrReadonly ||
                (['uploaded', 'uploading', 'deletionError'].includes(fileData.state) &&
                    !fileData.editMode) ||
                !!!changeDescription ? (
                    <div
                        {...fileNameStyles?.readOnlyText}
                        title={fileData.fileName}
                        data-testid="read-only-text"
                    >
                        {fileData.description || fileData.fileName}
                    </div>
                ) : (
                    <TextField
                        {...getInputFieldProps()}
                        {...fileNameStyles?.textField}
                        tabIndex={tabIndex}
                    />
                )}
            </>
        );
    }, [
        overrides?.inputFieldComponent,
        overrides?.inputFieldStyles,
        getInputFieldProps,
        getActions,
        ...commonDeps,
    ]);

    const fileSize = useMemo(
        () =>
            overrides?.sizeFieldComponent?.({
                fileData,
                readOnly,
                disabled,
                formatSize,
            }) ?? (
                <div
                    role="filesize"
                    {...overrides?.sizeFieldStyle?.({ fileData, readOnly, disabled })}
                >
                    {formatSize(fileData.fileSize)}
                </div>
            ),
        [overrides?.sizeFieldComponent, overrides?.sizeFieldStyle, formatSize, ...commonDeps]
    );

    // Control
    const control = useMemo(() => {
        const customControl = overrides?.controlField?.component?.({
            fileData,
            readOnly,
            disabled,
            noKeyboard,
            ...{ ...getActions() },
        });
        if (!!customControl) return customControl;

        // or return default implementation
        const actionMenuProps = {
            buttonChildren: <MoreVertIcon />,
            ...overrides?.controlField?.menu?.({ fileData, readOnly, disabled }),
        };
        const actionMenu = (
            <ActionMenu
                key={`actionMenu-${fileData.uid}`}
                id={fileData.uid}
                actions={fileActions({
                    fileData,
                    deleteFile,
                    downloadFile,
                    viewFile,
                    changeDescriptionMode,
                    displayIcons: actionMenuProps.displayIcons,
                    itemNames: {
                        ...titles,
                        ...actionMenuProps.menuItemNames,
                    },
                })}
                buttonProps={{
                    title: titles.menuButtonTitle,
                    ...actionMenuProps.buttonProps,
                    tabIndex: tabIndex,
                }}
                buttonChildren={actionMenuProps.buttonChildren}
                menuStyles={actionMenuProps?.menuStyles}
                menuItemStyle={{ ...actionMenuProps?.menuItemStyle }}
                disabled={disabled || fileData.disabled}
            />
        );

        const getIconStyle = (fill?: string) =>
            disabledOrReadonly ? { fill: '#aaa' } : fill ? { fill } : {};
        const buttonsProps = mergeObjects(
            {
                uploadFile: {
                    props: { title: titles.uploadFile, className: 'icon-button-pos' },
                    children: <UploadIcon style={getIconStyle()} />,
                },
                cancelUpload: {
                    props: { title: titles.cancelUpload, className: 'icon-button' },
                    children: <ClearIcon style={getIconStyle('#f4645f')} />,
                },
                removeLocalFile: {
                    props: {
                        title: titles.removeLocalFile,
                        className: !!uploadFile ? 'icon-button-neg' : 'icon-button',
                    },
                    children: <DeleteIcon style={getIconStyle()} />,
                },
                confirmDescription: {
                    props: { title: titles.confirmDescription, className: 'icon-button-pos' },
                    children: <CheckIcon style={getIconStyle()} />,
                },
                undoDescription: {
                    props: { title: titles.undoDescription, className: 'icon-button-neg' },
                    children: <ClearIcon style={getIconStyle()} />,
                },
                loadingIcon: (
                    <LoadingIcon
                        data-testid="loading-icon-stub"
                        className="loading-icon"
                        viewBox="0 0 24 24"
                    />
                ),
            },
            overrides?.controlField?.buttons?.({
                fileData,
                readOnly,
                disabled,
            })
        );

        return (
            <div role="control">
                {!['uploaded', 'uploading', 'deletionError'].includes(fileData.state) && (
                    <>
                        {uploadFile && (
                            <Button
                                {...buttonsProps.uploadFile.props}
                                tabIndex={tabIndex}
                                disabled={disabledOrReadonly}
                                onClick={() => uploadFile(fileData)}
                            >
                                {buttonsProps.uploadFile.children}
                            </Button>
                        )}
                        <Button
                            {...buttonsProps.removeLocalFile.props}
                            tabIndex={tabIndex}
                            disabled={!deleteFile || disabledOrReadonly}
                            onClick={deleteFile && deleteFile.bind(null, fileData)}
                        >
                            {buttonsProps.removeLocalFile.children}
                        </Button>
                    </>
                )}
                {fileData.state === 'uploading' && fileData.cancelUpload && (
                    <Button
                        {...buttonsProps.cancelUpload.props}
                        tabIndex={tabIndex}
                        onClick={fileData.cancelUpload}
                    >
                        {buttonsProps.cancelUpload.children}
                    </Button>
                )}
                {fileData.state === 'uploading' &&
                    !fileData.cancelUpload &&
                    buttonsProps.loadingIcon}
                {['uploaded', 'deletionError'].includes(fileData.state) &&
                    !fileData.editMode &&
                    actionMenu}
                {['uploaded', 'deletionError'].includes(fileData.state) && fileData.editMode && (
                    <>
                        <Button
                            {...buttonsProps.confirmDescription.props}
                            tabIndex={tabIndex}
                            disabled={disabledOrReadonly}
                            onClick={confirmDescriptionChanges}
                        >
                            {buttonsProps.confirmDescription.children}
                        </Button>
                        <Button
                            {...buttonsProps.undoDescription.props}
                            tabIndex={tabIndex}
                            disabled={disabledOrReadonly}
                            onClick={undoDescriptionChanges}
                        >
                            {buttonsProps.undoDescription.children}
                        </Button>
                    </>
                )}
            </div>
        );
    }, [
        overrides?.controlField?.component,
        overrides?.controlField?.menu,
        overrides?.controlField?.buttons,
        titles,
        disabledOrReadonly,
        tabIndex,
        fileData.cancelUpload,
        getActions,
        ...commonDeps,
    ]);

    const progressBar = useMemo(
        () =>
            showProgress
                ? overrides?.progressBarComponent?.(progress) ?? (
                      <span
                          role="progressbar"
                          className={`progress`}
                          style={{ width: `calc(${progress}% - 7px)` }}
                      ></span>
                  )
                : null,
        [overrides?.progressBarComponent, showProgress, progress]
    );

    const readOnlyLabel = useMemo(
        () =>
            overrides?.readOnlyIconComponent?.() ?? (
                <div className="read-only-label" data-testid="read-only-label" title="Read-only">
                    <LockIcon />
                </div>
            ),
        [overrides?.readOnlyIconComponent]
    );

    return (
        <div {...getItemProps()} {...rootStyle}>
            {fileData.readOnly && readOnlyLabel}
            {progressBar}
            <div className="grid">
                {thumbnail}
                {inputComponent}
                {fileSize}
                {control}
            </div>
        </div>
    );
};

export default DefaultFileItemRenderer;
