import React from 'react';

import { Button, Typography } from '@material-ui/core';

import FileManager from 'react-file-manager';
import 'react-file-manager-css';

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
        return Promise.resolve(response);
    });
};

const handleErrors = (err) => {
    if (Array.isArray(err)) {
        const messages = err.reduce(
            (acc, val, indx) => acc.concat(`${indx + 1}. ${val.message}\n`),
            ''
        );
        alert(messages);
    } else {
        alert(err.message);
        // Navigate to the file item element...
        if (err.data.elementRef) {
            err.data.elementRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
};

const basicParams = {
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
    onError: handleErrors,
};

const Component = () => {
    let root = null;

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Typography variant="h5" style={{ padding: 10 }}>
                    An example of programmatically scrolling the container (root)
                </Typography>
            </div>

            <div style={{ textAlign: 'center' }}>
                <FileManager
                    {...basicParams}
                    getRoot={(el) => (root = el)} // Ref callback that gets a DOM reference to the root body element. Can be useful to programmatically scroll
                    onFilesUploaded={(fileData) => {
                        console.log(fileData[0]);
                        fileData[0].elementRef.current.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                        });
                    }}
                    onChangeLocalFileStack={(result, changedFiles) => {
                        console.log(
                            'onChangeLocalFileStack',
                            result,
                            changedFiles,
                            changedFiles[0]
                        );
                        if (changedFiles[0].elementRef)
                            changedFiles[0].elementRef.current.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center',
                            });
                    }}
                    deleteFile={(fileData) => {
                        // This is a stub to show the delete menu item
                        // to demonstrate navigating to the element being removed.
                        return new Promise((resolve, reject) => {
                            fileData.elementRef.current.scrollIntoView({
                                behavior: 'auto',
                                block: 'center',
                            });
                            const defBorder = fileData.elementRef.current.style.border;
                            fileData.elementRef.current.style.border = '1px solid red';
                            fileData.elementRef.current.style.transition = 'none';
                            // give some time for animation
                            setTimeout(() => {
                                if (window.confirm('Are you sure you want to delete this file?')) {
                                    resolve();
                                } else {
                                    fileData.elementRef.current.style.border = defBorder;
                                    reject();
                                }
                            }, 10);
                        });
                    }}
                    overrides={{
                        Root: {
                            // hideHeader: true, // Due to we are using the 'sortFiles' function, sorting in the header will not work. So we hide the header
                            styles: {
                                dropZone: { height: 220 },
                            },
                        },
                    }}
                />
            </div>

            <div className="button-container">
                <Button
                    variant="contained"
                    color="primary"
                    style={{ margin: 10, width: 200 }}
                    onClick={() => root.scroll({ top: 0, behavior: 'smooth' })}
                >
                    Top
                </Button>

                <Button
                    variant="contained"
                    color="primary"
                    style={{ margin: 10, width: 200 }}
                    onClick={() =>
                        root.scroll({
                            top: root.scrollHeight - root.clientHeight,
                            behavior: 'smooth',
                        })
                    }
                >
                    Bottom
                </Button>
            </div>
        </>
    );
};

export default Component;
