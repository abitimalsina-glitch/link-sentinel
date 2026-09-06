import { pollPageAnalysis } from '../api.js';
import { PageAnalysis, ScanResult } from '../types.js';

let currentPollTimeout: number | undefined;
let currentScanUrl: string | undefined;
let currentPollUuid: string | undefined;

document.addEventListener('DOMContentLoaded', () => {
    const urlRepStatusEl = document.getElementById('url-rep-status');
    const urlRepIconEl = document.getElementById('url-rep-icon');
    const scanUrlEl = document.getElementById('scan-url');
    const overallStatusTextEl = document.getElementById('overall-status-text');
    const overallStatusCardEl = document.getElementById('overall-status-card');

    const paCardEl = document.getElementById('page-analysis-card');
    const paIconEl = document.getElementById('page-analysis-icon');
    const paStatusEl = document.getElementById('page-analysis-status');
    const paDetailsEl = document.getElementById('page-analysis-details');

    const escapeHtml = (str: string | number | boolean | undefined | null): string => {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    };

    const renderPageAnalysis = (pa: PageAnalysis | undefined) => {
        if (!paCardEl || !paIconEl || !paStatusEl || !paDetailsEl) return;
        
        paDetailsEl.style.display = 'none';
        paDetailsEl.innerHTML = '';
        paCardEl.classList.remove('inactive');

        if (!pa || pa.status === 'not_analyzed') {
            paIconEl.textContent = '○';
            paIconEl.className = 'module-icon icon-unknown';
            paStatusEl.textContent = 'No page analysis available.';
            paStatusEl.className = 'module-status status-unknown';
            paCardEl.classList.add('inactive');
            return;
        }

        if (pa.status === 'submitting') {
            paIconEl.textContent = '⟳';
            paIconEl.className = 'module-icon icon-scanning';
            paStatusEl.textContent = 'Preparing analysis...';
            paStatusEl.className = 'module-status status-scanning';
            return;
        }

        if (pa.status === 'scanning') {
            paIconEl.textContent = '⟳';
            paIconEl.className = 'module-icon icon-scanning';
            paStatusEl.textContent = 'Analyzing page...\nURLScan analysis is still running.';
            paStatusEl.className = 'module-status status-scanning status-pre-line';
            return;
        }

        if (pa.status === 'failed') {
            paIconEl.textContent = '✕';
            paIconEl.className = 'module-icon icon-error';
            paStatusEl.textContent = 'Analysis failed.\nTry scanning again.';
            paStatusEl.className = 'module-status status-error status-pre-line';
            return;
        }

        if (pa.status === 'timeout') {
            paIconEl.textContent = '⚠';
            paIconEl.className = 'module-icon icon-threat';
            paStatusEl.textContent = 'Analysis timed out.\nThe security scan results are still available.';
            paStatusEl.className = 'module-status status-unknown status-pre-line';
            return;
        }

        if (pa.status === 'rate_limited') {
            paIconEl.textContent = '⚠';
            paIconEl.className = 'module-icon icon-threat';
            paStatusEl.textContent = 'Analysis temporarily unavailable.\nURLScan rate limit reached.';
            paStatusEl.className = 'module-status status-unknown status-pre-line';
            return;
        }

        if (pa.status === 'complete') {
            paIconEl.textContent = '✓';
            paIconEl.className = 'module-icon icon-safe';
            paStatusEl.textContent = 'Analysis complete';
            paStatusEl.className = 'module-status status-safe status-normal';

            let html = '<div class="pa-results">';
            
            if (pa.pageInfo) {
                html += `
                    <div class="pa-section">
                        <div class="pa-label">PAGE</div>
                        <div class="pa-row"><span class="pa-key">Title</span> <span class="pa-value pa-truncate" title="${escapeHtml(pa.pageInfo.pageTitle)}">${escapeHtml(pa.pageInfo.pageTitle)}</span></div>
                        <div class="pa-row"><span class="pa-key">URL</span> <span class="pa-value pa-truncate" title="${escapeHtml(pa.pageInfo.pageUrl)}">${escapeHtml(pa.pageInfo.pageUrl)}</span></div>
                        <div class="pa-row"><span class="pa-key">Final URL</span> <span class="pa-value pa-truncate" title="${escapeHtml(pa.pageInfo.finalUrl)}">${escapeHtml(pa.pageInfo.finalUrl)}</span></div>
                    </div>
                `;
            }

            if (pa.infrastructure) {
                html += `
                    <div class="pa-section">
                        <div class="pa-label">NETWORK / INFRASTRUCTURE</div>
                        <div class="pa-row"><span class="pa-key">Country</span> <span class="pa-value">${escapeHtml(pa.infrastructure.country)}</span></div>
                        <div class="pa-row"><span class="pa-key">ASN</span> <span class="pa-value">${escapeHtml(pa.infrastructure.asn)}</span></div>
                        <div class="pa-row"><span class="pa-key">Server</span> <span class="pa-value">${escapeHtml(pa.infrastructure.server)}</span></div>
                    </div>
                `;
            }

            if (pa.pageInfo && (pa.pageInfo.httpStatus || pa.pageInfo.mimeType)) {
                 html += `
                    <div class="pa-section">
                        <div class="pa-label">HTTP INFORMATION</div>
                        <div class="pa-row"><span class="pa-key">Status</span> <span class="pa-value">${escapeHtml(pa.pageInfo.httpStatus)}</span></div>
                        <div class="pa-row"><span class="pa-key">Content Type</span> <span class="pa-value pa-truncate" title="${escapeHtml(pa.pageInfo.mimeType)}">${escapeHtml(pa.pageInfo.mimeType)}</span></div>
                    </div>
                `;
            }

            if (pa.redirects && pa.redirects.redirectCount > 0) {
                 html += `
                    <div class="pa-section">
                        <div class="pa-label">REDIRECTS</div>
                        <div class="pa-row"><span class="pa-key">Count</span> <span class="pa-value">${escapeHtml(pa.redirects.redirectCount)}</span></div>
                    </div>
                `;
            }

            if (pa.infrastructure && pa.infrastructure.technologies && pa.infrastructure.technologies.length > 0) {
                html += `
                    <div class="pa-section">
                        <div class="pa-label">TECHNOLOGIES</div>
                        <div class="pa-row"><span class="pa-key pa-key-no-margin"></span><span class="pa-value pa-truncate" title="${escapeHtml(pa.infrastructure.technologies.join(', '))}">${escapeHtml(pa.infrastructure.technologies.join(', '))}</span></div>
                    </div>
                `;
            }

            html += '</div>';
            paDetailsEl.innerHTML = html;
            paDetailsEl.style.display = 'block';
        }
    };

    const startPolling = (uuid: string, forUrl: string) => {
        if (currentPollTimeout) {
            clearTimeout(currentPollTimeout);
        }
        
        let errorCount = 0;
        const maxErrors = 3;

        const poll = async () => {
            if (currentScanUrl !== forUrl || currentPollUuid !== uuid) return;

            try {
                const updatedPa = await pollPageAnalysis(uuid);
                
                if (currentScanUrl !== forUrl || currentPollUuid !== uuid) return;
                
                errorCount = 0; // reset on success
                renderPageAnalysis(updatedPa);

                // Update storage to persist state without triggering another poll via updateUI
                chrome.storage.local.get(['lastScan'], (res: { lastScan?: ScanResult }) => {
                    if (res.lastScan && res.lastScan.url === forUrl) {
                        res.lastScan.pageAnalysis = updatedPa;
                        chrome.storage.local.set({ lastScan: res.lastScan });
                    }
                });

                if (updatedPa.status === 'submitting' || updatedPa.status === 'scanning') {
                    currentPollTimeout = window.setTimeout(poll, 2500);
                } else {
                    currentPollUuid = undefined; // Terminal state reached
                }
            } catch (err) {
                console.error("Polling error", err);
                errorCount++;
                if (errorCount >= maxErrors) {
                    renderPageAnalysis({ status: 'failed', uuid } as PageAnalysis);
                    currentPollUuid = undefined;
                } else {
                    currentPollTimeout = window.setTimeout(poll, 2500);
                }
            }
        };

        currentPollTimeout = window.setTimeout(poll, 2500);
    };

    const updateUI = (scan: ScanResult | undefined) => {
        if (!scan || !urlRepStatusEl || !scanUrlEl || !overallStatusTextEl || !overallStatusCardEl || !urlRepIconEl) {
            if (overallStatusTextEl && urlRepStatusEl && overallStatusCardEl && urlRepIconEl) {
                const unknownText = '? Unknown';
                urlRepStatusEl.textContent = unknownText;
                overallStatusTextEl.textContent = unknownText;
                urlRepIconEl.textContent = '?';
                overallStatusCardEl.className = 'overall-status-card card-unknown';
            }
            return;
        }

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
            const errorText = '✕ Scan failed';
            urlRepStatusEl.textContent = errorText;
            urlRepStatusEl.className = 'module-status status-error';
            urlRepIconEl.textContent = '✕';
            urlRepIconEl.className = 'module-icon icon-error';
            
            overallStatusTextEl.textContent = errorText;
            overallStatusCardEl.className = 'overall-status-card card-error';
        } else if (scan.status === 'UNKNOWN') {
            const unknownText = '? Unknown';
            urlRepStatusEl.textContent = unknownText;
            urlRepStatusEl.className = 'module-status status-unknown';
            urlRepIconEl.textContent = '?';
            urlRepIconEl.className = 'module-icon icon-unknown';
            
            overallStatusTextEl.textContent = unknownText;
            overallStatusCardEl.className = 'overall-status-card card-unknown';
        } else {
            const scanningText = 'Scanning...';
            urlRepStatusEl.textContent = scanningText;
            urlRepStatusEl.className = 'module-status status-scanning';
            urlRepIconEl.textContent = '⟳';
            urlRepIconEl.className = 'module-icon icon-scanning';
            
            overallStatusTextEl.textContent = scanningText;
            overallStatusCardEl.className = 'overall-status-card card-scanning';
        }

        // Page Analysis Logic
        if (scan.url !== currentScanUrl) {
            clearTimeout(currentPollTimeout);
            currentPollTimeout = undefined;
            currentScanUrl = scan.url;
            currentPollUuid = undefined;
        }

        renderPageAnalysis(scan.pageAnalysis);

        if (scan.pageAnalysis && scan.pageAnalysis.uuid && scan.pageAnalysis.uuid !== currentPollUuid && (scan.pageAnalysis.status === 'submitting' || scan.pageAnalysis.status === 'scanning')) {
            currentPollUuid = scan.pageAnalysis.uuid;
            startPolling(scan.pageAnalysis.uuid, scan.url);
        }
    };

    if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['lastScan'], (result: { lastScan?: ScanResult }) => {
            updateUI(result.lastScan);
        });

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes.lastScan && changes.lastScan.newValue) {
                updateUI(changes.lastScan.newValue as ScanResult);
            }
        });
    }
});
