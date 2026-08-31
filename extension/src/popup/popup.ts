document.addEventListener('DOMContentLoaded', () => {
    const urlEl = document.getElementById('scan-url');
    const statusEl = document.getElementById('scan-status');

    if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['lastScan'], (result: any) => {
            const scan = result.lastScan;
            if (scan && urlEl && statusEl) {
                let displayUrl = scan.url;
                if (displayUrl.length > 50) {
                    displayUrl = displayUrl.substring(0, 47) + '...';
                }
                urlEl.textContent = displayUrl;
                
                if (scan.status === 'SAFE') {
                    statusEl.textContent = '✓ SAFE';
                    statusEl.className = 'status-safe';
                } else if (scan.status === 'MALICIOUS') {
                    statusEl.textContent = '⚠ MALICIOUS';
                    statusEl.className = 'status-malicious';
                } else if (scan.status === 'ERROR') {
                    statusEl.textContent = '❌ ERROR';
                    statusEl.className = 'status-error';
                } else {
                    statusEl.textContent = scan.status;
                }
            }
        });
    }
});
