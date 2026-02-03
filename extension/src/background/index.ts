console.log('Background script loaded');

function getUserProfileUrl(platform: string, username: string): string {
  if (platform === 'depop') {
    return `https://www.depop.com/${username}/`;
  } else if (platform === 'vinted') {
    return `https://www.vinted.com/member/${username}`;
  }
  return '';
}

function isCorrectProfileUrl(url: string, platform: string, username: string): boolean {
  if (platform === 'depop') {
    return url.includes(`depop.com/${username}`);
  } else if (platform === 'vinted') {
    return url.includes(`vinted.com/member/${username}`);
  }
  return false;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, platform, username } = message;
  console.log(`Background received: ${action} for ${platform} (user: ${username})`);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    
    if (!currentTab?.id) {
      sendResponse({ success: false, error: 'No active tab found' });
      return;
    }

    const tabId = currentTab.id;

    const profileUrl = getUserProfileUrl(platform, username);
    if (!profileUrl) {
      sendResponse({ success: false, error: `Unknown platform: ${platform}` });
      return;
    }

    if (currentTab.url && isCorrectProfileUrl(currentTab.url, platform, username)) {
      console.log('Already on correct profile, sending message...');
      sendMessageToTab(tabId, message, sendResponse);
    } else {
      console.log(`Navigating to ${profileUrl}...`);
      chrome.tabs.update(tabId, { url: profileUrl }, () => {
        chrome.tabs.onUpdated.addListener(function listener(updatedTabId, info) {
          if (updatedTabId === tabId && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            setTimeout(() => {
              sendMessageToTab(tabId, message, sendResponse);
            }, 1500);
          }
        });
      });
    }
  });

  return true;
});

function sendMessageToTab(
  tabId: number,
  message: any,
  sendResponse: (response?: any) => void,
  attempt = 0
) {
  chrome.tabs.sendMessage(tabId, message, (response) => {
    if (chrome.runtime.lastError) {
      console.warn("Content script error:", chrome.runtime.lastError.message);

      if (attempt < 5) {
        setTimeout(() => {
          sendMessageToTab(tabId, message, sendResponse, attempt + 1);
        }, 500);
        return;
      }

      sendResponse({
        success: false,
        error: 'Could not connect to content script. Please try again.'
      });
      return;
    }

    console.log('Content script responded:', response);
    sendResponse(response);
  });
}