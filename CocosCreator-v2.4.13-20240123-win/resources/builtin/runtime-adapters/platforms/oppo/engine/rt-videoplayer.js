/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

(function () {

    if (typeof loadRuntime === "undefined") {
        return;
    }
    var rt = loadRuntime();

    if (!(cc && cc.VideoPlayer && cc.VideoPlayer.Impl)) {
        return;
    }

    const Mat4 = cc.Mat4;
    var _worldMat = new cc.Mat4();
    var _cameraMat = new cc.Mat4();

    var _impl = cc.VideoPlayer.Impl;
    var _p = cc.VideoPlayer.Impl.prototype;

    cc.VideoPlayer.prototype._updateVideoSource = function _updateVideoSource() {
        let clip = this._clip;
        if (this.resourceType === cc.VideoPlayer.ResourceType.REMOTE) {
            this._impl.setURL(this.remoteURL, this._mute || this._volume === 0);
        }
        else if (clip) {
            if (clip._nativeAsset) {
                this._impl.setURL(clip._nativeAsset, this._mute || this._volume === 0);
            }
            else {
                // deferred loading video clip
                cc.assetManager.postLoadNative(clip, (err) => {
                    if (err) {
                        console.error(err.message, err.stack);
                        return;
                    }
                    this._impl.setURL(clip._nativeAsset, this._mute || this._volume === 0);
                });
            }
        }
    };

    _p._bindEvent = function () {
        let video = this._video,
            self = this;

        if (!video) {
            return;
        }

        video.onPlay(function () {
            if (self._video !== video) return;
            self._playing = true;
            self._dispatchEvent(_impl.EventType.PLAYING);
        });
        video.onEnded(function () {
            if (self._video !== video) return;
            self._playing = false;
            self._currentTime = self._duration;  // ensure currentTime is at the end of duration
            self._dispatchEvent(_impl.EventType.COMPLETED);
        });
        video.onPause(function () {
            if (self._video !== video) return;
            self._playing = false;
            self._dispatchEvent(_impl.EventType.PAUSED);
        });
        video.onTimeUpdate(function (res) {
            var data = JSON.parse(res.position);
            if (typeof data === "object") {
                self._duration = data.duration;
                self._currentTime = data.position;
                return;
            }
            self._duration = res.duration;
            self._currentTime = res.position;
        });
        // onStop not supported
    };

    _p._unbindEvent = function () {
        let video = this._video;
        if (!video) {
            return;
        }

        // BUG: video.offPlay(cb) is invalid
        video.offPlay();
        video.offEnded();
        video.offPause();
        video.offTimeUpdate();
        // offStop not supported
    };

    _p.setVisible = function (value) {
        let video = this._video;
        if (!video) {
            return;
        }
        if (value) {
            video.width = this._actualWidth || 0;
        }
        else {
            video.width = 0;  // hide video
        }
        this._visible = value;
    };

    _p.createDomElementIfNeeded = function () {
        if (!rt.createVideo) {
            cc.warn('VideoPlayer not supported');
            return;
        }
    };

    _p.setURL = function (path, _mute) {
        let video = this._video;
        if (video && video.src === path) {
            return;
        }
        if (!this._tx) {
            return;
        }

        if (this._video) {
            this.destroy();
            this._video = null;
        }

        var videoUrl;

        if (typeof path !== 'string') {
            videoUrl = path._audio;
        } else {
            videoUrl = path;
        }
        this._duration = -1;
        this._currentTime = -1;
        this._video = rt.createVideo({
            x: this._tx, y: this._ty, width: this._width, height: this._height,
            src: videoUrl,
            objectFit: "contain",
            live: false,
        });
        video = this._video;
        video.src = videoUrl;
        video.muted = true;
        let self = this;
        this._loaded = false;

        var loadedCallback = function () {
            video.offPlay(loadedCallback);
            video.offTimeUpdate(timeCallBack);
            self.enable();
            self._bindEvent();
            video.stop();
            video.muted = false;
            self._loaded = true;
            self._playing = false;
            self._currentTime = 0;
            self._dispatchEvent(_impl.EventType.READY_TO_PLAY);
        }

        var timeCallBack = function (res) {
            var data = JSON.parse(res.position);
            if (typeof data === "object") {
                self._duration = data.duration;
                self._currentTime = data.position;
                return;
            }
            self._duration = res.duration;
            self._currentTime = res.position;
        }
        video.onPlay(loadedCallback);
        video.onTimeUpdate(timeCallBack);

        // HACK: keep playing till video loaded
        video.play();
    };

    _p.getURL = function () {
        let video = this._video;
        if (!video) {
            return '';
        }

        return video.src;
    };

    _p.play = function () {
        let video = this._video;
        if (!video || !this._visible || this._playing) return;

        video.play();
    };

    _p.setStayOnBottom = function (enabled) { };

    _p.pause = function () {
        let video = this._video;
        if (!this._playing || !video) return;

        video.pause();
    };

    _p.resume = function () {
        let video = this._video;
        if (this._playing || !video) return;

        video.play();
    };

    _p.stop = function () {
        let video = this._video;
        if (!video || !this._visible) return;

        video.stop();

        this._dispatchEvent(_impl.EventType.STOPPED);
        this._playing = false;
    };

    _p.setVolume = function (volume) {
        // wx not support setting video volume
    };


    _p.seekTo = function (time) {
        let video = this._video;
        if (!video || !this._loaded) return;

        video.seek(time);
    };

    _p.isPlaying = function () {
        return this._playing;
    };

    _p.duration = function () {
        return this._duration;
    };

    _p.currentTime = function () {
        if (!this._currentTime) {
            return -1;
        }
        return this._currentTime;
    };

    _p.setKeepAspectRatioEnabled = function (isEnabled) {
        cc.log('On wechat game is always keep the aspect ratio');
    };

    _p.isKeepAspectRatioEnabled = function () {
        return true;
    };

    _p.isFullScreenEnabled = function () {
        return this._fullScreenEnabled;
    };

    _p.setFullScreenEnabled = function (enable) {
        let video = this._video;
        if (video) {
            video.exitFullScreen();
            if (enable) {
                video.requestFullScreen();
            }
            this._fullScreenEnabled = enable;
        }
    };

    _p.enable = function () {
        this.setVisible(true);
    };

    _p.disable = function () {
        this.setVisible(false);
    };

    _p.destroy = function () {
        this.disable();
        this._unbindEvent();
        this.stop();
        if (this._video) {
            this._video.destroy();
            this._video = undefined;
        }
        rt.triggerGC();
    };

    _p.updateMatrix = function (node) {
        node.getWorldMatrix(_worldMat);

        if (this._m00 === _worldMat.m[0] && this._m01 === _worldMat.m[1] &&
            this._m04 === _worldMat.m[4] && this._m05 === _worldMat.m[5] &&
            this._m12 === _worldMat.m[12] && this._m13 === _worldMat.m[13] &&
            this._w === node._contentSize.width && this._h === node._contentSize.height) {
            return;
        }

        // update matrix cache
        this._m00 = _worldMat.m[0];
        this._m01 = _worldMat.m[1];
        this._m04 = _worldMat.m[4];
        this._m05 = _worldMat.m[5];
        this._m12 = _worldMat.m[12];
        this._m13 = _worldMat.m[13];
        this._w = node._contentSize.width;
        this._h = node._contentSize.height;

        let camera = cc.Camera.findCamera(node);
        camera.getWorldToScreenMatrix2D(_cameraMat);
        Mat4.multiply(_cameraMat, _cameraMat, _worldMat);


        let viewScaleX = cc.view._scaleX,
            viewScaleY = cc.view._scaleY;
        let dpr = cc.view._devicePixelRatio;
        viewScaleX /= dpr;
        viewScaleY /= dpr;

        let finalScaleX = _cameraMat.m[0] * viewScaleX,
            finalScaleY = _cameraMat.m[5] * viewScaleY;

        let finalWidth = this._w * finalScaleX,
            finalHeight = this._h * finalScaleY;

        let appx = finalWidth * node._anchorPoint.x;
        let appy = finalHeight * node._anchorPoint.y;

        let viewport = cc.view._viewportRect;
        let offsetX = viewport.x / dpr,
            offsetY = viewport.y / dpr;

        let tx = _cameraMat.m[12] * viewScaleX - appx + offsetX,
            ty = _cameraMat.m[13] * viewScaleY - appy + offsetY;

        var height = cc.view.getFrameSize().height;

        this._tx = tx;
        this._ty = ty;
        this._width = finalWidth; //w;
        this._height = finalHeight; //h;

        if (this._video) {
            this._video.x = tx;
            this._video.y = height - finalHeight - ty;
            this._video.width = finalWidth;
            this._video.height = finalHeight;
        }
        this._actualWidth = finalWidth;

    };
})();
