import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { IFileItemComponentProps, Icons } from '../../../src/lib';
import { IconButton } from '@material-ui/core';
import RadialProgress from './RadialProgress';

const useStyles = makeStyles((theme) => ({
    root: {
        padding: 10,
    },
    avatar: {
        position: 'relative',
        width: 200,
        height: 200,
        borderRadius: '50%',
        overflow: 'hidden',
        '& > img': {
            objectFit: 'cover',
            width: '100%',
            height: '100%',
        },
        '&:hover $cover': {
            opacity: 1,
        },
    },
    cover: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        backgroundColor: '#ffffff77',
        transition: 'opacity 0.3s',
        opacity: 0,
    },
    deleteBtn: {
        top: 76,
    },
    deleteIcon: {
        color: '#a00',
    },
}));

const InputComponent = (props: IFileItemComponentProps) => {
    const classes = useStyles();

    const uploadProgress = (props.fileData.uploadedSize / props.fileData.totalSize) * 100;

    const { isLocalFile } = props.getCommonProps();
    const { deleteFile } = props.getActions();

    const removeAvatar = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.stopPropagation();
        deleteFile?.(props.fileData);
    };

    return (
        <div className={classes.root}>
            {isLocalFile && (
                <RadialProgress
                    progress={uploadProgress}
                    radius={106}
                    stroke={10}
                    size={220}
                    color="#7fa"
                />
            )}
            <div className={classes.avatar}>
                <div className={classes.cover}>
                    <IconButton
                        className={classes.deleteBtn}
                        title="Remove Avatar"
                        onClick={removeAvatar}
                    >
                        <Icons.DeleteIcon style={{ fill: '#c00' }} />
                    </IconButton>
                </div>
                <img src={props.fileData.previewData?.src} />
            </div>
        </div>
    );
};

export default InputComponent;
