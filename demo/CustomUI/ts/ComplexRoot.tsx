import React, { FC, useState, useCallback } from 'react';

import { CircularProgress, Grid } from '@material-ui/core';
import { IRootComponentProps, TSortFunc } from '../../../src/lib';

type TColumn = 'type' | 'name' | 'size';
type TOrder = 'asc' | 'desc';

class SortColumn {
    column: TColumn;
    order: TOrder;
    active: boolean;

    constructor(column: TColumn = 'name', order: TOrder = 'asc') {
        this.column = column;
        this.order = order;
    }

    static storageName = 'react-file-manager-sort-column-states';

    static setState(sortColumn: SortColumn) {
        const { column, order } = sortColumn;
        let item = null;
        const json = localStorage.getItem(SortColumn.storageName);

        const data = (json ? JSON.parse(json) : []) as SortColumn[];

        // Deselect a column
        const selectedColumn = data.find((obj) => obj.active);
        if (selectedColumn) selectedColumn.active = false;

        item = data.find((obj) => obj.column === column);

        if (!item) {
            item = { column, order, active: true };
            data.push(item);
        } else {
            item.order = order;
            item.active = true;
        }

        localStorage.setItem(SortColumn.storageName, JSON.stringify(data));
    }

    static load(func: (data: SortColumn) => boolean) {
        const json = localStorage.getItem(SortColumn.storageName);

        if (!json) return new SortColumn();
        else {
            const data = JSON.parse(json) as SortColumn[];
            const item = data.find(func);
            if (!item) return new SortColumn();
            else return new SortColumn(item.column, item.order);
        }
    }

    static getState(column: TColumn) {
        return SortColumn.load((obj) => obj.column === column);
    }

    static get data() {
        return SortColumn.load((obj) => obj.active);
    }

    static getOrder(column: TColumn) {
        return SortColumn.getState(column).order;
    }

    static getSign(column: TColumn) {
        return SortColumn.data.column !== column ? (
            <>&#8661;</>
        ) : SortColumn.data.order === 'asc' ? (
            <>&#8659;</>
        ) : (
            <>&#8657;</>
        );
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

export const ComplexRoot: FC<IRootComponentProps> = ({
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
    // isUploading = true;
    const enabled = !(disabled || readOnly);
    const loadingOrUploading = isLoading || isUploading;

    const [showFooter, setShowFooter] = useState(false);

    if (componentRef.current) {
        setTimeout(() => {
            const { clientHeight, scrollHeight } = componentRef.current;
            setShowFooter(scrollHeight > clientHeight);
        });
    }

    const handleColumnHeaderClick = useCallback(
        (e, name) => {
            const { dataset } = e.currentTarget;
            if (dataset.order === 'asc') dataset.order = 'desc';
            else dataset.order = 'asc';

            const column = new SortColumn(name, dataset.order);
            SortColumn.setState(column);

            update();
        },
        [update]
    );

    const handleSorting: TSortFunc = useCallback((a, b) => {
        const order = SortColumn.data.order === 'asc' ? 1 : -1;
        switch (SortColumn.data.column) {
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
    }, []);

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
            <div
                className="drop-zone-custom-container"
                style={isDragActive ? { minHeight: '100%' } : null}
            >
                {
                    // HEADER
                }

                <Grid
                    container
                    justifyContent="center"
                    // spacing={3}
                    onClick={(e) => e.stopPropagation()}
                    className="drop-zone-header-custom"
                >
                    <Grid
                        container
                        item
                        direction="column"
                        alignItems="center"
                        justifyContent="center"
                        xs={2}
                        style={{ borderRight: '1px solid white' }}
                        data-order={SortColumn.getOrder('type')}
                        onClick={(e) => handleColumnHeaderClick(e, 'type')}
                    >
                        {SortColumn.getSign('type')}&nbsp;Type
                    </Grid>
                    <Grid
                        container
                        item
                        direction="column"
                        alignItems="flex-start"
                        justifyContent="center"
                        xs={6}
                        style={{ borderRight: '1px solid white' }}
                        data-order={SortColumn.getOrder('name')}
                        onClick={(e) => handleColumnHeaderClick(e, 'name')}
                    >
                        <div style={{ marginLeft: 10 }}>{SortColumn.getSign('name')}&nbsp;Name</div>
                    </Grid>
                    <Grid
                        container
                        item
                        direction="column"
                        alignItems="center"
                        justifyContent="center"
                        xs={2}
                        style={{ borderRight: '1px solid white' }}
                        data-order={SortColumn.getOrder('size')}
                        onClick={(e) => handleColumnHeaderClick(e, 'size')}
                    >
                        {SortColumn.getSign('size')}&nbsp;Size
                    </Grid>
                    <Grid
                        container
                        item
                        direction="column"
                        alignItems="center"
                        justifyContent="center"
                        xs={2}
                        style={{ padding: 5 }}
                    >
                        Control
                    </Grid>
                </Grid>

                {
                    // BODY
                }

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
