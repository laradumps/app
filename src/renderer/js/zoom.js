const { webFrame } = require('electron');

const supportZoom = () => {
    const body = document.querySelector('body');

    let factor = 1.0;
    webFrame.setZoomFactor(factor);

    body.addEventListener('mousewheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            if (e.deltaY > 0) {
                webFrame.setZoomFactor(factor -= 0.1);
            } else {
                webFrame.setZoomFactor(factor += 0.1);
            }
        }
    }, { passive: false });
};

export default supportZoom;
