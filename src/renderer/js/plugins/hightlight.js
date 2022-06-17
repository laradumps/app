/*eslint-disable*/
function getDiff(first, second) {
    let i;
    const diffRange = [];
    let currentRange;
    for (i = 0; i < first.length; i++) {
        if (first[i] !== second[i]) {
            if (currentRange === undefined) {
                currentRange = [i];
            }
        }
        if (currentRange !== undefined && first[i] === second[i]) {
            currentRange.push(i);
            diffRange.push(currentRange);
            currentRange = undefined;
        }
    }
    if (currentRange !== undefined) {
        currentRange.push(i);
        diffRange.push(currentRange);
    }
    return diffRange;
}

function makeHightlight(first, second, diff = false) {
    const diffRange = getDiff(first, second);
    let bg = 'bg-orange-200';
    if (diff) {
        bg = 'bg-green-200';
    }

    for (let i = diffRange.length - 1; i >= 0; i--) {
        const range = diffRange[i];
        const s = range[0];
        const e = range[1];

        first = `${first.slice(0, s)}<span class='p-0.5 ${bg} dark:text-slate-700 font-semibold'>${first.slice(s, e)}</span>${first.slice(e)}`;
    }

    return first;
}

export { makeHightlight };
