if (jsb.device && !jsb.device.getDeviceMotionValue) {
    let [_tempX, _tempY, _tempZ] = [0, 0, 0];
    let _tempGravitySenceArray = undefined;

    jsb.device.setAccelerometerEnabled = function (enabled) {
        if ((_tempGravitySenceArray !== undefined) === enabled) return;
        if (!enabled) {
            qg.stopAccelerometer();
            _tempX = 0;
            _tempY = 0;
            _tempZ = 0;
            _tempGravitySenceArray = undefined;
            return;
        }
        _tempGravitySenceArray = new Array(6).fill(0);
        qg.onAccelerometerChange(function (obj) {
            _tempGravitySenceArray[3] = 1.25 * obj.x + _tempX;
            _tempGravitySenceArray[4] = 1.25 * obj.y + _tempY;
            _tempGravitySenceArray[5] = 1.25 * obj.z + _tempZ;
            _tempX = 0.8 * _tempX + 0.2 * _tempGravitySenceArray[3];
            _tempY = 0.8 * _tempY + 0.2 * _tempGravitySenceArray[4];
            _tempZ = 0.8 * _tempZ + 0.2 * _tempGravitySenceArray[5];
        })
    }

    jsb.device.getDeviceMotionValue = function () {
        if (_tempGravitySenceArray === undefined) {
            return undefined;
        }
        return _tempGravitySenceArray.slice();
    }
}