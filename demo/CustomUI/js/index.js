import React, { useState, useMemo } from 'react';

import { Checkbox, FormControlLabel, Typography } from '@material-ui/core';

import FileManager from 'react-file-manager';
import '../custom-ui.scss';

import { SimpleRoot } from './SimpleRoot';
import { ComplexRoot } from './ComplexRoot';
import { MaterialFileItemRenderer } from './FileItemMaterialUI';

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
    const [complexRoot, setComplexRoot] = useState(true);

    const overrides = useMemo(
        () => ({
            Root: {
                component: complexRoot ? ComplexRoot : SimpleRoot,
            },
            FileItem: {
                component: MaterialFileItemRenderer,
            },
        }),
        [complexRoot]
    );

    return (
        <div style={{ textAlign: 'center' }}>
            <Typography variant="h5" style={{ padding: 10 }}>
                An example of a custom container (root) and file item created with Material UI
            </Typography>

            <div className="checkbox-wrapper">
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={complexRoot}
                            onChange={(e, value) => setComplexRoot(value)}
                        />
                    }
                    label="Use complex container (root) with header and footer"
                />
            </div>

            <FileManager {...basicParams} addFileDescription overrides={overrides} />
        </div>
    );
};

export default Component;
