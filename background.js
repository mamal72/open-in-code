var MAX_DL_CHECK_TRY = 200;
var DL_CHECK_DELAY = 50;

// Enable page action on Github file pages
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, currentTab) {
  if (currentTab.status !== 'complete' || changeInfo.status !== 'complete') {
    return;
  }
  if (isFileURL(currentTab.url)) {
    chrome.pageAction.show(tabId);
  } else {
    chrome.pageAction.hide(tabId);
  }
});

// Set listener on page action click
chrome.pageAction.onClicked.addListener(function(tab) {
  var url = tab.url;
  if (!isFileURL(url)) {
    return;
  }

  var rawURL = getRawURL(url);
  chrome.downloads.download({
    url: rawURL
  }, function(id) {
    checkDownload({id: id});
  });
});

// Returns true if current url is a file url in Github
function isFileURL(url) {
  regex = /https:\/\/github.com\/.+\/.+\/blob\/.+/;
  return regex.test(url);
}

// Returns raw download URL
function getRawURL(url) {
  return url.replace('blob', 'raw');
}

// Check download and open file if it's downloaded
function checkDownload(query, tries) {
  tries = tries || 0;
  chrome.downloads.search(query, function(dl) {
    // If dl is started, set url and fileSize for next queries
    // The ID will change after canceling download in your custom download manager and redownloading it in Chrome
    // So, we'll use url and fileSize as our query fields
    // We should also check file id to be equal or greater than our original id
    if (dl.length && query.id && dl[0].id >= query.id) {
      query = {
        url: dl[0].url,
        fileSize: dl[0].fileSize,
        exists: true,
        state: 'complete'
      }
    }
    // If download is completed, we can open it in Code and return
    if (dl.length && dl[0].state === 'complete') {
      chrome.tabs.query({
        currentWindow: true,
        active: true
      }, function(tabs) {
        if (tabs.length === 0) {
          return;
        }
        chrome.tabs.update(tabs[0].id, {
          url: encodeURI('vscode://file' + dl[0].filename)
        });
      });

      return;
    }

    // If tries are over and dl is not present yet it's enough
    if (tries >= MAX_DL_CHECK_TRY && !dl.length) {
      return;
    }

    // Increment retries
    tries += 1;
    setTimeout(function() {
      checkDownload(query, tries);
    }, DL_CHECK_DELAY);
  });
}
