import React from 'react';

import { Typography } from '@material-ui/core';

import FileManager, { TOnError } from '../../../src/lib';
// make sure you include the stylesheet otherwise the file manager will not be styled
import 'react-file-manager-css';

type TRequestFunc = (
    url: string,
    method?: 'GET' | 'POST' | 'DELETE',
    body?: Record<string, unknown> | null
) => Promise<any>;

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
    if (!Array.isArray(err)) alert(err.message);
    else {
        const messages = err.reduce(
            (acc, val, indx) => acc.concat(`${indx + 1}. ${val.message}\n`),
            ''
        );
        alert(messages);
    }
};

const Component = () => {
    return (
        <div style={{ textAlign: 'center' }}>
            <Typography variant="h5" style={{ padding: 10 }}>
                File manager supporting basic functionality
            </Typography>

            <FileManager
                fetchRemoteFiles={() => {
                    return request('fetchFiles').then((res) => res.json());
                }}
                fileFieldMapping={(data) => ({
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
                })}
                getUploadParams={(localFileData) => ({
                    URL: `/api/singleFileUpload`,
                    // If the server returns anything other than uploaded file data,
                    // we should return localFileData passed as function argument to use the internal file data.
                    processResponse: () => localFileData,
                    processError: getErrorMessage,
                })}
                viewFile={(fileData) => {
                    // Requests a blob from the server and handles the error if it exists
                    return request(`file/${fileData.fileName}`).then((resp) => resp.blob());
                }}
                downloadFile={(fileData) => {
                    // Uses the default filename(description) and handles the error if it exists
                    return request(`file/${fileData.fileName}`).then((resp) => resp.blob());
                }}
                deleteFile={(fileData) => {
                    return new Promise((resolve, reject) => {
                        if (window.confirm('Are you sure you want to delete this file?')) {
                            request(`file/${fileData.uid}`, 'DELETE')
                                .then((response) => response.json())
                                .then((resp) => {
                                    if (resp.result) resolve();
                                    else reject(resp.error);
                                })
                                .catch((err) => reject(err));
                        } else reject();
                    });
                }}
                onError={handleErrors}
            />
        </div>
    );
};

export default Component;
