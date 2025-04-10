const cacheManager = require('./cache-manager');
const { downloadFile, readText, readArrayBuffer, readJson, loadSubpackage, getUserDataPath, _subpackagesPath } = window.fsUtils;

const REGEX = /^https?:\/\/.*/;

const downloader = cc.assetManager.downloader;
const parser = cc.assetManager.parser;
const presets = cc.assetManager.presets;
downloader.maxConcurrency = 8;
downloader.maxRequestsPerFrame = 64;
presets['scene'].maxConcurrency = 10;
presets['scene'].maxRequestsPerFrame = 64;

let REMOTE_SERVER_ROOT;
let subpackages = {}, remoteBundles = {};
const loadedScripts = {};

function downloadScript(url, options, onComplete) {
    if (typeof options === 'function') {
        onComplete = options;
        options = null;
    }
    if (REGEX.test(url)) {
        onComplete && onComplete(new Error('Can not load remote scripts'));
        return;
    }

    if (loadedScripts[url]) return onComplete && onComplete();

    require(url);
    loadedScripts[url] = true;
    onComplete && onComplete(null);
}

function handleZip(url, options, onComplete) {
    let cachedUnzip = cacheManager.cachedFiles.get(url);
    if (cachedUnzip) {
        cacheManager.updateLastTime(url);
        onComplete && onComplete(null, cachedUnzip.url);
    }
    else if (REGEX.test(url)) {
        downloadFile(url, null, options.header, options.onFileProgress, function (err, downloadedZipPath) {
            if (err) {
                onComplete && onComplete(err);
                return;
            }
            cacheManager.unzipAndCacheBundle(url, downloadedZipPath, options.__cacheBundleRoot__, onComplete);
        });
    }
    else {
        cacheManager.unzipAndCacheBundle(url, url, options.__cacheBundleRoot__, onComplete);
    }
}

function downloadDomAudio(url, options, onComplete) {
    if (typeof options === 'function') {
        onComplete = options;
        options = null;
    }
    var dom = document.createElement('audio');
    dom.src = url;

    onComplete && onComplete(null, dom);
    // onComplete && onComplete(null);
}

function download(url, func, options, onFileProgress, onComplete) {
    var result = transformUrl(url, options);
    if (result.inLocal) {
        func(result.url, options, onComplete);
    }
    else if (result.inCache) {
        cacheManager.updateLastTime(url);
        func(result.url, options, function (err, data) {
            if (err) {
                cacheManager.removeCache(url);
            }
            onComplete(err, data);
        });
    }
    else {
        downloadFile(url, null, options.header, onFileProgress, function (err, path) {
            if (err) {
                onComplete(err, null);
                return;
            }
            func(path, options, function (err, data) {
                if (!err) {
                    cacheManager.tempFiles.add(url, path);
                    cacheManager.cacheFile(url, path, options.cacheEnabled, options.__cacheBundleRoot__, true);
                }
                onComplete(err, data);
            });
        });
    }
}

function parseArrayBuffer(url, options, onComplete) {
    readArrayBuffer(url, onComplete);
}

function parseText(url, options, onComplete) {
    readText(url, onComplete);
}

function parseJson(url, options, onComplete) {
    readJson(url, onComplete);
}

function downloadText(url, options, onComplete) {
    download(url, parseText, options, options.onFileProgress, onComplete);
}

var downloadJson = function (url, options, onComplete) {
    download(url, parseJson, options, options.onFileProgress, onComplete);
}

var loadFont = function (url, options, onComplete) {
    /**
     * [2021.12.30]
     * 1.依据 vivo API文档，loadFont 函数需要以如下格式输入两个参数
     * [api文档] https://minigame.vivo.com.cn/documents/#/api/render/font?id=%e5%ad%97%e4%bd%93
     * 2.与 vivo 小游戏开发人员确认，vivo平台的 loadFont API 返回值不是通过解析字体获得，
     * 而是与输入参数fontFamily保持一致。这里以文件名来作为 fontFamily 的输入
    */
    var fontFamily = _getfontFamily(url);
    fontFamily = qg.loadFont(fontFamily, "url('" + url + "')");
    onComplete(null, fontFamily || 'Arial');
}

function _getfontFamily(path) {
    // 该函数旨在获取到除去扩展名的文件名。由于loadFont函数的使用方式，参数 path 必然以指定的后缀名如".ttf"结尾
    // 以字体文件名(不带扩展名)为字体的 FontFamily
    var fontFamily;
    var fileNameIndex = path.lastIndexOf("/");
    var fileExtensionIndex = path.lastIndexOf(".");

    if (fileNameIndex === -1) {
        fontFamily = path.substring(0, fileExtensionIndex);
    } else {
        fontFamily = path.substring(fileNameIndex + 1, fileExtensionIndex);
    }
    return fontFamily;
}

function doNothing(content, options, onComplete) { onComplete(null, content); }

function downloadAsset(url, options, onComplete) {
    download(url, doNothing, options, options.onFileProgress, onComplete);
}

function subdomainTransformUrl(url, options, onComplete) {
    var { url } = transformUrl(url, options);
    onComplete(null, url);
}

const cachedSubpackageList = {};
function downloadBundle(nameOrUrl, options, onComplete) {
    let bundleName = cc.path.basename(nameOrUrl);
    var version = options.version || cc.assetManager.downloader.bundleVers[bundleName];

    if (subpackages[bundleName]) {
        var config = `${_subpackagesPath}${bundleName}/config.${version ? version + '.' : ''}json`;
        let loadedCb = function () {
            downloadJson(config, options, function (err, data) {
                data && (data.base = `${_subpackagesPath}${bundleName}/`);
                onComplete(err, data);
            });
        };
        if (cachedSubpackageList[bundleName]) {
            return loadedCb();
        }
        loadSubpackage(bundleName, options.onFileProgress, function (err) {
            if (err) {
                onComplete(err, null);
                return;
            }
            cachedSubpackageList[bundleName] = true;
            loadedCb();
        });
    }
    else {
        options.cacheEnabled = true;
        options.__cacheBundleRoot__ = bundleName;
        let js, url;
        if (!REGEX.test(nameOrUrl) && remoteBundles[bundleName] === undefined) {
            url = `assets/${bundleName}`;
            js = `assets/${bundleName}/index.js`;
            if (!loadedScripts[js]) {
                require(js);
                loadedScripts[js] = true;
            }
            var config = `${url}/config.${version ? version + '.' : ''}json`;
            downloadJson(config, options, function (err, data) {
                if (err) {
                    onComplete && onComplete(err);
                    return;
                }
                if (data.isZip) {
                    let zipVersion = data.zipVersion;
                    let zipUrl = zipVersion ? `${url}/res.${zipVersion}.zip` : `${url}/res.zip`;
                    handleZip(zipUrl, options, function (err, unzipPath) {
                        if (err) {
                            onComplete && onComplete(err);
                            return;
                        }
                        data.base = unzipPath + '/res/';
                        onComplete && onComplete(null, data);
                    });
                }
                else {
                    data.base = url + '/';
                    onComplete && onComplete(null, data);
                }
            });
            return;
        }
        if (REGEX.test(nameOrUrl)) {
            url = nameOrUrl;
        } else {
            url = `${REMOTE_SERVER_ROOT}remote/${bundleName}`;
        }
        js = `src/scripts/${bundleName}/index.js`;
        cacheManager.makeBundleFolder(bundleName, function () {
            if (!loadedScripts[js]) {
                require(js);
                loadedScripts[js] = true;
            }
            var config = `${url}/config.${version ? version + '.' : ''}json`;
            downloadJson(config, options, function (err, data) {
                if (err) {
                    onComplete && onComplete(err);
                    return;
                }
                if (data.isZip) {
                    let zipVersion = data.zipVersion;
                    let zipUrl = `${url}/res.${zipVersion ? zipVersion + '.' : ''}zip`;
                    handleZip(zipUrl, options, function (err, unzipPath) {
                        if (err) {
                            onComplete && onComplete(err);
                            return;
                        }
                        data.base = unzipPath + '/res/';
                        onComplete && onComplete(null, data);
                    });
                }
                else {
                    data.base = url + '/';
                    onComplete && onComplete(null, data);
                }
            });
        });
    }
};

const originParsePVRTex = parser.parsePVRTex;
let parsePVRTex = function (file, options, onComplete) {
    readArrayBuffer(file, function (err, data) {
        if (err) return onComplete(err);
        originParsePVRTex(data, options, onComplete);
    });
};

const originParsePKMTex = parser.parsePKMTex;
let parsePKMTex = function (file, options, onComplete) {
    readArrayBuffer(file, function (err, data) {
        if (err) return onComplete(err);
        originParsePKMTex(data, options, onComplete);
    });
};

function parsePlist(url, options, onComplete) {
    readText(url, function (err, file) {
        var result = null;
        if (!err) {
            result = cc.plistParser.parse(file);
            if (!result) err = new Error('parse failed');
        }
        onComplete && onComplete(err, result);
    });
}

let downloadImage = downloadAsset;
downloader.downloadDomAudio = downloadDomAudio;
downloader.downloadScript = downloadScript;
parser.parsePVRTex = parsePVRTex;
parser.parsePKMTex = parsePKMTex;

downloader.register({
    '.js': downloadScript,

    // Audio
    '.mp3': downloadAsset,
    '.ogg': downloadAsset,
    '.wav': downloadAsset,
    '.m4a': downloadAsset,

    // Image
    '.png': downloadImage,
    '.jpg': downloadImage,
    '.bmp': downloadImage,
    '.jpeg': downloadImage,
    '.gif': downloadImage,
    '.ico': downloadImage,
    '.tiff': downloadImage,
    '.image': downloadImage,
    '.webp': downloadImage,
    '.pvr': downloadAsset,
    '.pkm': downloadAsset,

    '.font': downloadAsset,
    '.eot': downloadAsset,
    '.ttf': downloadAsset,
    '.woff': downloadAsset,
    '.svg': downloadAsset,
    '.ttc': downloadAsset,

    // Txt
    '.txt': downloadAsset,
    '.xml': downloadAsset,
    '.vsh': downloadAsset,
    '.fsh': downloadAsset,
    '.atlas': downloadAsset,

    '.tmx': downloadAsset,
    '.tsx': downloadAsset,
    '.plist': downloadAsset,
    '.fnt': downloadAsset,

    '.json': downloadJson,
    '.ExportJson': downloadAsset,

    '.binary': downloadAsset,
    '.bin': downloadAsset,
    '.dbbin': downloadAsset,
    '.skel': downloadAsset,

    '.mp4': downloadAsset,
    '.avi': downloadAsset,
    '.mov': downloadAsset,
    '.mpg': downloadAsset,
    '.mpeg': downloadAsset,
    '.rm': downloadAsset,
    '.rmvb': downloadAsset,

    'bundle': downloadBundle,

    'default': downloadText,
});

parser.register({
    '.png': downloader.downloadDomImage,
    '.jpg': downloader.downloadDomImage,
    '.bmp': downloader.downloadDomImage,
    '.jpeg': downloader.downloadDomImage,
    '.gif': downloader.downloadDomImage,
    '.ico': downloader.downloadDomImage,
    '.tiff': downloader.downloadDomImage,
    '.image': downloader.downloadDomImage,
    '.webp': downloader.downloadDomImage,
    '.pvr': parsePVRTex,
    '.pkm': parsePKMTex,

    '.font': loadFont,
    '.eot': loadFont,
    '.ttf': loadFont,
    '.woff': loadFont,
    '.svg': loadFont,
    '.ttc': loadFont,

    // Audio
    '.mp3': downloadDomAudio,
    '.ogg': downloadDomAudio,
    '.wav': downloadDomAudio,
    '.m4a': downloadDomAudio,

    // Txt
    '.txt': parseText,
    '.xml': parseText,
    '.vsh': parseText,
    '.fsh': parseText,
    '.atlas': parseText,

    '.tmx': parseText,
    '.tsx': parseText,
    '.fnt': parseText,
    '.plist': parsePlist,

    '.binary': parseArrayBuffer,
    '.bin': parseArrayBuffer,
    '.dbbin': parseArrayBuffer,
    '.skel': parseArrayBuffer,

    '.ExportJson': parseJson,
});

var transformUrl = function (url, options) {
    var inLocal = false;
    var inCache = false;
    var isInUserDataPath = url.startsWith(getUserDataPath());
    if (isInUserDataPath) {
        inLocal = true;
    }
    else if (REGEX.test(url)) {
        if (!options.reload) {
            var cache = cacheManager.cachedFiles.get(url);
            if (cache) {
                inCache = true;
                url = cache.url;
            }
            else {
                var tempUrl = cacheManager.tempFiles.get(url);
                if (tempUrl) {
                    inLocal = true;
                    url = tempUrl;
                }
            }
        }
    }
    else {
        inLocal = true;
    }
    return { url, inLocal, inCache };
}

cc.assetManager.transformPipeline.append(function (task) {
    var input = task.output = task.input;
    for (var i = 0, l = input.length; i < l; i++) {
        var item = input[i];
        var options = item.options;
        if (!item.config) {
            options.cacheEnabled = options.cacheEnabled !== undefined ? options.cacheEnabled : false;
        }
        else {
            options.__cacheBundleRoot__ = item.config.name;
        }
    }
});

var originInit = cc.assetManager.init;
cc.assetManager.init = function (options, callback) {
    originInit.call(cc.assetManager, options);
    options.subpackages && options.subpackages.forEach(x => subpackages[x] = x);
    options.remoteBundles && options.remoteBundles.forEach(x => remoteBundles[x] = true);
    REMOTE_SERVER_ROOT = options.server || '';
    if (REMOTE_SERVER_ROOT && !REMOTE_SERVER_ROOT.endsWith('/')) REMOTE_SERVER_ROOT += '/';
    cacheManager.init(callback);
};
