(function(window, document) {
    'use strict';

    function checkLocalStorageDependencies() {
        var stuff = 'stuff';

        try {
            localStorage.setItem(stuff, stuff);
            localStorage.removeItem(stuff);
            return (typeof JSON === 'object' && typeof JSON.parse === 'function');
        } catch(e) {
            return false;
        }
    }

    function newXhr() {
        return window.XMLHttpRequest ? new window.XMLHttpRequest() : new window.ActiveXObject('Microsoft.XMLHTTP');
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

    function insertNow(storedObj, fileObj) {
        (insertStrategies[storedObj.type] || function () {})(storedObj.content);
        fileObj.callback && fileObj.callback(fileObj);
    }

    function insertViaQ(qi, storedObj, fileObj) {
        var insertObj = insertQ[qi];

        insertObj.storedObj = storedObj;
        insertObj.fileObj = fileObj;
        for (var i = 0, length = insertQ.length; i < length; i++) {
            insertObj = insertQ[i];
            if (!insertObj.inserted) {
                storedObj = insertObj.storedObj;
                if (!insertObj.storedObj) break;
                insertNow(storedObj, insertObj.fileObj);
                insertObj.inserted = true;
                delete insertObj.storedObj;
            }
        }
    }

    function insert(storedObj, fileObj, qi) {
        fileObj.immediate ?
            insertNow(storedObj, fileObj) :
            insertViaQ(qi, storedObj, fileObj);
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
                    insert(storedObj, fileObj, qi);
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

        if (!fileObj.immediate) insertQ[qi] = { inserted: false };
        if (hasLocalStorage) {
            storedObj = JSON.parse(localStorage[fileObj.url] || 'false');
            if (storedObj) return insert(storedObj, fileObj, qi);
        }
        load(fileObj, qi);
    }

    function init(files) {
        for (var i = 0, length = arguments.length; i < length; i++) {
            lazyLoad(arguments[i]);
        }
    }

    var hasLocalStorage = checkLocalStorageDependencies(),
        insertStrategies = {
            'application/javascript': insertScript,
            'text/css': insertStyle
        },
        head = document.head || document.getElementsByTagName('head')[0],
        insertQ = [];

    window.trolleyjs = init;
})(this, document);
