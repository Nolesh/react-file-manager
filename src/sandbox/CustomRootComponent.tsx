import React, { ReactElement, FC, useState } from 'react';

import { CircularProgress } from '@material-ui/core';

import { IRootComponentProps, TSortFunc } from '../lib';

type TColumn = 'type' | 'name' | 'size';
type TOrder = 'asc' | 'desc';

class SortColumn {
    column: TColumn;
    order: TOrder;

    constructor(column: TColumn = 'name', order: TOrder = 'asc') {
        this.column = column;
        this.order = order;
    }
}

const texts = {
    loading: 'Loading...',
    uploading: 'Uploading...',
    dragActiveAccept: 'Release the mouse button\nto drop your file(s)',
    dragActiveReject: 'Some files will be rejected',
    defaultText: 'Drag & drop your file(s) here',
    defaultTextDisabled: 'No files'.toUpperCase(),
    footer: 'Click here to open file selector',
};

export const CustomRootComponent: FC<IRootComponentProps> = ({
    componentRef,
    getEventProps,
    sortFiles,
    update,
    fileItems,
    isLoading,
    isUploading,
    isDragActive,
    isDragReject,
    disabled,
    readOnly,
    tabIndex,
    // ...rest
}) => {
    const enabled = !(disabled || readOnly);
    const loadingOrUploading = isLoading || isUploading;

    const [showFooter, setShowFooter] = useState(false);

    const [sortColumn, setSortColumn] = useState<SortColumn>(new SortColumn());

    if (componentRef.current) {
        setTimeout(() => {
            const { clientHeight, scrollHeight } = componentRef.current;
            setShowFooter(scrollHeight > clientHeight);
        });
    }

    const getSortSign = (column: TColumn): ReactElement =>
        sortColumn.column !== column ? (
            <>&#8661;</>
        ) : sortColumn.order === 'asc' ? (
            <>&#8659;</>
        ) : (
            <>&#8657;</>
        );

    const getSortOrder = (column: TColumn) =>
        column === sortColumn.column ? sortColumn.order : 'asc';

    const handleClick = (e: React.MouseEvent<HTMLDivElement>, name: TColumn) => {
        const dataset = e.currentTarget.dataset;
        if (dataset.order === 'asc') dataset.order = 'desc';
        else dataset.order = 'asc';

        const column = new SortColumn(name, dataset.order as TOrder);

        setSortColumn(column);
        setTimeout(update);
    };

    const handleSorting: TSortFunc = (a, b) => {
        const order = sortColumn.order === 'asc' ? 1 : -1;
        switch (sortColumn.column) {
            case 'type': // sort by file type
                const type1 =
                    a.fileData.fileType ||
                    (a.fileData.fileName.split('.').length > 1
                        ? a.fileData.fileName.split('.').pop().toUpperCase()
                        : '');
                const type2 =
                    b.fileData.fileType ||
                    (b.fileData.fileName.split('.').length > 1
                        ? b.fileData.fileName.split('.').pop().toUpperCase()
                        : '');
                return type1 > type2 ? order : -order;
            case 'size': // sort by file size
                return a.fileData.fileSize > b.fileData.fileSize ? order : -order;
            default:
                // sort by file description (filename)
                let descResult = 0;
                const desc1 = (a.fileData.description || a.fileData.fileName).toLowerCase();
                const desc2 = (b.fileData.description || b.fileData.fileName).toLowerCase();
                if (desc1 > desc2) descResult = order;
                if (desc1 < desc2) descResult = -order;
                return descResult;
        }
    };

    sortFiles(handleSorting);

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
            tabIndex={tabIndex}
            {...getEventProps()}
        >
            <div className="drop-zone-custom-container">
                <div className="drop-zone-header-custom" onClick={(e) => e.stopPropagation()}>
                    <div data-order={getSortOrder('type')} onClick={(e) => handleClick(e, 'type')}>
                        {getSortSign('type')}&nbsp;Type
                    </div>
                    <div data-order={getSortOrder('name')} onClick={(e) => handleClick(e, 'name')}>
                        {getSortSign('name')}&nbsp;Name
                    </div>
                    <div data-order={getSortOrder('size')} onClick={(e) => handleClick(e, 'size')}>
                        {getSortSign('size')}&nbsp;Size
                    </div>
                    <div>Ctrl</div>
                </div>
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
                    <div>{fileItems}</div>
                ) : (
                    !loadingOrUploading &&
                    !isDragActive && (
                        <div className="drop-zone-centered-child">
                            {enabled ? texts.defaultText : texts.defaultTextDisabled}
                        </div>
                    )
                )}
            </div>
            {showFooter && !isDragActive && (
                <div className="drop-zone-footer-custom">{texts.footer}</div>
            )}
        </div>
    );
};
