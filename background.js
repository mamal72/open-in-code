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

// Check download and open file if it's downloaded
function checkDownload(query) {
  // disable download shelf
  chrome.downloads.setShelfEnabled(false);  
  chrome.downloads.search(query, function(dl) {
    var currentDownload = dl[0];
    var fileName;
    var fileSize;
    var downloadId;
    chrome.downloads.onChanged.addListener(function downloadListener(download) {
      // Set downloadId if the sizes are equal
      if (download.fileSize && download.fileSize.current && download.fileSize.current == currentDownload.fileSize) {
        fileSize = download.fileSize.current;
        downloadId = download.id;
        return;
      }
      // Set fileName
      if (download.filename && download.filename.current) {
        fileName = download.filename.current;
        return;
      }
      // Ignore if it's not our download
      if (download.id !== downloadId) {
        return;
      }
      // If download is completed, we can enable dl shelf again
      // and open the file in Code and return
      if (download.state && download.state.current && download.state.current === 'complete') {
        chrome.downloads.onChanged.removeListener(downloadListener);
        chrome.downloads.setShelfEnabled(true);
        openInCode(fileName);
        return;
      }
    });
  });
}

// Returns true if current url is a file url in Github
function isFileURL(url) {
  regex = /https:\/\/github.com\/.+\/.+\/blob\/.+/;
  return regex.test(url);
}

// Returns raw download URL
function getRawURL(url) {
  return url.replace('blob', 'raw');
}

function openInCode(file) {
  chrome.tabs.query({
    currentWindow: true,
    active: true
  }, function(tabs) {
    if (!tabs.length) {
      return;
    }
    chrome.tabs.update(tabs[0].id, {
      url: encodeURI('vscode://file' + file)
    });
  });
}
