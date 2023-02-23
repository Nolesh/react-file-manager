const express = require('express');
const bodyParser = require('body-parser');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const mime = require('mime');
const utils = require('./utils.js');

const app = express();
const port = process.env.PORT || 5000;

const dir_files = './public/files';
const dir_temp = './public/temp';

// Initialization
(() => {
    if (!fs.existsSync(dir_temp)) {
        fs.mkdirSync(dir_temp, { recursive: true });
    }
})();

app.use(express.static('dist'));

/* ==========================================================
 bodyParser() required to allow Express to see the uploaded files
============================================================ */

app.use(bodyParser.json()); // Parses JSON-formatted text for bodies with a Content-Type of application/json.
app.use(bodyParser.raw({ limit: '1mb' })); // Parses HTTP body in to a Buffer for specified custom Content-Types, although the default accepted Content-Type is application/octet-stream.

// rename
app.patch('/api/file/:id', (req, res) => {
    // throwError('file not found', 404)
    const { description } = req.body;
    const newDescription = description;

    console.log(
        `Find the file by id (${req.params.id}) and change its description to a new one (${newDescription})`
    );

    // Send a new file description to the client
    res.send(newDescription);
});

// delete
app.delete('/api/file/:id', (req, res) => {
    console.log(`Find the file by id (${req.params.id}) and delete it`);
    // throwError('file not found', 404)
    res.json({ result: true });
    // Or in case of error
    // res.json({result: false, error: 'Something went wrong!'});
});

// view / download
app.get('/api/file/:filename', (req, res, next) => {
    const { filename } = req.params;
    const { view } = req.query;

    const path = `${dir_files}/${filename}`;
    if (fs.existsSync(path)) {
        console.log(`Find the file by name (${filename}) and return it as a blob`);
        const newFileName = `${new Date().toLocaleDateString().split('/').join('-')}_${filename}`;
        if (view === 'true') {
            // var mimetype = mime.lookup(filename);
            // const file = fs.readFileSync(path);
            // res
            //     .setHeader("content-disposition", `inline; filename="${newFileName}"`)
            //     .setHeader("content-type", mimetype)
            //     .end(file);

            // OR

            res
                // This header is optional, but if you want to set your own filename when "save as", you must use it.
                // Otherwise, the browser will use the name obtained from the URL
                .setHeader('content-disposition', `inline; filename="${newFileName}"`)
                .sendFile(`${filename}`, {
                    root: `${dir_files}`,
                });
        } else {
            // We can set the "filename" header just for a convenient way to get the filename on the client side.
            // Otherwise, we need to parse the "content-disposition" header.
            // res.setHeader('filename', newFileName)
            res.download(path, newFileName);

            // OR

            // var mimetype = mime.lookup(filename);
            // res.setHeader('content-disposition', 'attachment; filename=' + newFileName);
            // res.setHeader('content-type', mimetype);

            // const file = fs.readFileSync(path);
            // res.send(file);
        }
    } else {
        console.log(`file (${filename}) not found`);
        throwError(`file (${filename}) not found`, 404);
    }
});

app.get('/api/fetchFiles', (req, res) => {
    const files = [];

    fs.readdirSync(dir_files).forEach((filename) => {
        const path = `${dir_files}/${filename}`;

        let stats = fs.statSync(path);
        let fileSizeInBytes = stats.size;

        var mimetype = mime.lookup(path);

        // Our component can handle thumbnails provided as image url or base 64 string
        // For example, we pass a URL for a specific image and a base64 string for others
        const imgContent =
            filename.toLowerCase() === 'kitten.png' ? path : utils.getImageContent(path);

        const readOnly = mimetype === 'application/pdf';
        const disabled = filename.toLowerCase() === 'disabled image.png';
        const desc = filename.split('.')[0].toLowerCase();

        const result = utils.buildFileResponse(
            filename,
            fileSizeInBytes,
            mimetype,
            null,
            desc,
            imgContent,
            readOnly,
            disabled
        );

        files.push(result);
    });

    res.send(JSON.stringify(files));
});

app.post('/api/singleFileUpload', (req, res, next) => {
    const attachment = JSON.parse(
        req.headers['attachment'] || `{"fileId": "id-${new Date().getTime()}"}`
    );
    console.log('attachment', attachment);

    // const {fileId, description} = attachment;
    // throwError(`Cannot upload file ${description ? 'with description:'+description : 'with id:'+fileId}`);

    // throwError("Cannot upload single file!");

    const form = formidable({ multiples: false, uploadDir: dir_temp });

    form.parse(req, (err, fields, files) => {
        if (err) {
            next(err);
            return;
        }

        // We can also obtain any additional data through fields
        const { fileId = new Date().getTime(), description } = fields;
        // console.log('description', description);

        // We can use a specific field name like 'fileToUpload',
        // which can be specified in the 'uploadFileParams' parameter on the client side.
        // const file = files.fileToUpload;

        // But due to the different settings in the demo samples, we will use the generic method.
        const file = files[Object.keys(files)[0]];

        const processedFile = utils.processFile(file, fileId, description);
        // res.json(processedFile);
        res.json({ file: processedFile }); //Response is deliberately wrapped in an object to demonstrate the meaning of the 'processResult' function
        // res.json({result: true});
    });
});

app.put('/api/singleFileUpload', (req, res, next) => {
    const filename = req.headers['filename'] || `id-${new Date().getTime()}`;
    console.log('filename', filename);

    const result = utils.saveFile(filename, req.body);
    res.json({ result });
});

app.post('/api/multipleFileUpload', (req, res, next) => {
    // throw new Error("Cannot upload multiple files!");
    // throwError("Cannot upload multiple files!")

    let attachments = JSON.parse(req.headers['attachments']);

    // console.log('attachments', attachments);

    const form = formidable({ multiples: true, uploadDir: dir_temp });

    form.parse(req, (err, fields, files) => {
        if (err) {
            next(err);
            return;
        }

        const getData = (i) => attachments[i];

        // We can also obtain any additional data through fields
        // const getData = (i) => {
        //     const {fileIds, descriptions} = fields;
        //     return {
        //         fileId: fileIds[i],
        //         description: descriptions[i],
        //     }
        // }

        if (!Array.isArray(files.fileToUpload)) {
            // single file
            const { fileId, description } = getData(0);
            const file = utils.processFile(files.fileToUpload, fileId, description);
            // res.json(file);
            // res.json({file: file}); //Response is deliberately wrapped in an object to demonstrate the meaning of the 'processResult' function
            res.json({ result: true });
        } else {
            const result = [];
            files.fileToUpload.forEach((file, i) => {
                const { fileId, description } = getData(i);
                result.push(utils.processFile(file, fileId, description));
            });
            // res.json(result);
            // res.json({files: result}); //Response is deliberately wrapped in an object to demonstrate the meaning of the 'processResult' function
            res.json({ result: true });
        }
    });
});

app.put('/api/multipleFileUpload', (req, res, next) => {
    const fileNames = decodeURIComponent(req.headers['filenames']);
    const fileSizes = decodeURIComponent(req.headers['filesizes']);
    // console.log('filenames', req.headers, fileNames, fileSizes);

    const fileNameArray = fileNames.split('☆');
    const fileSizeArray = fileSizes.split('☆');
    console.log('fileNameArray', fileNameArray);

    let result = true;
    let offset = 0;
    fileNameArray.forEach((fileName, i) => {
        var buffer = Buffer.alloc(+fileSizeArray[i]);
        req.body.copy(buffer, 0, offset, offset + buffer.length);
        offset += buffer.length;

        const isSaved = utils.saveFile(fileName, buffer);
        if (!isSaved) result = false;
    });

    res.json({ result });
});

// ------------------------ ERROR HANDLING --------------------------------

// display error middleware
const errorLogger = (error, req, res, next) => {
    // for logging errors
    console.log('Path: ', req.path);
    console.error('Error: ', error);
    next(error); // forward to next middleware
};

// error handler middleware
const errorResponder = (error, req, res, next) => {
    const status = error.status || 500;
    const message = error.message || 'Internal Server Error';
    res.status(status).json({ status, message });
    // res.status(status).json(message);

    // there is no middleware below,
    // so no need to call 'next' function
};

const throwError = (message, status) => {
    // throw { message, status }

    // OR

    // const err = Error(message);
    // err.status = status;
    // throw err;

    // OR

    throw new MyErr(message, status);
};

class MyErr extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

app.use(errorLogger);
app.use(errorResponder);

// ------------------------------------------------------------------------

// ------------------------------------------------------------------------

app.listen(port, () => console.log(`Listening on port ${port}`));
