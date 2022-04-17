import React from 'react';

import { Typography } from '@material-ui/core';

import FileManager, {
    IFileData,
    IRemoteFileData,
    TOnError,
    TGetUploadParams,
} from '../../../src/lib';

import 'react-file-manager-css';
// It's necessary to import overridden stylesheet after the main stylesheet
import '../overridden-ui.scss';

import {
    CustomFileItemRootStyles,
    CustomFileItemNameStyles,
    CustomFileItemThumbnail,
    CustomFileItemSizeStyle,
    CustomActionMenuProps,
    CustomButtonsProps,
    CustomProgressBar,
    CustomReadOnlyLabel,
} from './FileItem';

type TRequestFunc = (
    url: string,
    method?: 'GET' | 'POST' | 'DELETE',
    body?: Record<string, unknown> | null
) => Promise<any>;

interface IBasicParams {
    fetchRemoteFiles: () => Promise<IFileData[]>;
    fileFieldMapping: (fileData: any) => IFileData;
    getUploadParams: TGetUploadParams;
    viewFile: (fileData: IRemoteFileData) => Promise<Blob | void>;
    downloadFile: (fileData: IRemoteFileData) => Promise<Blob | void>;
    onError: TOnError;
}

// Retrieves the error message from the server error response
// Since our error response is an object containing a status and a message,
// we need to convert it to a string
const getErrorMessage = (error: { status: number; message: string }) => error.message;

const request: TRequestFunc = (url, method = 'GET', body = null) => {
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
        return Promise.resolve(response);
    });
};

const handleErrors: TOnError = (err) => {
    if (Array.isArray(err)) {
        const messages = err.reduce(
            (acc, val, indx) => acc.concat(`${indx + 1}. ${val.message}\n`),
            ''
        );
        alert(messages);
    } else {
        alert(err.message);
    }
};

const basicParams: IBasicParams = {
    fetchRemoteFiles: () => {
        return request('fetchFiles').then((res) => res.json());
    },
    fileFieldMapping: (data) => ({
        // We can omit this option if the component file fields are the same as the server fields.
        // We intentionally made them different to show how the files can be matched
        uid: data.file_id, // optional
        fileName: data.file_name, // required
        fileSize: data.file_size, // required
        fileType: data.file_type, // optional
        description: data.description, // optional
        previewData: {
            src: data.thumbnail, // optional
        },
        readOnly: data.read_only, // optional
        disabled: data.disabled, // optional
    }),
    getUploadParams: (localFileData) => ({
        URL: `/api/singleFileUpload`,
        // If the server returns anything other than uploaded file data,
        // we should return localFileData passed as function argument to use the internal file data.
        processResponse: (response) => localFileData,
        processError: getErrorMessage,
    }),
    viewFile: (fileData) => {
        // Requests a blob from the server and handles the error if it exists
        return request(`file/${fileData.fileName}`).then((resp) => resp.blob());
    },
    downloadFile: (fileData) => {
        // Uses the default filename(description) and handles the error if it exists
        return request(`file/${fileData.fileName}`).then((resp) => resp.blob());
    },
    onError: handleErrors,
};

const Component = () => {
    return (
        <div style={{ textAlign: 'center' }}>
            <Typography variant="h5" style={{ padding: 10 }}>
                An example of overridden container (root) and file element styles
            </Typography>

            <FileManager
                {...basicParams}
                // filePreview={(file)=> {
                //     // Overrides the default implementation for video files
                //     // Will take effect if thumbnail is overridden by CustomFileItemThumbnail
                //     if (file.type.startsWith('video/')) {
                //         return new Promise((resolve) => {
                //             const objectUrl = URL.createObjectURL(file);
                //             const video = document.createElement('video');
                //             video.src = objectUrl;
                //             video.onloadedmetadata = () => {
                //                 const { duration, videoWidth, videoHeight } = video;
                //                 // return required data for video thumbnail
                //                 resolve({ src: objectUrl, duration, videoWidth, videoHeight, tag: 'video' });
                //             };
                //         });
                //     }
                //
                //     // We must return a promise that resolves with a 'null' or 'undefined' to use the default implementation for the rest file types
                //     return Promise.resolve();
                // }}
                overrides={{
                    // uidGenerator: () => `uid-${new Date().getTime()}-${Math.random()*100}`, // uncomment to override the default implementation
                    // fileSizeFormatter: (size) => `${size.toLocaleString()} B`, // uncomment to override the default implementation
                    Root: {
                        // All options are independent and optional.
                        // hideHeader: true,
                        // hideFooter: true,
                        texts: {
                            // headerFileType: 'Type',
                            // headerFileName: 'Name',
                            // headerFileSize: 'Size',
                            // footer: 'Click here to open file selector',
                            // dragActiveAccept: 'Drop your file(s)',
                            dragActiveReject: 'Some files will NOT be accepted',
                            loading: 'Loading...',
                            defaultText:
                                'Drag & drop you file(s) here\nor click on the footer or empty area to open file selector',
                            defaultTextDisabled: 'File manager is disabled',
                        },
                        classNames: {
                            dropZone: 'drop-zone-overridden',
                            activeAccept: 'drop-zone-active-accept-overridden',
                            activeReject: 'drop-zone-active-reject-overridden',
                            header: 'drop-zone-header-overridden',
                            footer: 'drop-zone-footer-overridden',
                        },
                        styles: {
                            // dropZone: {width: 460, height: 250, overflowY: 'scroll'},
                            // header: { background: '#3f52b5', color: 'white' },
                            // footer: { background: '#3f52b5', color: 'white' },
                        },
                    },
                    FileItem: {
                        // All options are independent and optional.
                        titles: {
                            menuButtonTitle: 'File actions',
                        },
                        rootStyles: CustomFileItemRootStyles(),
                        thumbnail: CustomFileItemThumbnail,
                        fileName: CustomFileItemNameStyles,
                        fileSize: CustomFileItemSizeStyle,
                        actionMenu: CustomActionMenuProps,
                        buttons: CustomButtonsProps,
                        progressBar: CustomProgressBar,
                        readOnlyLabel: CustomReadOnlyLabel,
                    },
                }}
                // uploadFilesInOneRequest
                // autoUpload
            />
        </div>
    );
};

export default Component;
