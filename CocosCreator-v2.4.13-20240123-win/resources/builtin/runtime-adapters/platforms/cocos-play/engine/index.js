do {
    if (typeof loadRuntime === 'undefined') {
        console.error("not quick game platform");
        break;
    }
    window.__globalAdapter = loadRuntime();
    require('../../../common/engine/rt-feature-premut-alpha.js');
    require('./fs-utils.js');
    require('../../../common/engine/index.js');
    require('../../../common/engine/native-renderer.js');
} while (false)

