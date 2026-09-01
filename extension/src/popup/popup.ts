document.addEventListener('DOMContentLoaded', () => {
    const urlRepStatusEl = document.getElementById('url-rep-status');
    const urlRepIconEl = document.getElementById('url-rep-icon');
    const scanUrlEl = document.getElementById('scan-url');
    const overallStatusTextEl = document.getElementById('overall-status-text');
    const overallStatusCardEl = document.getElementById('overall-status-card');

    if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['lastScan'], (result: any) => {
            const scan = result.lastScan;
            if (scan && urlRepStatusEl && scanUrlEl && overallStatusTextEl && overallStatusCardEl && urlRepIconEl) {
                let displayUrl = scan.url || '';
                
                scanUrlEl.textContent = displayUrl;
                scanUrlEl.title = displayUrl;
                
                if (scan.status === 'SAFE') {
                    const safeText = '✓ No known threats detected';
                    urlRepStatusEl.textContent = safeText;
                    urlRepStatusEl.className = 'module-status status-safe';
                    urlRepIconEl.textContent = '✓';
                    urlRepIconEl.className = 'module-icon icon-safe';
                    
                    overallStatusTextEl.textContent = safeText;
                    overallStatusCardEl.className = 'overall-status-card card-safe';
                } else if (scan.status === 'MALICIOUS') {
                    const threatText = '⚠ Threat detected';
                    urlRepStatusEl.textContent = threatText;
                    urlRepStatusEl.className = 'module-status status-threat';
                    urlRepIconEl.textContent = '⚠';
                    urlRepIconEl.className = 'module-icon icon-threat';
                    
                    overallStatusTextEl.textContent = threatText;
                    overallStatusCardEl.className = 'overall-status-card card-threat';
                } else if (scan.status === 'ERROR') {
                    const errorText = 'Error during scan';
                    urlRepStatusEl.textContent = errorText;
                    urlRepStatusEl.className = 'module-status status-error';
                    urlRepIconEl.textContent = '❌';
                    urlRepIconEl.className = 'module-icon icon-error';
                    
                    overallStatusTextEl.textContent = errorText;
                    overallStatusCardEl.className = 'overall-status-card card-error';
                } else {
                    const scanningText = 'Scanning...';
                    urlRepStatusEl.textContent = scanningText;
                    urlRepStatusEl.className = 'module-status status-scanning';
                    urlRepIconEl.textContent = '⟳';
                    urlRepIconEl.className = 'module-icon icon-scanning';
                    
                    overallStatusTextEl.textContent = scanningText;
                    overallStatusCardEl.className = 'overall-status-card card-scanning';
                }
            } else {
                if (overallStatusTextEl && urlRepStatusEl && overallStatusCardEl && urlRepIconEl) {
                    const unknownText = 'Unknown';
                    urlRepStatusEl.textContent = unknownText;
                    overallStatusTextEl.textContent = unknownText;
                    urlRepIconEl.textContent = '?';
                    overallStatusCardEl.className = 'overall-status-card card-unknown';
                }
            }
        });
    }
});
