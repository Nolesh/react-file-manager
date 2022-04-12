class WebWorker {
    protected url: string;
    protected webWorker: Worker;

    /**
     * DO NOT USE URL TYPE DUE TO A BUG (PROBABLY IN WEBPACK)
     **/
    constructor(source: URL | Worker | string) {
        if (source instanceof URL) {
            this.webWorker = new Worker(source);
        } else if (source instanceof Worker) {
            this.webWorker = source;
        } else {
            const blob = new Blob([source], { type: 'text/javascript' });
            this.url = window.URL.createObjectURL(blob);
            this.webWorker = new Worker(this.url, { type: 'module' });
        }
    }

    static get isCompatible() {
        return !!window.Worker;
    }

    get instance() {
        return this.webWorker;
    }

    terminate() {
        this.webWorker.terminate();
        if (this.url) window.URL.revokeObjectURL(this.url);
    }
}

class ThumbnailWorker extends WebWorker {
    // private static readonly script = `
    // function arrayBufferToBase64(buffer) {
    //     let binary = '';
    //     const bytes = new Uint8Array(buffer);
    //     const len = bytes.byteLength;
    //     for (let i = 0; i < len; i++) {
    //         binary += String.fromCharCode(bytes[i]);
    //     }
    //     return btoa(binary);
    // }
    //
    // onmessage = function (event) {
    //     const data = event.data;
    //     const { file, maxImageSize, quality } = data;
    //
    //     createImageBitmap(file).then((bmp) => {
    //         const scale = maxImageSize / Math.max(bmp.width, bmp.height);
    //         const width = bmp.width * scale;
    //         const height = bmp.height * scale;
    //
    //         const canvas = new OffscreenCanvas(width, height);
    //         const ctx = canvas.getContext('2d');
    //         ctx.drawImage(bmp, 0, 0, width, height);
    //         return canvas.convertToBlob({ type: file.type, quality: quality }).then(async (blob) => {
    //             const prefix = \`data:\${file.type};base64,\`;
    //             const base64String = prefix + arrayBufferToBase64(await blob.arrayBuffer());
    //             postMessage(base64String);
    //         });
    //     })
    //     .catch(e => {
    //         // Bubbles the error to worker.onerror, but throw another uncatch error in log
    //         // setTimeout(() => {throw e});
    //         postMessage(e.message);
    //     })
    // };`;

    private static readonly script =
        'function arrayBufferToBase64(e){let t="";const a=new Uint8Array(e),n=a.byteLength;for(let e=0;e<n;e++)t+=String.fromCharCode(a[e]);return btoa(t)}onmessage=function(e){const t=e.data,{file:a,maxImageSize:n,quality:r}=t;createImageBitmap(a).then((e=>{const t=n/Math.max(e.width,e.height),s=e.width*t,o=e.height*t,i=new OffscreenCanvas(s,o);return i.getContext("2d").drawImage(e,0,0,s,o),i.convertToBlob({type:a.type,quality:r}).then((async e=>{const t="data:${file.type};base64,"+arrayBufferToBase64(await e.arrayBuffer());postMessage(t)}))})).catch((e=>{postMessage(e.message)}))};';

    constructor(useExternalScript = false) {
        if (useExternalScript) {
            // We are unable to pass the URL due to a bug (probably in webpack)
            // super(new URL('./thumbnail.worker', import.meta.url));
            // Instead, we have to pass a worker
            // super(new Worker(new URL('./thumbnail.worker', import.meta.url))); // TODO: JEST THROW AN ERROR!!!
        } else super(ThumbnailWorker.script);
    }

    static get isCompatible() {
        return WebWorker.isCompatible && typeof OffscreenCanvas !== 'undefined';
    }

    // https://stackoverflow.com/questions/69314193/cannot-create-bitmap-from-svg
    static supportsFileType(fileType: string) {
        return fileType !== 'image/svg+xml';
    }
}

export default WebWorker;
export { ThumbnailWorker };
