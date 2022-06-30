const addClass = (element, name) => {
    let i;
    const arr1 = element.className.split(' ');
    const arr2 = name.split(' ');
    for (i = 0; i < arr2.length; i += 1) {
        if (arr1.indexOf(arr2[i]) === -1) {
            element.className += ` ${arr2[i]}`;
        }
    }
};

const removeClass = (element, name) => {
    let i;
    const arr1 = element.className.split(' ');
    const arr2 = name.split(' ');
    for (i = 0; i < arr2.length; i += 1) {
        while (arr1.indexOf(arr2[i]) > -1) {
            arr1.splice(arr1.indexOf(arr2[i]), 1);
        }
    }
    element.className = arr1.join(' ');
};

const filterScreen = (screenName) => {
    let i;

    const x = document.getElementsByClassName('filterScreen');
    if (screenName === 'all') screenName = '';
    for (i = 0; i < x.length; i += 1) {
        removeClass(x[i], 'show');
        if (x[i].className.indexOf(screenName) > -1) addClass(x[i], 'show');
    }
};

export default filterScreen;
