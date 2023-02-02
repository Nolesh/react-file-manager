import React from 'react';

import { Typography } from '@material-ui/core';

import FileManager, {
    IFileData,
    IRemoteFileData,
    TOnError,
    TGetUploadParams,
} from '../../../src/lib';
import 'react-file-manager-css';

import CustomFileItemThumbnail from './Thumbnail';

// Imports an NPM package to create a PDF preview
const PDFJS = require('pdfjs-dist/webpack');

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
        <>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Typography variant="h5" style={{ padding: 10 }}>
                    An example of overriding the file preview function
                    <ul style={{ fontSize: 15 }}>
                        <li>Adds thumbnail for PDF files</li>
                        <li>Uses custom audio & video thumbnails</li>
                        <li>Disables PNG images</li>
                    </ul>
                </Typography>
            </div>

            <div style={{ textAlign: 'center' }}>
                <FileManager
                    {...basicParams}
                    filePreview={(file) => {
                        if (file.type === 'application/pdf') {
                            const promise = new Promise<string>((resolve) => {
                                const objectUrl = URL.createObjectURL(file);
                                PDFJS.getDocument(objectUrl).promise.then((pdf: any) => {
                                    pdf.getPage(1).then((page: any) => {
                                        const scale = '1.5';
                                        const viewport = page.getViewport({
                                            scale: scale,
                                        });
                                        const canvas = document.createElement('canvas');
                                        const canvasContext = canvas.getContext('2d');
                                        canvas.height =
                                            viewport.height ||
                                            viewport.viewBox[3]; /* viewport.height is NaN */
                                        canvas.width =
                                            viewport.width ||
                                            viewport.viewBox[2]; /* viewport.width is also NaN */
                                        page.render({
                                            canvasContext,
                                            viewport,
                                        }).promise.then(() => resolve(canvas.toDataURL()));
                                    });
                                });
                            });

                            // Prevents a long loading process (optional)
                            const result = Promise.race([
                                promise,
                                new Promise((resolve) => {
                                    setTimeout(resolve, 1000);
                                }),
                            ]).then((result) => {
                                if (!result)
                                    console.warn('It takes too long to create a PDF thumbnail');
                                return result as void;
                            });

                            return result;
                        }
                        // Overrides default implementation for video files
                        // Will take effect if thumbnail is overridden by CustomFileItemThumbnail
                        else if (file.type.startsWith('video/')) {
                            return new Promise((resolve) => {
                                const objectUrl = URL.createObjectURL(file);
                                const video = document.createElement('video');
                                video.src = objectUrl;
                                video.onloadedmetadata = () => {
                                    const { duration, videoWidth, videoHeight } = video;
                                    resolve({
                                        src: objectUrl,
                                        duration,
                                        videoWidth,
                                        videoHeight,
                                        tag: 'video',
                                    });
                                };
                            });
                        }
                        // Overrides default implementation for all images
                        // else if(file.type.startsWith('image/')){
                        //   const imageUrl = URL.createObjectURL(file);
                        //   return Promise.resolve(imageUrl);
                        // }
                        // Prevent the default implementation if the file type is PNG (ignore PNG images)
                        else if (file.type.startsWith('image/png')) {
                            return Promise.reject();
                        }

                        return Promise.resolve(); // We must return a promise that resolves with a 'null' or 'undefined' to use the default implementation for the rest file types
                        // return Promise.reject(); // If we want to prevent the default implementation for the rest file types
                    }}
                    overrides={{
                        FileItem: {
                            readOnlyIconComponent: () => (
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: 1,
                                        right: 1,
                                        fontSize: 12,
                                        cursor: 'default',
                                    }}
                                    title="Read-only mode"
                                >
                                    &#x1F512;
                                </div>
                            ),
                            // readOnlyIconComponent: () => <div></div>,
                            thumbnailFieldComponent: CustomFileItemThumbnail,
                        },
                    }}
                />
            </div>
        </>
    );
};

export default Component;
