/****************************************************************************
 Copyright (c) 2019 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of cache-manager software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in cache-manager License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
const { getUserDataPath, readJsonSync, makeDir, writeFileSync, copyFile, downloadFile, writeFile, deleteFile, rmdir, unzip } = require('./fs-utils');

var checkNextPeriod = false;
var writeCacheFileList = null;
var startWrite = false;
var nextCallbacks = [];
var callbacks = [];
var cleaning = false;
var errTest = /the maximum size of the file storage/;
var suffix = 0;
const REGEX = /^https?:\/\/.*/;

var cacheManager = {

    cacheDir: 'gamecaches',

    cachedFileName: 'cacheList.json',

    // whether or not cache asset into user's storage space
    cacheEnabled: true,

    // whether or not auto clear cache when storage ran out
    autoClear: true,

    // cache one per cycle
    cacheInterval: 500,

    deleteInterval: 500,

    writeFileInterval: 2000,

    // whether or not storage space has run out
    outOfStorage: false,

    tempFiles: null,

    cachedFiles: null,

    cacheQueue: {},

    version: '1.0',

    getCache(url) {
        return this.cachedFiles.has(url) ? this.cachedFiles.get(url).url : '';
    },

    getTemp(url) {
        return this.tempFiles.has(url) ? this.tempFiles.get(url) : '';
    },

    init(callback) {
        this.cacheDir = getUserDataPath() + '/' + this.cacheDir;
        var cacheFilePath = this.cacheDir + '/' + this.cachedFileName;
        var result = readJsonSync(cacheFilePath);
        var self = this;
        if (result instanceof Error || !result.version) {
            if (!(result instanceof Error)) {
                rmdir(self.cacheDir, function () {
                    self.cachedFiles = new cc.AssetManager.Cache();
                    makeDir(this.cacheDir, function () {
                        writeFileSync(cacheFilePath, JSON.stringify({ files: self.cachedFiles._map, version: self.version }), 'utf8');
                        callback && callback();
                    });
                });
                return;
            }
            this.cachedFiles = new cc.AssetManager.Cache();
            makeDir(this.cacheDir, function () {
                writeFileSync(cacheFilePath, JSON.stringify({ files: self.cachedFiles._map, version: self.version }), 'utf8');
                callback && callback();
            });
        }
        else {
            this.cachedFiles = new cc.AssetManager.Cache(result.files);
            callback && callback();
        }
        this.tempFiles = new cc.AssetManager.Cache();
    },

    updateLastTime(url) {
        if (this.cachedFiles.has(url)) {
            var cache = this.cachedFiles.get(url);
            cache.lastTime = Date.now();
        }
    },

    _write() {
        writeCacheFileList = null;
        startWrite = true;
        writeFile(this.cacheDir + '/' + this.cachedFileName, JSON.stringify({ files: this.cachedFiles._map, version: this.version }), 'utf8', function () {
            startWrite = false;
            for (let i = 0, j = callbacks.length; i < j; i++) {
                callbacks[i]();
            }
            callbacks.length = 0;
            callbacks.push.apply(callbacks, nextCallbacks);
            nextCallbacks.length = 0;
        });
    },

    writeCacheFile(cb) {
        if (!writeCacheFileList) {
            writeCacheFileList = setTimeout(this._write.bind(this), this.writeFileInterval);
            if (startWrite === true) {
                cb && nextCallbacks.push(cb);
            }
            else {
                cb && callbacks.push(cb);
            }
        } else {
            cb && callbacks.push(cb);
        }
    },

    _cache() {
        var self = this;
        for (var id in this.cacheQueue) {
            var { srcUrl, isCopy, cacheBundleRoot } = this.cacheQueue[id];
            var time = Date.now().toString();

            var localPath = '';

            if (cacheBundleRoot) {
                localPath = `${this.cacheDir}/${cacheBundleRoot}/${time}${suffix++}${cc.path.extname(id)}`;
            }
            else {
                localPath = `${this.cacheDir}/${time}${suffix++}${cc.path.extname(id)}`;
            }

            function callback(err) {
                checkNextPeriod = false;
                if (err) {
                    if (errTest.test(err.message)) {
                        self.outOfStorage = true;
                        self.autoClear && self.clearLRU();
                        return;
                    }
                } else {
                    self.cachedFiles.add(id, { bundle: cacheBundleRoot, url: localPath, lastTime: time });
                    delete self.cacheQueue[id];
                    self.writeCacheFile();
                }
                if (!cc.js.isEmptyObject(self.cacheQueue)) {
                    checkNextPeriod = true;
                    setTimeout(self._cache.bind(self), self.cacheInterval);
                }
            }
            if (!isCopy) {
                downloadFile(srcUrl, localPath, null, callback);
            }
            else {
                copyFile(srcUrl, localPath, callback);
            }
            return;
        }
        checkNextPeriod = false;
    },

    cacheFile(id, srcUrl, cacheEnabled, cacheBundleRoot, isCopy) {
        cacheEnabled = cacheEnabled !== undefined ? cacheEnabled : this.cacheEnabled;
        if (!cacheEnabled || this.cacheQueue[id] || this.cachedFiles.has(id)) return;

        this.cacheQueue[id] = { srcUrl, cacheBundleRoot, isCopy };
        if (!checkNextPeriod) {
            checkNextPeriod = true;
            if (!this.outOfStorage) {
                setTimeout(this._cache.bind(this), this.cacheInterval);
            }
            else {
                checkNextPeriod = false;
            }
        }
    },

    clearCache() {
        var self = this;
        rmdir(this.cacheDir, function () {
            self.cachedFiles = new cc.AssetManager.Cache();
            makeDir(self.cacheDir, function () {
                var cacheFilePath = self.cacheDir + '/' + self.cachedFileName;
                self.outOfStorage = false;
                writeFileSync(cacheFilePath, JSON.stringify({ files: self.cachedFiles._map, version: self.version }), 'utf8');
                cc.assetManager.bundles.forEach(bundle => {
                    if (REGEX.test(bundle.base)) self.makeBundleFolder(bundle.name);
                });
            });
        });
    },

    clearLRU() {
        if (cleaning) return;
        cleaning = true;
        var caches = [];
        var self = this;
        this.cachedFiles.forEach(function (val, key) {
            if (val.bundle === 'internal') return;
            if (self._isZipFile(key) && cc.assetManager.bundles.has(val.bundle)) return;
            caches.push({ originUrl: key, url: val.url, lastTime: val.lastTime });
        });
        caches.sort(function (a, b) {
            return a.lastTime - b.lastTime;
        });
        caches.length = Math.floor(this.cachedFiles.count / 3);
        if (caches.length === 0) return;
        for (var i = 0, l = caches.length; i < l; i++) {
            this.cachedFiles.remove(caches[i].originUrl);
        }

        this.writeCacheFile(function () {
            function deferredDelete() {
                var item = caches.pop();
                if (self._isZipFile(item.originUrl)) {
                    rmdir(item.url, function () {
                        self._deleteFileCB();
                    });
                }
                else {
                    deleteFile(item.url, self._deleteFileCB.bind(self));
                }
                if (caches.length > 0) {
                    setTimeout(deferredDelete, self.deleteInterval);
                }
                else {
                    cleaning = false;
                }
            }
            setTimeout(deferredDelete, self.deleteInterval);
        });

    },

    removeCache(url) {
        if (this.cachedFiles.has(url)) {
            var self = this;
            var path = this.cachedFiles.remove(url).url;
            this.writeCacheFile(function () {
                if (self._isZipFile(url)) {
                    rmdir(path, function () {
                        self._deleteFileCB();
                    });
                }
                else {
                    deleteFile(path, self._deleteFileCB.bind(self));
                }
            });
        }
    },

    _deleteFileCB(err) {
        if (!err) this.outOfStorage = false;
    },

    makeBundleFolder(bundleName, callback) {
        makeDir(this.cacheDir + '/' + bundleName, function () {
            callback && callback();
        });
    },

    unzipAndCacheBundle(id, zipFilePath, cacheBundleRoot, onComplete) {
        let time = Date.now().toString();
        let targetPath = `${this.cacheDir}/${time}${suffix++}`;
        let self = this;
        makeDir(targetPath, function () {
            unzip(zipFilePath, targetPath, function (err) {
                if (err) {
                    rmdir(targetPath, function () {
                        onComplete && onComplete(err);
                    });
                    return;
                }
                self.cachedFiles.add(id, { bundle: cacheBundleRoot, url: targetPath, lastTime: time });
                self.writeCacheFile();
                onComplete && onComplete(null, targetPath);
            });
        });
    },

    _isZipFile(url) {
        return url.slice(-4) === '.zip';
    },

};

cc.assetManager.cacheManager = module.exports = cacheManager;