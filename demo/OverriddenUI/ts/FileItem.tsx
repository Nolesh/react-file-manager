import React, { useRef, useState } from 'react';

import {
    AudioThumbnail,
    TProgressBarComponent,
    TFileItemRootStyles,
    TThumbnailFieldComponent,
    TInputFieldStyles,
    TSizeFieldStyle,
    TControlFieldMenu,
    TControlFieldButtons,
    IFileData,
    TControlFieldComponent,
    ActionMenu,
    Button,
    TSizeFieldComponent,
    TInputFieldComponent,
    IInputFieldProps,
    TThumbnailFieldStyles,
} from '../../../src/lib';

import { CircularProgress, MenuItem, Select } from '@material-ui/core';

const SelectField = (props: {
    data: string[];
    disabled: boolean;
    inputProps: IInputFieldProps;
}) => {
    const [fileName] = useState(props.inputProps.value);
    const data = Array.from(new Set([...props.data, fileName]));

    return (
        <Select fullWidth={true} disabled={props.disabled} {...props.inputProps}>
            {data.map((x, i) => (
                <MenuItem key={i} value={x}>
                    {x}
                </MenuItem>
            ))}
        </Select>
    );
};

export const CustomFileItemRootStyles: TFileItemRootStyles = {
    base: {
        className: 'display-item-overridden',
    },
    local: {
        className: 'display-item-local-overridden',
        // style: { background: 'linear-gradient(0deg, rgb(53 174 0) 0%, rgb(196 255 63) 100%)' }
        // style: { background: 'linear-gradient(0deg, rgb(53 174 0) 0%, rgb(196 255 63) 100%)' }
    },
    uploading: {
        className: 'display-item-uploading-overridden',
    },
    uploaded: {
        className: 'display-item-uploaded-overridden',
        // style: { background: 'linear-gradient(0deg, rgba(46,133,251,1) 0%, rgba(0,212,255,1) 100%)' }
    },
    editMode: {
        className: 'display-item-edit-mode-overridden',
        // style: { background: 'linear-gradient(0deg, rgb(226 216 0) 0%, rgb(255 247 148) 100%)' }
    },
    uploadError: {
        className: 'display-item-error-overridden',
        // style: { background: 'linear-gradient(0deg, rgb(174 72 69) 0%, rgb(255 94 88) 100%)' }
    },
    deletionError: {
        className: 'display-item-error-overridden',
        // style: { background: 'linear-gradient(0deg, rgb(174 72 69) 0%, rgb(255 94 88) 100%)' }
    },
    localDisabled: {
        className: 'display-item-disabled-overridden',
        // style: { color: '#999', background: '#ddd', pointerEvents:'none' }
    },
    uploadedDisabled: {
        className: 'display-item-disabled-overridden',
    },
};

const Loader = () => <span className="loader"></span>;

const formatDuration = (sec: number) => (
    (sec = sec ? sec : 0), new Date(sec * 1000).toISOString().substr(11, 8)
);

const VideoThumbnail = ({
    src,
    duration,
    videoWidth,
    videoHeight,
}: IFileData['previewData']): React.ReactNode => {
    return (
        <>
            <video
                width="60"
                height="60"
                muted
                playsInline
                src={src}
                onContextMenu={(e: React.MouseEvent) => {
                    e.preventDefault();
                }}
            />
            <div className="video-meta video-meta-header">
                {videoWidth}x{videoHeight}
            </div>
            <div className="video-meta video-meta-footer">{formatDuration(duration)}</div>
        </>
    );
};

export const CustomFileItemThumbnailComponent: TThumbnailFieldComponent = ({
    fileData,
    readOnly,
    disabled,
}) => {
    const type =
        fileData.fileType ||
        fileData?.file?.type?.split('/')?.pop()?.toUpperCase() ||
        (fileData.fileName.split('.').length > 1
            ? fileData.fileName.split('.').pop().toUpperCase()
            : '?');

    const opacity = readOnly || disabled ? 0.35 : 1;

    return (
        <div>
            {fileData.previewData && !fileData.previewData.src ? (
                <Loader />
            ) : fileData?.previewData?.tag === 'video' && fileData.previewData.src ? (
                VideoThumbnail(fileData.previewData)
            ) : fileData.file?.type?.startsWith('audio/') && fileData.previewData.src ? (
                <AudioThumbnail
                    src={fileData.previewData.src}
                    duration={fileData.previewData.duration}
                    styles={{
                        buttonContainer: { marginTop: 5, background: '#77777799' },
                        duration: {
                            marginTop: 2,
                            color: '#333',
                            fontWeight: 'bold',
                            textShadow: 'none',
                        },
                    }}
                />
            ) : (
                (!!fileData?.previewData?.src && (
                    <img
                        src={fileData.previewData.src}
                        style={{ opacity, maxWidth: 60, maxHeight: 60, border: '1px solid #555' }}
                    />
                )) || (
                    <div
                        style={{
                            fontSize: 14,
                            fontWeight: 'bold',
                            padding: 5,
                            border: '1px solid black',
                        }}
                    >
                        {type}
                    </div>
                )
            )}
        </div>
    );
};

export const CustomFileItemThumbnailStyles: TThumbnailFieldStyles = ({
    fileData,
    readOnly,
    disabled,
}) => ({
    container: { border: '1px dashed red' },
    type: { color: 'red' },
    loading: { fill: 'red' },
    audio: {
        type: { color: 'yellow' },
        duration: { color: 'yellow' },
        buttonContainer: { background: 'red' },
        buttonStart: { color: 'white' },
        buttonStop: { color: 'white' },
    },
    image: { maxWidth: 48, maxHeight: 48 },
    duration: { color: 'red' },
    default: { color: 'red' },
});

export const CustomFileItemNameStyles: TInputFieldStyles = ({ fileData, readOnly, disabled }) => ({
    readOnlyText: {
        style: {
            fontSize: 17,
            borderBottom:
                fileData.readOnly || fileData.disabled || readOnly || disabled
                    ? 'none'
                    : '1px solid black',
        },
    },
    textField: {
        style: {
            fontSize: 17,
            color: 'black',
            borderBottom:
                fileData.state === 'uploaded'
                    ? '2px solid rgb(0 206 255)'
                    : '2px solid rgb(188 255 61)',
        },
    },
});

export const CustomFileItemNameComponent: TInputFieldComponent = (props) => {
    const readOnlyOrDisabled =
        props.disabled || props.readOnly || props.fileData.readOnly || props.fileData.disabled;

    return (
        <SelectField
            data={['Antares', 'Betelgeuse', 'Calvera', 'Deneb']}
            disabled={
                (readOnlyOrDisabled || !props.fileData.editMode) && props.fileData.state !== 'local'
            }
            inputProps={props.getInputFieldProps()}
        />
    );
};

export const CustomFileItemSizeStyle: TSizeFieldStyle = ({ fileData, readOnly, disabled }) => {
    const noBorder = readOnly || disabled || fileData.disabled || fileData.readOnly;
    return {
        style: {
            fontSize: 17,
            color: 'black',
            fontWeight: 'bold',
            borderBottom: noBorder ? 'none' : '1px solid black',
        },
    };
};

export const CustomFileItemSizeComponent: TSizeFieldComponent = ({
    fileData,
    readOnly,
    disabled,
    formatSize,
}) => {
    const readOnlyOrDisabled = readOnly || disabled || fileData.disabled || fileData.readOnly;
    return (
        <div
            style={{
                color: readOnlyOrDisabled ? 'gray' : 'white',
                fontWeight: 'bold',
            }}
        >
            {formatSize(fileData.fileSize).toUpperCase()}
        </div>
    );
};

export const CustomActionMenuProps: TControlFieldMenu = ({ fileData, readOnly, disabled }) => {
    return {
        buttonProps: { title: 'File actions', style: { fontSize: 19, fontWeight: 'bold' } },
        buttonChildren: <span>...</span>,
        menuStyles: {
            layer: { background: '#aaccff77', opacity: 0 },
            menu: { background: '#acf', boxShadow: 'none', opacity: 0.85 },
        },
        menuItemStyle: { className: 'menu-item-overridden' },
    };
};

export const CustomButtonsProps: TControlFieldButtons = ({ fileData, readOnly, disabled }) => {
    return {
        uploadFile: { props: { style: { background: '#afa' }, title: 'Upload' } },
        removeLocalFile: { props: { style: { background: '#faa' }, title: 'Delete' } },
        confirmDescription: { children: <span>Yes</span>, props: { style: { color: '#07bb00' } } },
        undoDescription: { children: <span>No</span>, props: { style: { color: 'red' } } },
        loadingIcon: <Loader />,
    };
};

export const CustomControlComponent: TControlFieldComponent = ({
    fileData,
    readOnly,
    disabled,
    noKeyboard,
    changeDescription,
    changeDescriptionMode,
    confirmDescriptionChanges,
    deleteFile,
    downloadFile,
    undoDescriptionChanges,
    viewFile,
    uploadFile,
}) => {
    const tabIndex = noKeyboard ? -1 : 0;
    const disabledOrReadonly = disabled || fileData.disabled || readOnly || fileData.readOnly;
    const { cancelUpload } = fileData;

    return (
        <div>
            {!['uploaded', 'uploading', 'deletionError'].includes(fileData.state) && (
                <ActionMenu
                    key={`actionMenu-${fileData.uid}`}
                    id={fileData.uid}
                    actions={[
                        {
                            name: 'Remove',
                            action: deleteFile && deleteFile.bind(null, fileData),
                        },
                    ]
                        .concat(
                            uploadFile
                                ? [
                                      {
                                          name: 'Upload',
                                          action: uploadFile.bind(null, fileData as any),
                                      },
                                  ]
                                : null
                        )
                        .filter((x) => x != null)}
                    buttonProps={{
                        title: 'File menu',
                        tabIndex: tabIndex,
                    }}
                    buttonChildren={<div style={{ fontSize: 28 }}>&equiv;</div>}
                    disabled={disabled || fileData.disabled}
                />
            )}
            {fileData.state === 'uploading' && cancelUpload && (
                <Button
                    title="Cancel upload"
                    className="icon-button"
                    tabIndex={tabIndex}
                    onClick={cancelUpload}
                >
                    &#x02717;
                </Button>
            )}
            {fileData.state === 'uploading' && !cancelUpload && (
                <CircularProgress style={{ color: 'white' }} />
            )}
            {['uploaded', 'deletionError'].includes(fileData.state) && !fileData.editMode && (
                <ActionMenu
                    key={`actionMenu-${fileData.uid}`}
                    id={fileData.uid}
                    actions={[
                        {
                            name: 'View',
                            action: viewFile.bind(null, fileData),
                        },
                        {
                            name: 'Download',
                            action: downloadFile.bind(null, fileData),
                        },
                    ]}
                    buttonProps={{
                        title: 'File menu',
                        tabIndex: tabIndex,
                    }}
                    buttonChildren={<div style={{ fontSize: 28 }}>&equiv;</div>}
                    disabled={disabled || fileData.disabled}
                />
            )}
            {['uploaded', 'deletionError'].includes(fileData.state) && fileData.editMode && (
                <>
                    <Button
                        title="Confirm"
                        tabIndex={tabIndex}
                        disabled={disabledOrReadonly}
                        onClick={confirmDescriptionChanges}
                    >
                        &#x02713;
                    </Button>
                    <Button
                        title="Cancel"
                        tabIndex={tabIndex}
                        disabled={disabledOrReadonly}
                        onClick={undoDescriptionChanges}
                    >
                        &#x02717;
                    </Button>
                </>
            )}
        </div>
    );
};

export const CustomProgressBar: TProgressBarComponent = (progress) => {
    // return <div style={{position:'absolute', left:0, height: 3, background: 'rgb(0 120 255)', width:`calc(${progress}% - 7px)`}}></div>;
    return (
        <progress
            style={{ position: 'absolute', left: 0, top: 0, height: 5, width: '100%', zIndex: 999 }}
            max={100}
            value={progress}
        ></progress>
    );
};

export const readOnlyIconComponent = () => (
    <div
        style={{ position: 'absolute', bottom: 1, right: 1, fontSize: 12, cursor: 'default' }}
        title="Read-only mode"
    >
        &#x1F512;
    </div>
);
