import React, { useMemo, useRef } from 'react';

import FileManager from '../../../src/lib';
// make sure you include the stylesheet otherwise the file manager will not be styled
import 'react-file-manager-css';

import InputComponent from './InputComponent';
import { makeStyles, Typography } from '@material-ui/core';
import clsx from 'clsx';

const useStyles = makeStyles((theme) => ({
    root: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },

    dropZone: {
        textAlign: 'center',
        border: '1px solid #999 !important',
        // transition: "all .35s ease-in-out !important",
        '&:hover': {
            cursor: 'pointer',
            boxShadow: 'inset 0 0 2px #333',
            border: '1px dashed #333 !important',
        },
        '& > div': {
            minHeight: '100% !important',
        },
    },
    dropZoneInactive: {
        '&:hover': {
            cursor: 'default',
            boxShadow: 'none',
            border: '1px solid #333 !important',
        },
    },
}));

// Retrieves the error message from the server error response
// Since our error response is an object containing a status and a message,
// we need to convert it to a string
const getErrorMessage = (error) => error.message;

const request = (url, method = 'GET', body = null) => {
    return fetch(`/api/${url}`, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    }).then(async (response) => {
        if (!response.ok) {
            // gets error information from the response body
            const errorInfo = await response.json();
            return Promise.reject(getErrorMessage(errorInfo));
        }
        const json = await response.json();
        return Promise.resolve(json);
    });
};

const handleErrors = (err) => {
    console.log('err', err);
    if (!Array.isArray(err)) alert(err.message?.responseBody?.message || err.message);
    else {
        const messages = err.reduce(
            (acc, val, indx) => acc.concat(`${indx + 1}. ${val.message}\n`),
            ''
        );
        alert(messages);
    }
};

export const uploadParams = (localFileData) => {
    return {
        URL: `/api/avatar`,
        // If the server returns anything other than uploaded file data,
        // we should return localFileData passed as function argument to use the internal file data.
        // processResponse: (response) => localFileData,
        processError: getErrorMessage,
    };
};

const deleteDocument = (fileData) =>
    new Promise((resolve, reject) => {
        if (window.confirm('Are you sure you want to delete your avatar?')) {
            request(`avatar`, 'DELETE')
                .then((resp) => {
                    if (resp.result) resolve();
                    else reject(resp.error);
                })
                .catch((err) => reject(err));
        }
    });

const overrideFn = (dropZoneClassName, avatarColor) => ({
    Root: {
        styles: {
            dropZone: {
                width: 220,
                minWidth: 'unset',
                height: 220,
                borderRadius: '50%',
                overflow: 'hidden',
                ...(avatarColor
                    ? {
                          background: avatarColor,
                          color: 'white',
                      }
                    : {}),
            },
            coverText: {
                color: 'white',
            },
            activeAccept: {
                background: '#0c0',
            },
            activeReject: {
                background: '#c00',
            },
        },
        classNames: {
            dropZone: dropZoneClassName,
        },

        hideHeader: true,
        hideFooter: true,
        texts: {
            defaultText: 'Drag & drop your avatar here',
            dragActiveAccept: 'Drop your avatar here',
            dragActiveReject: 'Invalid file type',
            loading: ' ',
        },
    },
    FileItem: {
        component: InputComponent,
    },
});

const Component = () => {
    const color = '#acf';

    const classes = useStyles();
    const ref = useRef();

    const overrides = useMemo(
        () =>
            overrideFn(
                clsx(classes.dropZone, {
                    [classes.dropZoneInactive]:
                        ref.current?.remoteFiles.length || ref.current?.localFiles.length,
                }),
                color
            ),
        [
            classes.dropZone,
            classes.dropZoneInactive,
            ref.current?.remoteFiles,
            ref.current?.localFiles,
            color,
        ]
    );

    return (
        <div className={classes.root}>
            <div>
                <Typography variant="h5" style={{ padding: 10, marginBottom: 20 }}>
                    This example demonstrates how you can transform the file manager into an avatar
                    uploader.
                </Typography>
            </div>

            <FileManager
                ref={ref}
                fetchRemoteFiles={() => request('avatar')}
                getUploadParams={uploadParams}
                deleteFile={deleteDocument}
                overrides={overrides}
                maxFileSize={1024 * 1024 * 2} // 2 Mb
                // minFileSize={1024 * 10} // 10 kB
                accept={'image/*'}
                maxFileCount={1}
                multiple={false}
                autoUpload
                onError={handleErrors}
            />
        </div>
    );
};

export default Component;
