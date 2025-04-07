do {
    if (typeof qg === 'undefined') {
        console.error("not quick game platform");
        break;
    }
    window.__globalAdapter = qg;
    require('../../../common/engine/rt-feature-premut-alpha.js');
    require('./fs-utils.js');
    require('../../../common/engine/index.js');
    require('./DeviceMotionEvent.js');
    require('./rt-videoplayer.js');
} while (false)
