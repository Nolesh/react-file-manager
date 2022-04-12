import React, { FC } from 'react';

import { CircularProgress } from '@material-ui/core';
import { IRootComponentProps } from '../../../src/lib';

const texts = {
    loading: 'Loading...',
    uploading: 'Uploading...',
    dragActiveAccept: 'Release the mouse button\nto drop your file(s)',
    dragActiveReject: 'Some files will be rejected',
    defaultText: 'Drag & drop your file(s) here',
    defaultTextDisabled: 'No files'.toUpperCase(),
};

export const SimpleRoot: FC<IRootComponentProps> = ({
    componentRef,
    getEventProps,
    fileItems,
    isLoading,
    isUploading,
    isDragActive,
    isDragReject,
    disabled,
    readOnly,
}) => {
    const enabled = !(disabled || readOnly);
    const loadingOrUploading = isLoading || isUploading;

    return (
        <div
            ref={componentRef}
            className={`drop-zone-custom${
                isDragActive
                    ? isDragReject
                        ? ' drop-zone-active-reject-custom'
                        : ' drop-zone-active-accept-custom'
                    : ''
            }`}
            {...getEventProps()}
        >
            <div className="drop-zone-custom-container">
                {loadingOrUploading && (
                    <div className="root-layer">
                        <div className="root-title">
                            <div>{isLoading ? texts.loading : texts.uploading}</div>
                            <CircularProgress />
                        </div>
                    </div>
                )}
                {!loadingOrUploading && isDragActive && (
                    <div className="root-layer">
                        <div className="root-title">
                            {isDragReject ? texts.dragActiveReject : texts.dragActiveAccept}
                        </div>
                    </div>
                )}
                {fileItems.length > 0 ? (
                    <>{fileItems}</>
                ) : (
                    !loadingOrUploading &&
                    !isDragActive && (
                        <div className="drop-zone-centered-child">
                            {enabled ? texts.defaultText : texts.defaultTextDisabled}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};
