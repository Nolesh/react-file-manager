import { safePromise } from '.';
import { ILocalFileData } from '../FileItemComponent';
import { ThumbnailWorker } from './WebWorker';

/**
 * Function to generate the file preview.
 * @param file The file for which the preview is requested.
 * @returns @returns A promise that resolves to the file preview, which can be a string, an object with a `src` property and additional properties, or `null`.
 * Return `null` or `undefined` to use the default implementation for the rest of the file types.
 * Use `Promise.reject()` if you want to prevent the default implementation for all file types.
 */
export type TFilePreview = (
    file: File
) => Promise<string | { src: string; [x: string]: any } | null | void>;

/* istanbul ignore next */
export const generateImageThumbnail = (
    file: File,
    maxImageSize = 256,
    quality = 0.75,
    timeout = 0
): Promise<string> => {
    if (ThumbnailWorker.isCompatible && ThumbnailWorker.supportsFileType(file.type)) {
        return new Promise((resolve, reject) => {
            const webWorker = new ThumbnailWorker(false);
            let timerId = 0;

            function onMessage(event: MessageEvent<string>) {
                const { data } = event;
                clearTimeout(timerId);
                webWorker.terminate();
                if (data.startsWith('data:')) resolve(data);
                else reject({ message: data, data: event });
            }

            function onError(event: ErrorEvent | MessageEvent) {
                reject({ message: 'File read failed', data: event });
            }

            webWorker.instance.onmessage = onMessage;
            webWorker.instance.onerror = onError;
            webWorker.instance.onmessageerror = onError;

            webWorker.instance.postMessage({ file, maxImageSize, quality });

            if (timeout > 0) {
                timerId = window.setTimeout(() => {
                    webWorker.terminate();
                    reject({ message: 'File read was aborted due to a timeout expiration' });
                }, timeout);
            }
        });
    } else {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            let timerId = 0;

            reader.onload = function (event) {
                clearTimeout(timerId);
                const img = new Image();
                img.onload = function () {
                    const scale = maxImageSize / Math.max(img.width, img.height);
                    const width = img.width * scale;
                    const height = img.height * scale;

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL(file.type, quality));
                };
                img.src = event.target.result as string;
            };
            reader.onerror = (event) => reject({ message: 'File read failed', data: event });
            reader.onabort = (event) =>
                reject({
                    message: 'File read was aborted due to a timeout expiration',
                    data: event,
                });

            reader.readAsDataURL(file);

            if (timeout > 0) {
                timerId = window.setTimeout(() => reader.abort(), timeout);
            }
        });
    }
};

/* istanbul ignore next */
export const generateVideoThumbnail = (
    file: File,
    seekTo = 0.0
): Promise<{ image: string; duration: number }> => {
    return new Promise((resolve, reject) => {
        // load the file to a video player
        const videoPlayer = document.createElement('video');
        const url = URL.createObjectURL(file);
        videoPlayer.src = url;
        videoPlayer.load();
        videoPlayer.addEventListener('error', (e) => {
            reject({
                message: 'An error occured while loading video file',
                data: e,
            });
            URL.revokeObjectURL(url);
        });
        // load metadata of the video to get video duration and dimensions
        videoPlayer.addEventListener('loadedmetadata', () => {
            // seek to user defined timestamp (in seconds) if possible
            if (seekTo >= 0 && videoPlayer.duration < seekTo) {
                reject({
                    message:
                        'The duration of the video file is less than the value specified in the "seekTo" argument',
                    data: {
                        duration: videoPlayer.duration,
                        seekTo,
                    },
                });
                URL.revokeObjectURL(url);
                return;
            }

            if (seekTo === -1) seekTo = videoPlayer.duration / 2;
            // delay seeking or else 'seeked' event won't fire on Safari
            setTimeout(() => {
                videoPlayer.currentTime = seekTo;
            }, 10);
            // extract video thumbnail once seeking is complete
            videoPlayer.addEventListener('seeked', () => {
                // console.log('video is now paused at %ss.', seekTo);
                // define a canvas to have the same dimension as the video
                const canvas = document.createElement('canvas');
                canvas.width = videoPlayer.videoWidth;
                canvas.height = videoPlayer.videoHeight;
                // draw the video frame to canvas
                const ctx = canvas.getContext('2d');
                ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);
                // return the canvas image as a blob
                // ctx.canvas.toBlob(blob => resolve(blob), "image/jpeg", 0.75);
                const image = ctx.canvas.toDataURL('image/jpeg', 0.75);
                resolve({ image, duration: videoPlayer.duration });
                URL.revokeObjectURL(url);
            });
        });
    });
};

const defaultPreviewGenerator = (
    fileData: ILocalFileData,
    resolve: (fileData: ILocalFileData) => void
) => {
    const { file } = fileData;

    const isImage = file.type.startsWith('image/');
    let isVideo = file.type.startsWith('video/');
    let isAudio = file.type.startsWith('audio/');

    // Fixes bug in FF: https://bugzilla.mozilla.org/show_bug.cgi?id=1240259
    isVideo = isVideo && !file.type.includes('/ogg');
    isAudio = isAudio || file.type.includes('/ogg');

    if (isImage) {
        generateImageThumbnail(file)
            .then((src) => {
                fileData.previewData = { src };
                resolve(fileData);
            })
            .catch((err) => {
                if (err?.data?.type === 'abort') console.warn(err.message);
                else console.error(err.message, err.data);
                fileData.previewData = null;
                resolve(fileData);
            });
    } else if (isVideo) {
        generateVideoThumbnail(file, -1)
            .then(({ image, duration }) => {
                fileData.previewData = { src: image, duration };
                resolve(fileData);
            })
            .catch((err) => {
                console.error(err.message, err.data);
                fileData.previewData = null;
                resolve(fileData);
            });
    } else if (isAudio) {
        const src = URL.createObjectURL(file);
        const audio = new Audio();
        audio.onloadedmetadata = () => {
            fileData.previewData = { src, duration: audio.duration };
            resolve(fileData);
        };
        audio.onerror = (err) => {
            console.error('An error occured while loading audio file', err);
            fileData.previewData = null;
            resolve(fileData);
        };
        audio.src = src;
    } else {
        fileData.previewData = null;
        resolve(fileData);
    }
};

const generatePreview = async (
    fileData: ILocalFileData,
    filePreview: TFilePreview,
    resolve: (fileData: ILocalFileData) => void
) => {
    const [result, error] = await safePromise(filePreview(fileData.file));
    if (error) {
        fileData.previewData = null;
        return resolve(fileData);
    }

    if (result) {
        if (typeof result === 'string') {
            // standard base64 string or image url
            fileData.previewData = { src: result };
            resolve(fileData);
        } else {
            // user object
            fileData.previewData = result;
            resolve(fileData);
        }
    } else defaultPreviewGenerator(fileData, resolve);
};

export default generatePreview;
