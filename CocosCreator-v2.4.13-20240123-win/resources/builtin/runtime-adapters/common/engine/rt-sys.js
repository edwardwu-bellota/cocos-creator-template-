/****************************************************************************
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and  non-exclusive license
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
'use strict';

const sys = cc.sys;

if (typeof __globalAdapter.getNetworkType === 'function') {
    sys.getNetworkType = __globalAdapter.getNetworkType;
} else {
    sys.getNetworkType = function () {
        console.error("The sys.getNetworkType is not define!");
    }
}

if (typeof __globalAdapter.getBatteryLevel === 'function') {
    sys.getBatteryLevel = __globalAdapter.getBatteryLevel;
} else {
    sys.getBatteryLevel = function () {
        console.error("The sys.getBatteryLevel is not define!");
    }
}

if (typeof __globalAdapter.triggerGC === 'function') {
    sys.garbageCollect = __globalAdapter.triggerGC;
} else {
    sys.garbageCollect = function () {
        console.error("The sys.garbageCollect is not define!");
    }
}

sys.restartVM = function () {
    console.error("The restartVM is not define!");
}
sys.isObjectValid = function () {
    console.error("The sys.isObjectValid is not define!");
}

sys.isBrowser = false;
sys.isMobile = true;

if (typeof __globalAdapter.getSystemInfoSync === 'function') {
    let env = __globalAdapter.getSystemInfoSync();
    let language = undefined;
    if (env.language) {
        language = env.language;
    } else if (typeof __getCurrentLanguage !== "undefined") {
        language = __getCurrentLanguage();
    }
    sys.language = language.substr(0, 2);
    sys.languageCode = language.toLowerCase();

    var system = env.system.toLowerCase();
    // Adaptation to Android P
    if (system === 'android p') {
        system = 'android p 9.0';
    }
    var version = /[\d\.]+/.exec(system);
    sys.osVersion = version ? version[0] : system;
    sys.osMainVersion = parseInt(sys.osVersion);
    sys.browserType = null;
    sys.browserVersion = null;
}
