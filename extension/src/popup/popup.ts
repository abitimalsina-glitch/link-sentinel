import { pollPageAnalysis } from '../api.js';
import { PageAnalysis, ScanResult } from '../types.js';

let currentPollTimeout: number | undefined;
let currentScanUrl: string | undefined;
let currentPollUuid: string | undefined;

document.addEventListener('DOMContentLoaded', () => {
    const urlRepStatusEl = document.getElementById('url-rep-status');
    const urlRepIconEl = document.getElementById('url-rep-icon');
    const urlRepCardEl = document.getElementById('url-rep-card');
    const urlRepExplanationEl = document.getElementById('url-rep-explanation');

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
            paStatusEl.textContent = 'NOT ANALYZED';
            paStatusEl.className = 'module-status status-unknown';
            paCardEl.className = 'module-card card-unknown inactive';
            const expEl = document.getElementById('page-analysis-explanation');
            if (expEl) expEl.textContent = 'Feature not analyzed yet';
            return;
        }

        if (pa.status === 'submitting' || pa.status === 'scanning') {
            paIconEl.textContent = '⟳';
            paIconEl.className = 'module-icon icon-scanning';
            paStatusEl.textContent = 'SCANNING';
            paStatusEl.className = 'module-status status-scanning';
            paCardEl.className = 'module-card card-scanning';
            const expEl = document.getElementById('page-analysis-explanation');
            if (expEl) expEl.textContent = 'Analysis in progress';
            return;
        }

        if (pa.status === 'failed' || pa.status === 'timeout' || pa.status === 'rate_limited') {
            paIconEl.textContent = '✕';
            paIconEl.className = 'module-icon icon-error';
            paStatusEl.textContent = 'ERROR';
            paStatusEl.className = 'module-status status-error';
            paCardEl.className = 'module-card card-error';
            const expEl = document.getElementById('page-analysis-explanation');
            if (expEl) expEl.textContent = 'Analysis failed or timed out';
            return;
        }

        if (pa.status === 'complete') {
            paIconEl.textContent = '✓';
            paIconEl.className = 'module-icon icon-safe';
            paStatusEl.textContent = 'ANALYZED';
            paStatusEl.className = 'module-status status-safe';
            paCardEl.className = 'module-card card-safe';
            const expEl = document.getElementById('page-analysis-explanation');
            if (expEl) expEl.textContent = 'Page analysis completed';

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
        if (!urlRepStatusEl || !urlRepIconEl || !urlRepCardEl || !urlRepExplanationEl) return;

        if (!scan) {
            urlRepStatusEl.textContent = 'NOT ANALYZED';
            urlRepStatusEl.className = 'module-status status-unknown';
            urlRepIconEl.textContent = '○';
            urlRepIconEl.className = 'module-icon icon-unknown';
            urlRepCardEl.className = 'module-card card-unknown inactive';
            urlRepExplanationEl.textContent = 'No URL scanned';
            return;
        }

        if (scan.status === 'SAFE') {
            urlRepStatusEl.textContent = 'SAFE';
            urlRepStatusEl.className = 'module-status status-safe';
            urlRepIconEl.textContent = '✓';
            urlRepIconEl.className = 'module-icon icon-safe';
            urlRepCardEl.className = 'module-card card-safe';
            urlRepExplanationEl.textContent = 'No known threats detected';
        } else if (scan.status === 'MALICIOUS') {
            urlRepStatusEl.textContent = 'UNSAFE';
            urlRepStatusEl.className = 'module-status status-threat';
            urlRepIconEl.textContent = '⚠';
            urlRepIconEl.className = 'module-icon icon-threat';
            urlRepCardEl.className = 'module-card card-threat';

            const threatsStr = (scan.threats && scan.threats.length > 0) ? scan.threats.join(', ') : 'Threat detected';
            urlRepExplanationEl.textContent = threatsStr;
        } else if (scan.status === 'ERROR') {
            urlRepStatusEl.textContent = 'ERROR';
            urlRepStatusEl.className = 'module-status status-error';
            urlRepIconEl.textContent = '✕';
            urlRepIconEl.className = 'module-icon icon-error';
            urlRepCardEl.className = 'module-card card-error';
            urlRepExplanationEl.textContent = 'Scan failed';
        } else if (scan.status === 'UNKNOWN') {
            urlRepStatusEl.textContent = 'UNKNOWN';
            urlRepStatusEl.className = 'module-status status-unknown';
            urlRepIconEl.textContent = '?';
            urlRepIconEl.className = 'module-icon icon-unknown';
            urlRepCardEl.className = 'module-card card-unknown';
            urlRepExplanationEl.textContent = 'No definitive result';
        } else {
            urlRepStatusEl.textContent = 'SCANNING';
            urlRepStatusEl.className = 'module-status status-scanning';
            urlRepIconEl.textContent = '⟳';
            urlRepIconEl.className = 'module-icon icon-scanning';
            urlRepCardEl.className = 'module-card card-scanning';
            urlRepExplanationEl.textContent = 'Checking URL...';
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
