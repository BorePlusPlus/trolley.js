(function(window, document) {
    'use strict';

    function isQuotaExceeded(e) {
        return e.name.toUpperCase().indexOf('QUOTA') >= 0;
    }

    function isJSONSupported() {
        return (typeof JSON === 'object' && typeof JSON.parse === 'function');
    }

    function checkLocalStorageDependencies() {
        try {
            localStorage.setItem(storePrefix, storePrefix);
            localStorage.removeItem(storePrefix);
            return isJSONSupported();
        } catch(e) {
            return isQuotaExceeded(e) && isJSONSupported();
        }
    }

    function eachTrolliedItem(callback) {
        var item;

        for (item in localStorage) {
            if (item.indexOf(storePrefix) === 0) {
                callback(item, JSON.parse(localStorage[item]));
            }
        }
    }

    function storeItem(key, value) {
        var oldestTimestamp = Number.MAX_VALUE,
            prefixedKey = storePrefix + key,
            oldest,
            storedTimestamp;

        if (!hasLocalStorage) return;
        try {
            localStorage[prefixedKey] = value;
        } catch(e) {
            if (isQuotaExceeded(e)) {
                eachTrolliedItem(function (item, storedObj) {
                    storedTimestamp = storedObj.fetched;
                    if (!storedObj.namespace && storedTimestamp < oldestTimestamp) {
                        oldest = item;
                        oldestTimestamp = storedTimestamp;
                    }
                });
                if (oldest) {
                    localStorage.removeItem(oldest);
                    storeItem(key, value);
                }
            }
        }
    }

    function retrieveItem(key) {
        var prefixedKey = storePrefix + key;

        return hasLocalStorage && localStorage[prefixedKey];
    }

    function clearVersionedItems(namespace) {
        eachTrolliedItem(function (item, storedObj) {
            if (storedObj.namespace === namespace) localStorage.removeItem(item);
        });
    }

    function checkVersionUpdate(version) {
        var versionsKey = storePrefix + 'version',
            namespace,
            currentVersionNumber;

        if (!(hasLocalStorage && version)) return false;
        namespace = version.namespace;
        currentVersionNumber = JSON.parse(localStorage[versionsKey] || '{}')[namespace];
        if (!currentVersionNumber) return true;
        if (currentVersionNumber !== version.version) {
            clearVersionedItems(namespace);
            return true;
        }
        return false;
    }

    function updateVersion(version) {
        var versionsKey = storePrefix + 'version',
            currentVersions;

        if (!(hasLocalStorage && version)) return;
        currentVersions = JSON.parse(localStorage[versionsKey] || '{}');
        currentVersions[version.namespace] = version.version;
        localStorage[versionsKey] = JSON.stringify(currentVersions);
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
        head.appendChild(style);
        if (style.styleSheet) {
            style.styleSheet.cssText = content;
        } else {
            style.innerHTML = content;
        }
    }

    var hasLocalStorage = checkLocalStorageDependencies(),
        insertStrategies = {
            'application/javascript': insertScript,
            'text/css': insertStyle
        },
        head = document.head || document.getElementsByTagName('head')[0],
        storePrefix = 'trolleyjs-';

    window.trolleyjs = function (files, version) {
        var insertQ = [],
            inserted = {},
            insertListeners = {},
            versionUpdate = false,
            toLoad;

        function notifyListeners(fileObj) {
            var url = fileObj.url,
                listeners = insertListeners[url];

            inserted[url] = fileObj;
            while (listeners && listeners.length) {
                listeners.pop()(fileObj);
            }
        }

        function insertViaQ(storedObj, fileObj, qi) {
            var insertObj = insertQ[qi];

            insertObj.storedObj = storedObj;
            insertObj.fileObj = fileObj;
            for (var i = 0, length = insertQ.length; i < length; i++) {
                insertObj = insertQ[i];
                if (!insertObj.inserted) {
                    storedObj = insertObj.storedObj;
                    if (!storedObj) break;
                    insertNow(storedObj, insertObj.fileObj);
                    insertObj.inserted = true;
                    delete insertObj.storedObj;
                }
            }
        }

        function insertNow(storedObj, fileObj) {
            (insertStrategies[storedObj.type] || function () {})(storedObj.content);
            fileObj.callback && fileObj.callback(fileObj);
            notifyListeners(fileObj);
            if (versionUpdate && --toLoad === 0) updateVersion(version);
        }

        function insert(storedObj, fileObj, qi) {
            fileObj.immediate ? insertNow(storedObj, fileObj) : insertViaQ(storedObj, fileObj, qi);
        }

        function load(fileObj, qi) {
            var xhr = newXhr(),
                storedObj;

            xhr.open('GET', fileObj.url, !fileObj.sync);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        storedObj = {
                            content: xhr.responseText,
                            type: fileObj.type || xhr.getResponseHeader('content-type'),
                            fetched: +new Date(),
                            namespace: version && version.namespace
                        };
                        storeItem(fileObj.url, JSON.stringify(storedObj));
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

            function isStoredObjectValid(storedObj) {
                return storedObj && (!version || version.namespace === storedObj.namespace);
            }

            var qi = insertQ.length,
                storedObj;

            if (!fileObj.immediate) insertQ[qi] = { inserted: false };
            storedObj = JSON.parse(retrieveItem(fileObj.url) || 'false');
            if (isStoredObjectValid(storedObj)) return insert(storedObj, fileObj, qi);
            load(fileObj, qi);
        }

        function whenLoaded(url, callback) {
            var fileObj = inserted[url],
                listeners = insertListeners[url];

            if (fileObj) return callback(fileObj);
            if (!listeners) insertListeners[url] = listeners = [];
            listeners.push(callback);
        }

        if (!(files instanceof Array)) {
            files = arguments;
            version = null;
        }
        toLoad = files.length;
        versionUpdate = checkVersionUpdate(version);
        for (var i = 0, length = files.length; i < length; i++) {
            lazyLoad(files[i]);
        }

        return {
            whenLoaded: whenLoaded
        };
    };
})(this, document);
