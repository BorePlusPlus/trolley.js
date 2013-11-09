(function() {
    'use strict';

    function checkLocalStorage() {
        var stuff = 'stuff';
        try {
            localStorage.setItem(stuff, stuff);
            localStorage.removeItem(stuff);
            return true;
        } catch(e) {
            return false;
        }
    }

    function newXhr() {
        return window.XMLHttpRequest ? new window.XMLHttpRequest() : new window.ActiveXObject('Microsoft.XMLHTTP');
    }

    function insertFile(content, type) {
        var insertStrategy = insertStrategies[type] || function () {};
        insertStrategy(content);
    }

    function insertScript(content) {
        var script = document.createElement('script');
        script.setAttribute('type', 'text/javascript');
        script.text = content;
        head.appendChild(script);
    }

    function insertStyle(content) {
        var style = document.createElement('style');
        style.setAttribute('type', 'text/css');
        style.setAttribute('media', 'screen');
        head.appendChild(style);
        if (style.styleSheet) {
            style.styleSheet.cssText = content;
        } else {
            style.innerHTML = content;
        }
    }

    function load(fileObj) {
        var xhr = newXhr(),
            content;
        xhr.open('GET', fileObj.url, !fileObj.sync);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if(xhr.status === 200) {
                    content = xhr.responseText;
                    if (hasLocalStorage) {
                        localStorage[fileObj.url] = content;
                    }
                    insertFile(content, fileObj.type);
                } else {
                    throw new Error(xhr.statusText);
                }
            }
        };
        // By default XHRs never timeout so we do it ourselves.
        setTimeout(function () { if (xhr.readyState < 4) xhr.abort(); }, 15000);
        xhr.send();
    }

    function lazyLoad(fileObj) {
        var content;
        if (hasLocalStorage) {
            content = localStorage[fileObj.url];
            if (content) return insertFile(content, fileObj.type);
        }
        load(fileObj);
    }

    // TYPE is required!!! make sure it isn't in the long run.
    function init(files) {
        for (var i = 0, length = arguments.length; i < length; i++) {
            lazyLoad(arguments[i]);
        }
    }

    var hasLocalStorage = checkLocalStorage(),
        insertStrategies = {
            'text/javascript': insertScript,
            'text/css': insertStyle
        },
        head = document.head || document.getElementsByTagName('head')[0];

    window.trolleyjs = init;
})();
