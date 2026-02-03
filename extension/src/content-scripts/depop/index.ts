console.log('Depop Content Script Loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Depop Script Received:', message);

  if (message.platform !== 'depop') {
    return;
  }

  if (message.action === 'download') {
    console.log('Starting Depop Download for:', message.username);
    sendResponse({ success: true, message: 'Depop Download Started' });
  } 
  else if (message.action === 'upload') {
    console.log('Starting Depop Upload for:', message.username);
    sendResponse({ success: true, message: 'Depop Upload Started' });
  }

  return true;
});