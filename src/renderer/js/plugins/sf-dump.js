/**
 * Dump was adapted from var-dumper
 *
 * @author https://github.com/symfony/var-dumper
 * @see https://github.com/symfony/var-dumper/blob/5.4/Dumper/HtmlDumper.php
 */
/*eslint-disable*/
module.exports = Sfdump = window.Sfdump || (function (doc) {
  let refStyle = doc.createElement('style'); const rxEsc = /([.*+?^${}()|\[\]\/\\])/g; const idRx = /\bsf-dump-\d+-ref[012]\w+\b/;
  const keyHint = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Cmd' : 'Ctrl';
  let addEventListener = function (e, n, cb) {
    e.addEventListener(n, cb, false);
  };
  refStyle.innerHTML = 'pre.sf-dump .sf-dump-compact, .sf-dump-str-collapse .sf-dump-str-collapse, .sf-dump-str-expand .sf-dump-str-expand { display: none; }';
  (doc.documentElement.firstElementChild || doc.documentElement.children[0]).appendChild(refStyle);
  refStyle = doc.createElement('style');
  (doc.documentElement.firstElementChild || doc.documentElement.children[0]).appendChild(refStyle);
  if (!doc.addEventListener) {
    addEventListener = function (element, eventName, callback) {
      element.attachEvent(`on${eventName}`, (e) => {
        e.preventDefault = function () {
          e.returnValue = false;
        };
        e.target = e.srcElement;
        callback(e);
      });
    };
  }

  function toggle(a, recursive) {
    let s = a.nextSibling || {}; const oldClass = s.className; let arrow; let
      newClass;
    if (/\bsf-dump-compact\b/.test(oldClass)) {
      arrow = '&#9660;';
      newClass = 'sf-dump-expanded';
    } else if (/\bsf-dump-expanded\b/.test(oldClass)) {
      arrow = '&#9654;';
      newClass = 'sf-dump-compact';
    } else {
      return false;
    }
    if (doc.createEvent && s.dispatchEvent) {
      const event = doc.createEvent('Event');
      event.initEvent(newClass === 'sf-dump-expanded' ? 'sfbeforedumpexpand' : 'sfbeforedumpcollapse', true, false);
      s.dispatchEvent(event);
    }
    if (a.lastChild) {
      a.lastChild.innerHTML = arrow;
    }

    s.className = s.className.replace(/\bsf-dump-(compact|expanded)\b/, newClass);
    if (recursive) {
      try {
        a = s.querySelectorAll(`.${oldClass}`);
        for (s = 0; s < a.length; ++s) {
          if (a[s].className.indexOf(newClass) === -1) {
            a[s].className = newClass;
            a[s].previousSibling.lastChild.innerHTML = arrow;
          }
        }
      } catch (e) {
      }
    }
    return true;
  }

  function collapse(a, recursive) {
    const s = a.nextSibling || {}; const
      oldClass = s.className;
    if (/\bsf-dump-expanded\b/.test(oldClass)) {
      toggle(a, recursive);
      return true;
    }
    return false;
  }

  function expand(a, recursive) {
    const s = a.nextSibling || {}; const
      oldClass = s.className;
    if (/\bsf-dump-compact\b/.test(oldClass)) {
      toggle(a, recursive);
      return true;
    }
    return false;
  }

  function collapseAll(root) {
    const a = root.querySelector('a.sf-dump-toggle');
    if (a) {
      collapse(a, true);
      expand(a);
      return true;
    }
    return false;
  }

  function reveal(node) {
    let previous; const
      parents = [];
    while ((node = node.parentNode || {}) && (previous = node.previousSibling) && previous.tagName === 'A') {
      parents.push(previous);
    }
    if (parents.length !== 0) {
      parents.forEach((parent) => {
        expand(parent);
      });
      return true;
    }
    return false;
  }

  function highlight(root, activeNode, nodes) {
    resetHighlightedNodes(root);
    Array.from(nodes || []).forEach((node) => {
      if (!/\bsf-dump-highlight\b/.test(node.className)) {
        node.className = `${node.className} sf-dump-highlight`;
      }
    });
    if (!/\bsf-dump-highlight-active\b/.test(activeNode.className)) {
      activeNode.className = `${activeNode.className} sf-dump-highlight-active`;
    }
  }

  function resetHighlightedNodes(root) {
    Array.from(root.querySelectorAll('.sf-dump-str, .sf-dump-key, .sf-dump-public, .sf-dump-protected, .sf-dump-private')).forEach((strNode) => {
      strNode.className = strNode.className.replace(/\bsf-dump-highlight\b/, '');
      strNode.className = strNode.className.replace(/\bsf-dump-highlight-active\b/, '');
    });
  }

  return function (root, x) {
    root = doc.getElementById(root);
    const indentRx = new RegExp(`^(${(root.getAttribute('data-indent-pad') || ' ').replace(rxEsc, '\\$1')})+`, 'm');
    const options = { maxDepth: 1, maxStringLength: 160, fileLinkFormat: false };
    let elt = root.getElementsByTagName('A'); let len = elt.length; let i = 0; let s; let h; let
      t = [];
    while (i < len) t.push(elt[i++]);
    for (i in x) {
      options[i] = x[i];
    }

    function a(e, f) {
      addEventListener(root, e, (e, n) => {
        if (e.target.tagName === 'A') {
          f(e.target, e);
        } else if (e.target.parentNode.tagName === 'A') {
          f(e.target.parentNode, e);
        } else {
          n = /\bsf-dump-ellipsis\b/.test(e.target.className) ? e.target.parentNode : e.target;
          if ((n = n.nextElementSibling) && n.tagName === 'A') {
            if (!/\bsf-dump-toggle\b/.test(n.className)) {
              n = n.nextElementSibling || n;
            }
            f(n, e, true);
          }
        }
      });
    }

    function isCtrlKey(e) {
      return e.ctrlKey || e.metaKey;
    }

    function xpathString(str) {
      const parts = str.match(/[^'"]+|['"]/g).map((part) => {
        if (part === "'") {
          return '"\'"';
        }
        if (part === '"') {
          return "'\"'";
        }
        return `'${part}'`;
      });
      return `concat(${parts.join(',')}, '')`;
    }

    function xpathHasClass(className) {
      return `contains(concat(' ', normalize-space(@class), ' '), ' ${className} ')`;
    }

    addEventListener(root, 'mouseover', (e) => {
      if (refStyle.innerHTML !== '') {
        refStyle.innerHTML = '';
      }
    });
    a('mouseover', (a, e, c) => {
      if (c) {
        e.target.style.cursor = 'pointer';
      } else if (a === idRx.exec(a.className)) {
        try {
          refStyle.innerHTML = `pre.sf-dump .${a[0]}{background-color: #B729D9; color: #FFF !important; border-radius: 2px}`;
        } catch (e) {
        }
      }
    });
    a('click', (a, e, c) => {
      if (/\bsf-dump-toggle\b/.test(a.className)) {
        e.preventDefault();
        if (!toggle(a, isCtrlKey(e))) {
          const r = doc.getElementById(a.getAttribute('href').substr(1)); const s = r.previousSibling;
          let f = r.parentNode; let
            t = a.parentNode;
          t.replaceChild(r, a);
          f.replaceChild(a, s);
          t.insertBefore(s, r);
          f = f.firstChild.nodeValue.match(indentRx);
          t = t.firstChild.nodeValue.match(indentRx);
          if (f && t && f[0] !== t[0]) {
            r.innerHTML = r.innerHTML.replace(new RegExp(`^${f[0].replace(rxEsc, '\\$1')}`, 'mg'), t[0]);
          }
          if (/\bsf-dump-compact\b/.test(r.className)) {
            toggle(s, isCtrlKey(e));
          }
        }
        if (c) {
        } else if (doc.getSelection) {
          try {
            doc.getSelection().removeAllRanges();
          } catch (e) {
            doc.getSelection().empty();
          }
        } else {
          doc.selection.empty();
        }
      } else if (/\bsf-dump-str-toggle\b/.test(a.className)) {
        e.preventDefault();
        e = a.parentNode.parentNode;
        e.className = e.className.replace(/\bsf-dump-str-(expand|collapse)\b/, a.parentNode.className);
      }
    });
    elt = root.getElementsByTagName('SAMP');
    len = elt.length;
    i = 0;
    while (i < len) t.push(elt[i++]);
    len = t.length;
    for (i = 0; i < len; ++i) {
      elt = t[i];
      if (elt.tagName === 'SAMP') {
        a = elt.previousSibling || {};
        if (a.tagName !== 'A') {
          a = doc.createElement('A');
          a.className = 'sf-dump-ref';
          elt.parentNode.insertBefore(a, elt);
        } else {
          a.innerHTML += '';
        }
        a.title = `${(a.title ? `${a.title}\n[` : '[') + keyHint}`;
        a.innerHTML += elt.className === 'sf-dump-compact' ? '<span>&#9654;</span>' : '<span>&#9660;</span>';
        a.className += ' sf-dump-toggle';
        x = 1;
        if (elt.parentNode.className !== 'sf-dump') {
          x += elt.parentNode.getAttribute('data-depth') / 1;
        }
      } else if (/\bsf-dump-ref\b/.test(elt.className) && (a = elt.getAttribute('href'))) {
        a = a.substr(1);
        elt.className += ` ${a}`;
        if (/[\[{]$/.test(elt.previousSibling.nodeValue)) {
          a = a !== elt.nextSibling.id && doc.getElementById(a);
          try {
            s = a.nextSibling;
            elt.appendChild(a);
            s.parentNode.insertBefore(a, s);
            if (/^[@#]/.test(elt.innerHTML)) {
              elt.innerHTML += ' <span>&#9654;</span>';
            } else {
              elt.innerHTML = '<span>&#9654;</span>';
              elt.className = 'sf-dump-ref';
            }
            elt.className += ' sf-dump-toggle';
          } catch (e) {
            if (elt.innerHTML.charAt(0) === '&') {
              elt.innerHTML = '&hellip;';
              elt.className = 'sf-dump-ref';
            }
          }
        }
      }
    }
    if (doc.evaluate && Array.from && root.children.length > 1) {
      root.setAttribute('tabindex', 0);
      SearchState = function () {
        this.nodes = [];
        this.idx = 0;
      };
      SearchState.prototype = {
        next() {
          if (this.isEmpty()) {
            return this.current();
          }
          this.idx = this.idx < (this.nodes.length - 1) ? this.idx + 1 : 0;
          return this.current();
        },
        previous() {
          if (this.isEmpty()) {
            return this.current();
          }
          this.idx = this.idx > 0 ? this.idx - 1 : (this.nodes.length - 1);
          return this.current();
        },
        isEmpty() {
          return this.count() === 0;
        },
        current() {
          if (this.isEmpty()) {
            return null;
          }
          return this.nodes[this.idx];
        },
        reset() {
          this.nodes = [];
          this.idx = 0;
        },
        count() {
          return this.nodes.length;
        },
      };

      function showCurrent(state) {
        const currentNode = state.current(); let currentRect; let
          searchRect;
        if (currentNode) {
          reveal(currentNode);
          highlight(root, currentNode, state.nodes);
          if ('scrollIntoView' in currentNode) {
            currentNode.scrollIntoView(true);
            currentRect = currentNode.getBoundingClientRect();
            searchRect = search.getBoundingClientRect();
            if (currentRect.top < (searchRect.top + searchRect.height)) {
              window.scrollBy(0, -(searchRect.top + searchRect.height + 5));
            }
          }
        }
        counter.textContent = `${state.isEmpty() ? 0 : state.idx + 1} of ${state.count()}`;
      }

      const search = doc.createElement('div');
      search.className = 'sf-dump-search-wrapper sf-dump-search-hidden';
      search.innerHTML = ' <input type="text" class="sf-dump-search-input"> <span class="sf-dump-search-count">0 of 0<\/span> <button type="button" class="sf-dump-search-input-previous" tabindex="-1"> <svg viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M1683 1331l-166 165q-19 19-45 19t-45-19L896 965l-531 531q-19 19-45 19t-45-19l-166-165q-19-19-19-45.5t19-45.5l742-741q19-19 45-19t45 19l742 741q19 19 19 45.5t-19 45.5z"\/><\/svg> <\/button> <button type="button" class="sf-dump-search-input-next" tabindex="-1"> <svg viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M1683 808l-742 741q-19 19-45 19t-45-19L109 808q-19-19-19-45.5t19-45.5l166-165q19-19 45-19t45 19l531 531 531-531q19-19 45-19t45 19l166 165q19 19 19 45.5t-19 45.5z"\/><\/svg> <\/button> ';
      root.insertBefore(search, root.firstChild);
      const state = new SearchState();
      const searchInput = search.querySelector('.sf-dump-search-input');
      const counter = search.querySelector('.sf-dump-search-count');
      let searchInputTimer = 0;
      let previousSearchQuery = '';
      addEventListener(searchInput, 'keyup', (e) => {
        const searchQuery = e.target.value; /* Don't perform anything if the pressed key didn't change the query */
        if (searchQuery === previousSearchQuery) {
          return;
        }
        previousSearchQuery = searchQuery;
        clearTimeout(searchInputTimer);
        searchInputTimer = setTimeout(() => {
          state.reset();
          collapseAll(root);
          resetHighlightedNodes(root);
          if (searchQuery === '') {
            counter.textContent = '0 of 0';
            return;
          }
          const classMatches = ['sf-dump-str', 'sf-dump-key', 'sf-dump-public', 'sf-dump-protected', 'sf-dump-private'].map(xpathHasClass).join(' or ');
          const xpathResult = doc.evaluate(`.//span[${classMatches}][contains(translate(child::text(), ${xpathString(searchQuery.toUpperCase())}, ${xpathString(searchQuery.toLowerCase())}), ${xpathString(searchQuery.toLowerCase())})]`, root, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
          while (node = xpathResult.iterateNext()) state.nodes.push(node);
          showCurrent(state);
        }, 400);
      });
      Array.from(search.querySelectorAll('.sf-dump-search-input-next, .sf-dump-search-input-previous')).forEach((btn) => {
        addEventListener(btn, 'click', (e) => {
          e.preventDefault();
          e.target.className.indexOf('next') !== -1 ? state.next() : state.previous();
          searchInput.focus();
          collapseAll(root);
          showCurrent(state);
        });
      });
      addEventListener(root, 'keydown', (e) => {
        const isSearchActive = !/\bsf-dump-search-hidden\b/.test(search.className);
        if ((e.keyCode === 114 && !isSearchActive) || (isCtrlKey(e) && e.keyCode === 70)) { /* F3 or CMD/CTRL + F */
          if (e.keyCode === 70 && document.activeElement === searchInput) { /* * If CMD/CTRL + F is hit while having focus on search input, * the user probably meant to trigger browser search instead. * Let the browser execute its behavior: */
            return;
          }
          e.preventDefault();
          search.className = search.className.replace(/\bsf-dump-search-hidden\b/, '');
          searchInput.focus();
        } else if (isSearchActive) {
          if (e.keyCode === 27) { /* ESC key */
            search.className += ' sf-dump-search-hidden';
            e.preventDefault();
            resetHighlightedNodes(root);
            searchInput.value = '';
          } else if ((isCtrlKey(e) && e.keyCode === 71) /* CMD/CTRL + G */ || e.keyCode === 13 /* Enter */ || e.keyCode === 114 /* F3 */) {
            e.preventDefault();
            e.shiftKey ? state.previous() : state.next();
            collapseAll(root);
            showCurrent(state);
          }
        }
      });
    }
    if (options.maxStringLength <= 0) {
      return;
    }
    try {
      elt = root.querySelectorAll('.sf-dump-str');
      len = elt.length;
      i = 0;
      t = [];
      while (i < len) t.push(elt[i++]);
      len = t.length;
      for (i = 0; i < len; ++i) {
        elt = t[i];
        s = elt.innerText || elt.textContent;
        x = s.length - options.maxStringLength;
        if (x > 0) {
          h = elt.innerHTML;
          elt[elt.innerText ? 'innerText' : 'textContent'] = s.substring(0, options.maxStringLength);
          elt.className += ' sf-dump-str-collapse';
          elt.innerHTML = `<span class=sf-dump-str-collapse>${h}<a class="sf-dump-ref sf-dump-str-toggle" title="Collapse"> &#9664;</a></span>` + `<span class=sf-dump-str-expand>${elt.innerHTML}<a class="sf-dump-ref sf-dump-str-toggle" title="${x} remaining characters"> &#9654;</a></span>`;
        }
      }
    } catch (e) {

    }
  };
}(document));
