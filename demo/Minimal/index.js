import React from 'react';

import { Typography } from '@material-ui/core';

import FileManager from 'react-file-manager';
// make sure you include the stylesheet otherwise the file manager will not be styled
import 'react-file-manager-css';

const Component = () => (
    <div style={{ textAlign: 'center' }}>
        <Typography variant="h5" style={{ padding: 10 }}>
            Simple file uploader with minimal parameters
        </Typography>

        <FileManager
            getUploadParams={(localFileData) => ({
                URL: `/api/singleFileUpload`,
                // If the server returns anything other than null,
                // we should return it to remove uploaded file from the list.
                processResponse: () => null,
            })}
        />
    </div>
);

export default Component;
