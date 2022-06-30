/*eslint-disable*/
const searchableTable = (id) => {
    let td; let cell; let i; let
        j;
    const input = document.getElementById(`search-${id}`);
    const table = document.getElementById(`table-${id}`);
    const filter = input.value.toUpperCase();
    const tr = table.getElementsByTagName('tr');

    for (i = 1; i < tr.length; i++) {
        tr[i].style.display = 'none';

        td = tr[i].getElementsByTagName('td');
        for (j = 0; j < td.length; j++) {
            cell = tr[i].getElementsByTagName('td')[j];
            if (cell) {
                if (cell.innerHTML.toUpperCase().indexOf(filter) > -1) {
                    tr[i].style.display = '';
                    break;
                }
            }
        }
    }
};

export default searchableTable;
