// TODO: Sort by multiple fields using priority
import React, { ReactElement, useRef, useEffect, useState, useCallback, useMemo } from 'react';

import { TSortFunc, TOverrides } from './FileManager';
import { LoadingIcon } from './SvgIcons';
import { mergeStyles } from './Utils';
import { SameType, TComponent, ExtractKeys } from './Utils/types';

type TColumn = 'type' | 'name' | 'size';
type TOrder = 'asc' | 'desc';
type TSortFileMode = 'mix' | 'asc' | 'desc'; // Separates local & remote files or mixes them together
// type TPriority = 1 | 2 | 3;
type TSortColumnState = {
    name: TColumn;
    order: TOrder;
    active: boolean;
};

class SortColumn {
    name: TColumn;
    order: TOrder;
    // priority: TPriority;

    constructor(name: TColumn = 'name', order: TOrder = 'asc') {
        this.name = name;
        this.order = order;
    }

    static storageName = 'react-file-manager-sort-column-states';

    static setState(sortColumn: SortColumn) {
        const { name, order } = sortColumn;
        let item = null;
        const json = localStorage.getItem(SortColumn.storageName);

        const data: TSortColumnState[] = json ? JSON.parse(json) : [];

        // Deselect a column
        const selectedColumn = data.find((obj) => obj.active);
        if (selectedColumn) selectedColumn.active = false;

        item = data.find((obj) => obj.name === name);

        if (!item) {
            item = { name, order, active: true };
            data.push(item);
        } else {
            item.order = order;
            item.active = true;
        }

        localStorage.setItem(SortColumn.storageName, JSON.stringify(data));
    }

    static load(func: (obj: TSortColumnState) => boolean) {
        const json = localStorage.getItem(SortColumn.storageName);

        if (!json) return new SortColumn();
        else {
            const data: TSortColumnState[] = JSON.parse(json);
            const item = data.find(func);
            if (!item) return new SortColumn();
            else return new SortColumn(item.name, item.order);
        }
    }

    private static getState(name: TColumn) {
        return SortColumn.load((obj) => obj.name === name);
    }

    static get column() {
        return SortColumn.load((obj) => obj.active);
    }

    static getOrder(name: TColumn) {
        return SortColumn.getState(name).order;
    }

    static getSign(name: TColumn) {
        return (
            <span style={{ paddingRight: 3 }}>
                {SortColumn.column.name !== name ? (
                    <span style={{ paddingRight: 8 }}></span>
                ) : SortColumn.column.order === 'asc' ? (
                    <>&#8595;</>
                ) : (
                    <>&#8593;</>
                )}
            </span>
        );
    }
}

class SortFileMode {
    static storageName = 'react-file-manager-sort-file-mode';

    private static setState(state: TSortFileMode) {
        localStorage.setItem(SortFileMode.storageName, JSON.stringify(state));
    }

    static get state(): TSortFileMode {
        const json = localStorage.getItem(SortFileMode.storageName);
        return json ? JSON.parse(json) : 'desc';
    }

    static toggle() {
        switch (SortFileMode.state) {
            case 'mix':
                SortFileMode.setState('asc');
                break;
            case 'asc':
                SortFileMode.setState('desc');
                break;
            default:
                SortFileMode.setState('mix');
                break;
        }
    }

    static get sign() {
        const sortFileMode = SortFileMode.state;
        return sortFileMode !== 'mix' ? (
            sortFileMode === 'asc' ? (
                <>&#8771;</>
            ) : (
                <>&#8770;</>
            )
        ) : (
            <>&#8772;</>
        );
    }
}

export interface IOverriddenRoot {
    hideHeader?: boolean;
    hideFooter?: boolean;
    texts?: Partial<SameType<string, ExtractKeys<typeof defTexts>>>;
    classNames?: Partial<SameType<string, ExtractKeys<typeof defaultClassNames>>>;
    styles?: Partial<SameType<React.CSSProperties, ExtractKeys<typeof defaultClassNames>>>;
    component?: TComponent<IRootComponentProps>;
}

export interface IRootEventProps {
    onClick: (() => void) | null;
    onKeyDown: ((e: any) => void) | null;
    onDragEnter: (e: React.DragEvent) => void;
    onDragOver: ((e: React.DragEvent) => void) | null;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: ((e: React.DragEvent<HTMLInputElement>) => void) | null;
}

export interface IRootComponentProps {
    componentRef: React.RefObject<HTMLDivElement>;
    getEventProps: () => IRootEventProps;
    sortFiles: (f: TSortFunc) => void;
    update: () => void;
    fileItems: ReactElement[];
    isLoading: boolean;
    isUploading: boolean;
    isDragActive: boolean;
    isDragReject: boolean;
    disabled: boolean;
    readOnly: boolean;
    tabIndex: number;
}

interface IRFC<T> {
    (props: T & { overrides: Omit<IOverriddenRoot, 'component'> }): ReactElement;
}

type TTexts = TOverrides['Root']['texts'];
type TTextItem = keyof TTexts;

const defTexts = {
    headerFileType: 'Type',
    headerFileName: 'Name',
    headerFileSize: 'Size',
    footer: 'Click here to open file selector',
    loading: 'Fetching uploaded files...',
    dragActiveAccept: 'Release the mouse button\nto drop your file(s)',
    dragActiveReject: 'Some files will be rejected',
    defaultText: 'Drag & drop your file(s) here',
    defaultTextDisabled: 'No files'.toUpperCase(),
};

const defaultClassNames = {
    dropZone: 'drop-zone',
    activeAccept: 'drop-zone-active-accept',
    activeReject: 'drop-zone-active-reject',
    disabled: 'drop-zone-disabled',
    header: 'drop-zone-header',
    footer: 'drop-zone-footer',
    cover: 'drag-drop-layer',
    coverText: 'drag-drop-title',
    text: 'drag-drop-text',
    loadingIcon: 'loading-icon',
};

// ------------------------------------------------------

const handleSorting: TSortFunc = (a, b) => {
    // sort by file type (local or remote)
    const sortFileMode =
        SortFileMode.state !== 'mix'
            ? a.isLocalFile !== b.isLocalFile
                ? SortFileMode.state === 'asc'
                    ? -1
                    : 1
                : 0
            : 0; // do not sort

    const order = SortColumn.column.order === 'asc' ? 1 : -1;
    let result: number;
    switch (SortColumn.column.name) {
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
            result = type1 > type2 ? order : -order;
            break;
        case 'size': // sort by file size
            result = a.fileData.fileSize > b.fileData.fileSize ? order : -order;
            break;
        default:
            // sort by file description (filename)
            let descResult = 0;
            const desc1 = (a.fileData.description || a.fileData.fileName).toLowerCase();
            const desc2 = (b.fileData.description || b.fileData.fileName).toLowerCase();
            if (desc1 > desc2) descResult = order;
            if (desc1 < desc2) descResult = -order;
            result = descResult;
            break;
    }
    return sortFileMode || result;
};

// ------------------------------------------------------

export const RootComponent: IRFC<IRootComponentProps> = ({
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
    overrides,
}) => {
    const noClick = !!!getEventProps().onClick;

    const [showFooter, setShowFooter] = useState(false);
    const [updateHeader, setUpdateHeader] = useState(false);

    const hideHeader = overrides?.hideHeader ?? false;
    const hideFooter = overrides?.hideFooter ?? false;

    useEffect(() => {
        if (!hideHeader) sortFiles(handleSorting);
        else sortFiles(null);
    }, [sortFiles, hideHeader]);

    useEffect(() => {
        if (hideFooter) setShowFooter(false);
        else {
            setTimeout(() => {
                if (!!!componentRef.current) return;
                const { scrollHeight, clientHeight } = componentRef.current;
                setShowFooter(scrollHeight > clientHeight);
            });
        }
    }, [hideFooter, componentRef, fileItems]);

    const texts = useMemo(
        () =>
            Object.keys(defTexts).reduce<TTexts>((acc, name): any => {
                const ind = name as TTextItem;
                const text = overrides?.texts?.[ind];
                acc[ind] = text || (defTexts as TTexts)[ind];
                return acc;
            }, {}),
        [overrides?.texts]
    );

    const { classNames, styles, mergedResult } = useMemo(
        () => mergeStyles(defaultClassNames, overrides?.classNames, overrides?.styles),
        [overrides?.classNames, overrides?.styles]
    );

    // -------------- SORTING -----------------

    const toggleSortFileMode = useCallback(() => {
        if (disabled) return;
        SortFileMode.toggle();
        setUpdateHeader((value) => !value);
        update();
    }, [disabled, update, setUpdateHeader]);

    const handleColumnHeaderClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>, name: TColumn) => {
            if (disabled) return;
            const { dataset } = e.currentTarget;
            if (dataset.order === 'asc') dataset.order = 'desc';
            else dataset.order = 'asc';

            const column = new SortColumn(name, dataset.order as TOrder);
            SortColumn.setState(column);
            setUpdateHeader((value) => !value);
            update();
        },
        [disabled, update, setUpdateHeader]
    );

    // ----------------------------------------

    const header = useMemo(
        () =>
            !hideHeader && (
                <div
                    role="header"
                    {...mergedResult.headerStyle}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        data-testid="column-type"
                        data-order={SortColumn.getOrder('type')}
                        data-priority="2"
                        onClick={(e) => handleColumnHeaderClick(e, 'type')}
                    >
                        {SortColumn.getSign('type')}
                        {texts.headerFileType}
                    </div>
                    <div
                        data-testid="column-name"
                        data-order={SortColumn.getOrder('name')}
                        data-priority="1"
                        onClick={(e) => handleColumnHeaderClick(e, 'name')}
                    >
                        {SortColumn.getSign('name')}
                        {texts.headerFileName}
                    </div>
                    <div
                        data-testid="column-size"
                        data-order={SortColumn.getOrder('size')}
                        data-priority="3"
                        onClick={(e) => handleColumnHeaderClick(e, 'size')}
                    >
                        {SortColumn.getSign('size')}
                        {texts.headerFileSize}
                    </div>
                    <div data-testid="column-sort-file-mode" onClick={toggleSortFileMode}>
                        {SortFileMode.sign}
                    </div>
                </div>
            ),
        [handleColumnHeaderClick, toggleSortFileMode, updateHeader, hideHeader, texts]
    );

    // ----------------------------------------

    let className = classNames.dropZone;
    let style = styles.dropZone;

    if (disabled) {
        className = `${className} ${classNames.disabled}`;
        style = { ...(style || {}), ...(styles.disabled || {}) };
    } else if (isDragReject) {
        className = `${className} ${classNames.activeReject}`;
        style = { ...(style || {}), ...(styles.activeReject || {}) };
    } else if (isDragActive) {
        className = `${className} ${classNames.activeAccept}`;
        style = { ...(style || {}), ...(styles.activeAccept || {}) };
    }

    return (
        <div
            role="root"
            ref={componentRef}
            className={className}
            style={style}
            tabIndex={tabIndex}
            {...getEventProps()}
        >
            <div
                data-testid="drop-zone-container"
                className="drop-zone-container"
                style={isDragActive || isLoading ? { minHeight: '100%' } : null}
            >
                {header}
                {isLoading && (
                    <div data-testid="cover" {...mergedResult.coverStyle}>
                        <div data-testid="label" {...mergedResult.coverTextStyle}>
                            <div>{texts.loading}</div>
                            <LoadingIcon {...mergedResult.loadingIconStyle} viewBox="0 0 24 24" />
                        </div>
                    </div>
                )}
                {!isLoading && isDragActive && (
                    <div data-testid="cover" {...mergedResult.coverStyle}>
                        <div data-testid="label" {...mergedResult.coverTextStyle}>
                            {isDragReject ? texts.dragActiveReject : texts.dragActiveAccept}
                        </div>
                    </div>
                )}
                {fileItems.length > 0 ? (
                    <div data-testid="file-container">{fileItems}</div>
                ) : (
                    !isLoading &&
                    !isDragActive && (
                        <div data-testid="label" {...mergedResult.textStyle}>
                            {!(disabled || readOnly)
                                ? texts.defaultText
                                : texts.defaultTextDisabled}
                        </div>
                    )
                )}
            </div>
            {showFooter && !noClick && !readOnly && !disabled && !isDragActive && !isLoading && (
                <div role="footer" {...mergedResult.footerStyle}>
                    {texts.footer}
                </div>
            )}
        </div>
    );
};
