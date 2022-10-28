import { shell, ipcRenderer } from 'electron';
const links = [...document.getElementsByTagName('a')];

/*
---- Do not show stats on this version
ipcRenderer.on('coffee:show-stats', (event, arg) => {
    Object.entries(arg).forEach(([key, value]) => {
        [...document.querySelectorAll('.js-' + key)].forEach(el => el.innerHTML = value);
        [...document.querySelectorAll('.js-main_' + key)].forEach(el => el.style.display = 'block');
    });
});
*/

ipcRenderer.on('coffee:show-coffee-quote', (event, arg) => {
    document.getElementById("quote").innerHTML = arg.content.content.quote;
    document.getElementById("author").innerHTML = arg.content.content.author;
});

links.forEach((input) => input.addEventListener('click', (event) => {
  event.preventDefault();
  shell.openExternal(event.target.getAttribute('href'));
}, false));
