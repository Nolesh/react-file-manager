import React, { useRef, useState } from 'react';

import {
    TTitles,
    TFileItemRootStyles,
    TProgressBarComponent,
    IFileData,
    ActionMenu,
    Button,
    IInputFieldProps,
    TThumbnailFieldStyles,
    TThumbnailFieldComponent,
    TInputFieldStyles,
    TInputFieldComponent,
    TSizeFieldStyle,
    TSizeFieldComponent,
    TControlFieldMenu,
    TControlFieldButtons,
    TControlFieldComponent,
    TReadOnlyIconComponent,
} from '../../lib';

import { Select, MenuItem, CircularProgress } from '@material-ui/core';

const SelectField = (props: {
    data: string[];
    disabled: boolean;
    inputProps: IInputFieldProps;
}) => {
    const data = Array.from(new Set([...props.data, props.inputProps.value]));

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
        className: 'display-item-custom',
        style: {
            position: 'relative',
            border: '1px solid black',
            margin: 3,
            color: 'black',
        },
    },
    local: {
        className: 'display-item-local-custom',
        // style: { background: 'linear-gradient(0deg, rgb(53 174 0) 0%, rgb(196 255 63) 100%)' }
        // style: { background: 'linear-gradient(0deg, rgb(53 174 0) 0%, rgb(196 255 63) 100%)' }
    },
    uploading: {
        className: 'display-item-uploading-custom',
    },
    uploaded: {
        className: 'display-item-uploaded-custom',
        // style: { background: 'linear-gradient(0deg, rgba(46,133,251,1) 0%, rgba(0,212,255,1) 100%)' }
    },
    editMode: {
        className: 'display-item-edit-mode-custom',
        // style: { background: 'linear-gradient(0deg, rgb(226 216 0) 0%, rgb(255 247 148) 100%)' }
    },
    uploadError: {
        className: 'display-item-error-custom',
        // style: { background: 'linear-gradient(0deg, rgb(174 72 69) 0%, rgb(255 94 88) 100%)' }
    },
    deletionError: {
        className: 'display-item-error-custom',
        // style: { background: 'linear-gradient(0deg, rgb(174 72 69) 0%, rgb(255 94 88) 100%)' }
    },
    uploadedDisabled: {
        className: 'display-item-uploaded-disabled-custom',
        // style: { color: '#999', background: '#ddd', pointerEvents:'none' }
    },
    localDisabled: {
        className: 'display-item-local-disabled-custom',
        // style: { color: '#999', background: '#ddd', pointerEvents:'none' }
    },
};

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

const AudioThumbnail = ({ uid, src, duration }: { uid: string; src: string; duration: number }) => {
    const [currentTime, setCurrentTime] = useState(duration);
    const [state, setState] = useState<'playing' | 'paused'>('paused');
    const playerRef = useRef<HTMLAudioElement>();

    const containerStyle: React.CSSProperties = {
        cursor: 'pointer',
        background: '#ffffff55',
        borderRadius: '50%',
        width: 32,
        height: 32,
        marginLeft: 6,
    };

    const buttonStyle: React.CSSProperties = {
        position: 'absolute',
        fontSize: 19,
        top: 6,
        marginLeft: -7,
    };

    const play = () => {
        if (playerRef.current) {
            playerRef.current.play();
            setState('playing');
        }
    };

    const pause = () => {
        if (playerRef.current) {
            playerRef.current.pause();
            setState('paused');
        }
    };

    const onTimeUpdate = () => {
        if (playerRef.current) setCurrentTime(playerRef.current.currentTime);
    };

    return (
        <>
            <div style={containerStyle} onClick={() => (state === 'playing' ? pause() : play())}>
                <audio
                    ref={playerRef}
                    id={`audio-${uid}`}
                    src={src}
                    onEnded={() => {
                        setState('paused');
                        setCurrentTime(duration);
                    }}
                    onTimeUpdate={onTimeUpdate}
                />
                {state === 'paused' ? (
                    <span style={buttonStyle}>&#9654;</span>
                ) : (
                    <span style={{ ...buttonStyle, ...{ marginLeft: -7, top: 5 } }}>| |</span>
                )}
            </div>
            <div style={{ fontSize: 12, marginTop: 5 }}>{formatDuration(currentTime)}</div>
        </>
    );
};

const Loader = () => (
    <span className="loader">
        <span className="small"></span>
    </span>
);

export const CustomTitles: TTitles = {
    menuButtonTitle: 'File actions',
    menuItemView: 'View',
    menuItemDownload: 'Download',
    menuItemRename: 'Rename',
    menuItemDelete: 'Delete',
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
                // <CircularProgress style={{ color: 'white' }}/>
                <Loader />
            ) : fileData?.previewData?.tag === 'video' && fileData.previewData.src ? (
                VideoThumbnail(fileData.previewData)
            ) : fileData.file?.type?.startsWith('audio/') && fileData.previewData.src ? (
                <AudioThumbnail
                    uid={fileData.uid}
                    src={fileData.previewData.src}
                    duration={fileData.previewData.duration}
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
            data={[
                'Antares',
                'Betelgeuse',
                'Calvera',
                'Deneb',
                props.fileData.oldDescription ||
                    props.fileData.description ||
                    props.fileData.fileName,
            ]}
            disabled={readOnlyOrDisabled || !props.fileData.editMode}
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
        // displayIcons: false,
        menuStyles: {
            layer: { background: '#aaccff77', opacity: 0 },
            menu: { background: '#acf', boxShadow: 'none', opacity: 0.85 },
        },
        menuItemStyle: { className: 'menu-item-custom' },
        // menuItemNames: {
        //     menuItemView: 'View',
        //     menuItemDownload: 'Download',
        //     menuItemRename: 'Rename',
        //     menuItemDelete: 'Remove'
        // }
    };
};

export const CustomButtonsProps: TControlFieldButtons = ({ fileData, readOnly, disabled }) => {
    return {
        uploadFile: { props: { style: { background: '#afa' } } },
        removeLocalFile: { props: { style: { background: '#faa' } } },
        confirmDescription: { children: <span>Yes</span>, props: { style: { color: '#07bb00' } } },
        undoDescription: { children: <span>No</span>, props: { style: { color: 'red' } } },
        loadingIcon: <CircularProgress />,
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
    // console.log('cancelUpload', cancelUpload);

    return (
        <div>
            {!['uploaded', 'uploading', 'deletionError'].includes(fileData.state) && (
                <ActionMenu
                    key={`actionMenu-${fileData.uid}`}
                    id={fileData.uid}
                    actions={[
                        {
                            name: 'Upload',
                            action: uploadFile && uploadFile.bind(null, fileData as any),
                        },
                        {
                            name: 'Remove',
                            action: deleteFile && deleteFile.bind(null, fileData),
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
                    ]
                        .concat(
                            !fileData.readOnly
                                ? [
                                      {
                                          name: 'Rename',
                                          action: changeDescriptionMode,
                                      },
                                      {
                                          name: 'Delete',
                                          action: deleteFile && deleteFile.bind(null, fileData),
                                      },
                                  ]
                                : (null as any)
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

export const CustomReadOnlyIcon: TReadOnlyIconComponent = () => (
    <div
        style={{ position: 'absolute', bottom: 1, right: 1, fontSize: 12, cursor: 'default' }}
        title="Read-only mode"
    >
        &#x1F512;
    </div>
);
