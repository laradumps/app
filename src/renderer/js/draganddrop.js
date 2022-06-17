const dragdropHandler = () => {
    let dragSrcEl = null;

    function handleDragStart(e) {
        this.classList.add('opacity-25');

        dragSrcEl = this;

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    }

    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }

        e.dataTransfer.dropEffect = 'move';

        return false;
    }

    function handleDragEnter() {
        this.classList.add('over', 'border-dotted', 'border', 'border-slate-600', 'dark:border-slate-300');
    }

    function handleDragLeave() {
        this.classList.remove('over');
    }

    function handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        if (dragSrcEl !== this) {
            dragSrcEl.innerHTML = this.innerHTML;
            this.innerHTML = e.dataTransfer.getData('text/html');
        }

        return false;
    }

    function handleDragEnd() {
        this.classList.remove('opacity-25');

        // eslint-disable-next-line no-use-before-define
        items.forEach((item) => {
            item.classList.remove('over', 'border-dotted', 'border', 'border-slate-600', 'dark:border-slate-300');
        });
    }

    let items = document.querySelectorAll('.collapsable');
    items.forEach((item) => {
        item.addEventListener('dragstart', handleDragStart, false);
        item.addEventListener('dragenter', handleDragEnter, false);
        item.addEventListener('dragover', handleDragOver, false);
        item.addEventListener('dragleave', handleDragLeave, false);
        item.addEventListener('drop', handleDrop, false);
        item.addEventListener('dragend', handleDragEnd, false);
    });
};

export default dragdropHandler;
