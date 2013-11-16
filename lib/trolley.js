(function(window, document) {
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

    function insertFile(storedObj) {
        (insertStrategies[storedObj.type] || function () {})(storedObj.content);
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

    function load(fileObj, qi) {
        var xhr = newXhr(),
            storedObj;

        xhr.open('GET', fileObj.url, !fileObj.sync);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if(xhr.status === 200) {
                    storedObj = {
                        content: xhr.responseText,
                        type: fileObj.type || xhr.getResponseHeader('content-type')
                    };
                    if (hasLocalStorage) localStorage[fileObj.url] = JSON.stringify(storedObj);
                    toInsertQ(qi, storedObj);
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
        var qi = insertQ.length,
            storedObj;

        insertQ[qi] = { loaded: false };
        if (hasLocalStorage) {
            storedObj = JSON.parse(localStorage[fileObj.url] || 'false');
            if (storedObj) return toInsertQ(qi, storedObj);
        }
        load(fileObj, qi);
    }

    function toInsertQ(qi, storedObj) {
        insertQ[qi].storedObj = storedObj;
        for (var i = 0, length = insertQ.length; i < length; i++) {
            var loadObj = insertQ[i];
            if (!loadObj.loaded) {
                if (!loadObj.storedObj) break;
                insertFile(loadObj.storedObj);
                loadObj.loaded = true;
                delete loadObj.storedObj;
            }
        }
    }

    function init(files) {
        for (var i = 0, length = arguments.length; i < length; i++) {
            lazyLoad(arguments[i]);
        }
    }

    var hasLocalStorage = checkLocalStorage(),
        insertStrategies = {
            'application/javascript': insertScript,
            'text/css': insertStyle
        },
        head = document.head || document.getElementsByTagName('head')[0],
        insertQ = [];

    window.trolleyjs = init;
})(this, document);
