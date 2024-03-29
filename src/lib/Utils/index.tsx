import React, { isValidElement } from 'react';
import { ExtractKeys, SameType } from './types';

export function formatSize(b: number) {
    const units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    let l = 0;
    let n = b;

    while (n >= 1024) {
        n /= 1024;
        l += 1;
    }

    return `${n.toFixed(n >= 10 || l < 1 ? 0 : 1)} ${units[l]}`;
}

export function formatDuration(seconds: number) {
    const date = new Date(0);
    if (!seconds) seconds = 0;
    seconds = Math.round(seconds);
    date.setSeconds(seconds);
    const dateString = date.toISOString().slice(11, 19);
    if (seconds < 3600) return dateString.slice(3);
    return dateString;
}

export function guid(): string {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

/* istanbul ignore next */
export function openBlob(blob: Blob, windowTitle: string) {
    const url = window.URL.createObjectURL(blob);
    const wnd = window.open(url, '_blank');
    wnd.focus();
    wnd.onload = () => {
        if (windowTitle) wnd.document.title = windowTitle;
        window.URL.revokeObjectURL(url);
    };
}

/* istanbul ignore next */
export function saveBlob(blob: Blob, fileName: string) {
    const a = document.createElement('a');
    a.target = '_blank';
    document.body.appendChild(a);
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(url), 0);
}

export function safePromise<T>(promise: Promise<T>) {
    return promise
        .then((result) => [result])
        .catch((error) => [null, error ? error : 'unknown error']);
}

/**
 * This function modifies a JS Promise by adding some status properties.
 */
export function makeQueryablePromise<T>(promise: Promise<T>) {
    type TQueryablePromise = Promise<T> &
        SameType<() => boolean, 'isPending' | 'isFulfilled' | 'isRejected'>;

    // Don't modify any promise that has been already modified.
    if ((promise as TQueryablePromise).isPending) return promise as TQueryablePromise;

    let isPending = true;
    let isRejected = false;
    let isFulfilled = false;

    const result = promise.then(
        (resolve) => {
            isPending = false;
            isFulfilled = true;
            return resolve;
        },
        (reject) => {
            isPending = false;
            isRejected = true;
            throw reject;
        }
    ) as TQueryablePromise;

    result.isFulfilled = () => isFulfilled;
    result.isPending = () => isPending;
    result.isRejected = () => isRejected;

    return result;
}

/**
 * Check if the provided file type should be accepted by the input with accept attribute.
 *
 * Inspired by https://github.com/okonet/attr-accept/blob/master/src/index.js
 *
 * @param file {File}
 * @param acceptedFiles {string}
 * @returns {boolean}
 */
export function accepts(file: File, accept: string) {
    // Firefox versions prior to 53 return a bogus MIME type for every file drag, so dragovers with
    // that MIME type will always be accepted
    if (!accept || accept === '*' || file.type === 'application/x-moz-file') return true;

    const mimeType = file.type || '';
    const baseMimeType = mimeType.replace(/\/.*$/, '');

    if (!mimeType) return true; // if the mime type is null, we treat file as a folder

    return accept
        .split(',')
        .map((t) => t.trim())
        .some((type) => {
            if (type.charAt(0) === '.') {
                return (
                    file.name === undefined || file.name.toLowerCase().endsWith(type.toLowerCase())
                );
            } else if (type.endsWith('/*')) {
                // this is something like an image/* mime type
                return baseMimeType === type.replace(/\/.*$/, '');
            }
            return mimeType === type;
        });
}

export function isEventWithFiles(event: React.DragEvent) {
    if (!event.dataTransfer) {
        return !!event.target && !!(event.target as HTMLInputElement).files;
    }

    return Array.prototype.some.call(
        event.dataTransfer.types,
        (type) => type === 'Files' || type === 'application/x-moz-file'
    );
}

export function isDragReject(event: React.DragEvent<HTMLElement>, accept: string) {
    if ('dataTransfer' in event) {
        const dt = event.dataTransfer;

        if (dt.items && dt.items.length) {
            const files = Array.from(dt.items);
            return files.some((file: any) => !accepts(file, accept));
        }
    }
    return false;
}

// React's synthetic events has event.isPropagationStopped,
// but to remain compatibility with other libs (Preact) fall back
// to check event.cancelBubble
function isPropagationStopped(event: React.SyntheticEvent | Event) {
    if (event && typeof (event as React.SyntheticEvent).isPropagationStopped === 'function') {
        return (event as React.SyntheticEvent).isPropagationStopped();
    } else if (event && typeof (event as Event).cancelBubble !== 'undefined') {
        return (event as Event).cancelBubble;
    }
    return false;
}

/**
 * This is intended to be used to compose event handlers
 * They are executed in order until one of them calls `event.isPropagationStopped()`.
 * Note that the check is done on the first invoke too,
 * meaning that if propagation was stopped before invoking the fns,
 * no handlers will be executed.
 *
 * @param {Function} fns the event hanlder functions
 * @return {Function} the event handler to add to an element
 */
export function composeEventHandlers<T extends (event: any, ...args: any[]) => void>(...fns: T[]) {
    return (event: any, ...args: any[]): void => {
        fns.some((fn) => {
            const result = isPropagationStopped(event);
            if (!result && fn) fn(event, ...args);
            return result;
        });
    };
}

/**
 * Performs a merge of objects and returns new object
 *
 * @param {...sources} sources - Objects to merge
 * @returns {object} New object with merged key/values
 */
export function mergeObjects<T extends Record<string, any>>(...sources: T[]) {
    // const {isValidElement} = require('React');
    let acc: any = {};
    for (const source of sources) {
        if (source instanceof Array) {
            // if (!(acc instanceof Array)) {
            //     acc = [];
            // }
            // acc = [...acc, ...source];
            throw `One of the elements is an array: ${source}`;
        } else if (source instanceof Object) {
            for (let [key, value] of Object.entries(source)) {
                const isValid = isValidElement(value);
                if (!isValid && value instanceof Object && key in acc) {
                    value = mergeObjects(acc[key], value);
                }
                acc = { ...acc, [key]: value };
            }
        }
    }
    return acc;
}

/**
 * Inserts the target object into the source object at the specified path and returns new object
 *
 * @param src - Source object
 * @param target - Target object that should be inserted
 * @param path - Specific path (key1.key2)
 * @param overrideExisting - if true, overrides existing keys in the source object
 * @returns {object} New object with the inserted target at the specific path
 */
export const insertIntoObject = (
    src: { [prop: string]: any },
    target: { [prop: string]: any },
    path?: string,
    overrideExisting?: boolean
) => {
    const clone = JSON.parse(JSON.stringify(src));
    const result = path
        ? path
              .split('.')
              .reduce((obj, field) => (obj[field] ? obj[field] : (obj[field] = {})), clone)
        : clone;

    if (overrideExisting) Object.assign(result, target);
    else {
        for (const [key, value] of Object.entries(target)) {
            if (!Object.keys(result).includes(key)) result[key] = value;
        }
    }
    return clone;
};

// ------------------------------------------------------------------
type Remap<T> = { [P in keyof T & string as `${P}Style`]: T[P] };
type TMergedResult = {
    className: string;
    style: React.CSSProperties;
};
type Change<T, R> = { [P in keyof T]: R };

export const mergeStyles = <T extends { [property: string]: string }>(
    defaultClassNames: T,
    classNames?: Partial<T>,
    styles?: Partial<SameType<React.CSSProperties, ExtractKeys<T>>>
): {
    classNames: T;
    styles: SameType<React.CSSProperties, ExtractKeys<T>>;
    mergedResult: Change<Remap<T>, TMergedResult>;
} => {
    const resolvedClassNames: { [property: string]: string } = { ...defaultClassNames };
    const resolvedStyles = { ...styles } as { [property: string]: React.CSSProperties };

    if (classNames) {
        for (const [key, value] of Object.entries(classNames)) {
            resolvedClassNames[key] = value;
        }
    }

    if (styles) {
        for (const [key, value] of Object.entries(styles)) {
            resolvedStyles[key] = value;
        }
    }

    // combine classNames & styles into one object

    const result: {
        [property: string]: TMergedResult;
    } = {};

    Object.keys(resolvedClassNames).forEach((key) => {
        result[key + 'Style'] = {
            className: resolvedClassNames[key],
            style: resolvedStyles[key],
        };
    });

    return { classNames: resolvedClassNames, styles: resolvedStyles, mergedResult: result } as any;
};
// ------------------------------------------------------------------

/* istanbul ignore next */
export function submitFormData(url: string, data: BodyInit, opts: any = {}) {
    const { method = 'POST', timeout = 0, headers, onProgress } = opts;
    let xhr: XMLHttpRequest = null;
    const promise = new Promise((resolve, reject) => {
        xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.responseType = 'json';
        xhr.timeout = timeout;
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        for (const h in headers || {}) xhr.setRequestHeader(h, headers[h]);
        if (xhr.upload && onProgress) {
            xhr.upload.onprogress = onProgress;
        }
        xhr.onload = () => {
            if (xhr.status == 200) resolve(xhr.response);
            else reject(xhr.response || { status: xhr.status, message: xhr.statusText });
        };
        xhr.onerror = (e) =>
            reject({
                status: 0,
                message: 'An error occurred during the transaction',
                type: e.type,
            });
        xhr.onabort = (e) =>
            reject({ status: 0, message: 'The file upload was aborted', type: e.type });
        xhr.ontimeout = (e) =>
            reject({ status: 0, message: 'XMLHttpRequest timed out', type: e.type });
        xhr.send(data as any);
    });

    return {
        xhr,
        promise,
    };
}
