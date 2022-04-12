const fs = require('fs');
const mime = require('mime');

const getImageContent = (filePath, ignoreMimeType = false) => {
    let mimetype = mime.lookup(filePath);
    return mimetype.includes('image/') || ignoreMimeType
        ? 'data:image/*;base64,' + fs.readFileSync(filePath, { encoding: 'base64' })
        : null;
};

const buildFileResponse = (
    fileName,
    fileSizeInBytes,
    mimetype,
    id = null,
    description = null,
    imgContent = null,
    readOnly = false,
    disabled = false
) => {
    console.log('mime type:', mimetype);
    console.log('fileName:', fileName);

    const extension =
        fileName.split('.').length > 1 ? fileName.split('.').pop().toUpperCase() : '?';
    let type = mimetype.split('/').pop().toUpperCase();
    if (type === 'OCTET-STREAM') type = extension;

    return {
        file_id: id || Math.floor((1 + Math.random()) * 0x10000).toString(16),
        file_name: fileName,
        file_size: fileSizeInBytes,
        file_type: type,
        description: description || fileName,
        read_only: readOnly,
        disabled: disabled,
        ...(imgContent ? { thumbnail: imgContent } : {}),
    };
};

const processFile = (file, id, description) => {
    const ext = file.name.split('.').pop().toLowerCase();

    let mimetype = mime.lookup(file.path);
    const imgContent = getImageContent(file.path, ['png', 'jpg', 'webp'].includes(ext));
    const resp = buildFileResponse(
        file.name,
        file.size,
        mimetype,
        id,
        description && decodeURIComponent(description),
        imgContent
    );

    // Delete file
    fs.unlink(file.path, (err) => {
        if (err) console.error('error:', err);
    });

    return resp;
};

const saveFile = (fileName, content) => {
    try {
        fs.writeFileSync('public/temp/' + fileName, content);
        console.log(`File ${fileName} written successfully`);
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
};

module.exports = {
    getImageContent,
    buildFileResponse,
    processFile,
    saveFile,
};
