if (jsb.device) {
    let _tempGravitySenceArray = undefined;

    jsb.device.setAccelerometerEnabled = function (enabled) {
        if ((_tempGravitySenceArray !== undefined) === enabled) {
            return;
        }
        if (!enabled) {
            qg.unsubscribeAccelerometer();
            _tempGravitySenceArray = undefined;
            return;
        }
        _tempGravitySenceArray = new Array(6).fill(0);
        qg.subscribeAccelerometer({
            callback: function (obj) {

                _tempGravitySenceArray[3] = obj.x;
                _tempGravitySenceArray[4] = obj.y;
                _tempGravitySenceArray[5] = obj.z;

                let windowWidth = window.innerWidth;
                let windowHeight = window.innerHeight;
                let gravityFactor = 1.0;
                //landscape view
                if (windowHeight < windowWidth) {
                    let tmp = _tempGravitySenceArray[3];
                    _tempGravitySenceArray[3] = _tempGravitySenceArray[4];
                    _tempGravitySenceArray[4] = tmp;
                    _tempGravitySenceArray[3] *= -gravityFactor;
                    _tempGravitySenceArray[4] *= gravityFactor;
                }
                else {
                    _tempGravitySenceArray[3] *= -gravityFactor;
                    _tempGravitySenceArray[4] *= -gravityFactor;
                }
            }
        })
    }

    jsb.device.getDeviceMotionValue = function () {
        if (_tempGravitySenceArray === undefined) {
            return undefined;
        }
        return _tempGravitySenceArray.slice();
    }
}