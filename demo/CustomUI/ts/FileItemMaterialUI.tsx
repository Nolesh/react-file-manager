import React, { ReactElement } from 'react';

import { Button, TextField, Grid, Menu, MenuItem, CircularProgress } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { IMenuItem, IFileItemComponentProps } from '../../../src/lib';

type TFileItemComponent = (args: IFileItemComponentProps) => ReactElement;

const useStyles = makeStyles((theme) => ({
    displayItem: {
        position: 'relative',
        color: '#333',
        background: 'rgb(213, 213, 213)',
        borderRadius: 4,
        minHeight: 80,
        border: '1px solid #555',
        transition: 'background .2s ease-in-out',
    },
    displayItemUploaded: {
        color: 'white',
        background: '#3f52b5',
    },
    displayItemError: {
        background: '#f50057',
        // opacity: 0.7,
        //pointerEvents: 'none'
    },
    displayItemDisabled: {
        color: 'rgba(0, 0, 0, 0.26)',
        background: 'rgba(0, 0, 0, 0.12)',
        pointerEvents: 'none',
    },
    displayItemInEditMode: {
        background: '#3f52b599',
    },

    control: {
        padding: '5px 0',
        textAlign: 'center',
    },
    addFilesBtn: {
        float: 'left',
    },
    removeFilesBtn: {
        float: 'left',
        marginLeft: 10,
    },
    uploadBtn: {
        float: 'right',
    },

    image: {
        maxWidth: 60,
        maxHeight: 60,
    },

    imageWrapper: {
        borderRadius: 4,
        border: '1px solid #fff',
        width: '100%',
        height: '100%',
    },

    progress: {
        width: '50%',
        top: -3,
        left: 0,
        height: 3,
        background: '#f50057',
        position: 'absolute',
        margin: 3,
        borderRadius: 4,
        transition: 'width 0.5s',
    },

    readOnlyLabel: {
        position: 'absolute',
        top: 2,
        fontSize: 11,
        color: 'rgb(253 105 105)',
    },

    btn: {
        minWidth: 0,
        fontSize: 12,
        width: 45,
        height: 32,
    },

    smallBtn: {
        minWidth: 0,
        fontSize: 10,
        width: 32,
        height: 25,
        marginRight: 7,
    },
}));

function ActionMenu({
    actions,
    tabIndex,
    disabled,
}: {
    actions: IMenuItem[];
    tabIndex: number;
    disabled: boolean;
}) {
    if (!actions || actions.length === 0) return null;

    const [anchorEl, setAnchorEl] = React.useState(null);

    const handleClick = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
    const handleClose = () => setAnchorEl(null);

    return (
        <div>
            {
                <Button
                    variant="outlined"
                    color="inherit"
                    style={{ minWidth: 0, width: 40, fontSize: 12, color: 'white' }}
                    title="File actions"
                    onClick={handleClick}
                    tabIndex={tabIndex}
                    disabled={disabled}
                >
                    ...
                </Button>
            }
            <Menu
                id="row-action-menu"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleClose}
            >
                {actions.map((item, i) => (
                    <MenuItem
                        key={`action-${i}`}
                        onClick={() => {
                            handleClose();
                            item.action();
                        }}
                    >
                        {item.name}
                    </MenuItem>
                ))}
            </Menu>
        </div>
    );
}

// Extends custom render function to pass classes
const renderFileItemWithClasses = ({
    fileData,
    getInputFieldProps,
    getItemProps,
    getCommonProps,
    getActions,
}: IFileItemComponentProps): ReactElement => {
    const classes = useStyles();
    const { root, formatSize, isLocalFile, disabled, isDragActive, noKeyboard, readOnly } =
        getCommonProps();
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
        (fileData.fileName.split('.').length > 1
            ? fileData.fileName.split('.').pop().toUpperCase()
            : '?');
    const progress = (fileData.uploadedSize / fileData.totalSize) * 100;
    // fileData.state = 'uploading'

    const disabledOrReadonly = disabled || fileData.disabled || readOnly || fileData.readOnly;
    let rootClassName =
        classes.displayItem +
        ' ' +
        (fileData.state === 'uploaded' ? classes.displayItemUploaded : '') +
        ' ' +
        (['uploadError', 'deletionError'].includes(fileData.state)
            ? classes.displayItemError
            : '') +
        ' ' +
        (disabled || fileData.disabled ? classes.displayItemDisabled : '');
    if (!isLocalFile && fileData.editMode) rootClassName += ' ' + classes.displayItemInEditMode;

    const tabIndex = noKeyboard ? -1 : 0;

    return (
        <div {...getItemProps()} style={{ padding: 13 }}>
            <Grid
                container
                justifyContent="center"
                spacing={3}
                className={rootClassName}
                style={{ opacity: isDragActive ? 0.35 : 1 }}
            >
                {fileData.readOnly && <span className={classes.readOnlyLabel}>*ReadOnly</span>}
                {fileData.state === 'uploading' && (
                    <span
                        className={classes.progress}
                        style={{ width: `calc(${progress}% - 6px)` }}
                    ></span>
                )}
                <Grid
                    container
                    item
                    direction="column"
                    alignItems="center"
                    justifyContent="center"
                    xs={2}
                    style={{ borderRight: '1px solid white' }}
                >
                    {fileData.previewData && !fileData.previewData.src ? (
                        <CircularProgress style={{ color: 'white' }} />
                    ) : !!fileData?.previewData?.src &&
                      // We have not implemented an audio player component for thumbnails,
                      // so we need to ignore this file type
                      !fileData.file?.type?.startsWith('audio/') ? (
                        <img src={fileData.previewData.src} className={classes.image} />
                    ) : (
                        <div style={{ fontSize: 17, fontWeight: 'bold' }}>{type}</div>
                    )}
                </Grid>
                <Grid
                    container
                    item
                    direction="column"
                    alignItems="flex-start"
                    justifyContent="center"
                    xs={6}
                    style={{ borderRight: '1px solid white' }}
                >
                    {disabledOrReadonly ||
                    (['uploaded', 'uploading', 'deletionError'].includes(fileData.state) &&
                        !fileData.editMode) ||
                    !!!changeDescription ? (
                        fileData.description || fileData.fileName
                    ) : (
                        <TextField
                            {...getInputFieldProps()}
                            fullWidth
                            inputProps={{ tabIndex: tabIndex }}
                        />
                    )}
                </Grid>
                <Grid
                    container
                    item
                    direction="column"
                    alignItems="center"
                    justifyContent="center"
                    xs={2}
                    style={{ borderRight: '1px solid white' }}
                >
                    {formatSize(fileData.fileSize)}
                </Grid>
                <Grid
                    container
                    item
                    direction="column"
                    alignItems="center"
                    justifyContent="center"
                    xs={2}
                    // style={{ padding: '5px 12px' }}
                    style={{ padding: 5 }}
                >
                    {!['uploaded', 'uploading', 'deletionError'].includes(fileData.state) && (
                        <>
                            {uploadFile && (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    title="Upload file"
                                    className={classes.btn}
                                    style={{ marginBottom: 4 }}
                                    disabled={disabledOrReadonly}
                                    tabIndex={tabIndex}
                                    onClick={() => uploadFile(fileData)}
                                >
                                    &#10003;
                                </Button>
                            )}
                            <Button
                                variant="contained"
                                color="secondary"
                                title="Remove file"
                                className={classes.btn}
                                disabled={!deleteFile || disabledOrReadonly}
                                tabIndex={tabIndex}
                                onClick={deleteFile && deleteFile.bind(null, fileData)}
                            >
                                &#10007;
                            </Button>
                        </>
                    )}
                    {fileData.state === 'uploading' && fileData.cancelUpload && (
                        <Button
                            variant="contained"
                            color="secondary"
                            title="Cancel upload"
                            className={classes.btn}
                            tabIndex={tabIndex}
                            onClick={fileData.cancelUpload}
                        >
                            &#10007;
                        </Button>
                    )}
                    {fileData.state === 'uploading' && !fileData.cancelUpload && (
                        <CircularProgress />
                    )}
                    {['uploaded', 'deletionError'].includes(fileData.state) && !fileData.editMode && (
                        <ActionMenu
                            actions={(() => {
                                const rowActions: IMenuItem[] = [];
                                if (changeDescriptionMode && !fileData.readOnly)
                                    rowActions.push({
                                        name: 'Rename',
                                        action: changeDescriptionMode,
                                    });
                                if (viewFile)
                                    rowActions.push({
                                        name: 'View',
                                        action: viewFile.bind(null, fileData),
                                    });
                                if (downloadFile)
                                    rowActions.push({
                                        name: 'Download',
                                        action: downloadFile.bind(null, fileData),
                                    });
                                if (deleteFile && !fileData.readOnly)
                                    rowActions.push({
                                        name: 'Delete',
                                        action: deleteFile.bind(null, fileData),
                                    });
                                return rowActions;
                            })()}
                            tabIndex={tabIndex}
                            disabled={disabled || fileData.disabled}
                        />
                    )}
                    {['uploaded', 'deletionError'].includes(fileData.state) && fileData.editMode && (
                        <>
                            <Button
                                variant="contained"
                                color="primary"
                                title="Confirm"
                                className={classes.btn}
                                style={{ marginBottom: 4 }}
                                tabIndex={tabIndex}
                                onClick={confirmDescriptionChanges}
                            >
                                Yes
                            </Button>
                            <Button
                                variant="contained"
                                color="secondary"
                                title="Cancel"
                                className={classes.btn}
                                tabIndex={tabIndex}
                                onClick={undoDescriptionChanges}
                            >
                                No
                            </Button>
                        </>
                    )}
                </Grid>
            </Grid>
        </div>
    );
};

export const MaterialFileItemRenderer: TFileItemComponent = (args) =>
    renderFileItemWithClasses({ ...args });
