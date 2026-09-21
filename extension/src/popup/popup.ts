import { PageAnalysis, ScanResult, DomainAnalysis } from '../types.js';

let currentScanUrl: string | undefined;

const ICONS = {
    safe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>`,
    threat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    scanning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>`,
    unknown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    analyzed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
};

document.addEventListener('DOMContentLoaded', () => {
    // Top Level
    const emptyStateEl = document.getElementById('empty-state');
    const scanContentEl = document.getElementById('scan-content');
    
    // Overall
    const overallCardEl = document.getElementById('overall-status-card');
    const overallValueEl = document.getElementById('overall-value');

    // Modules
    const urlRepIconEl = document.getElementById('url-rep-icon');
    const urlRepStatusEl = document.getElementById('url-rep-status');

    const domainRowEl = document.getElementById('domain-row');
    const domainIconEl = document.getElementById('domain-icon');
    const domainStatusEl = document.getElementById('domain-status');
    const domainSourceEl = document.getElementById('domain-source');

    const paRowEl = document.getElementById('pa-row');
    const paIconEl = document.getElementById('pa-icon');
    const paStatusEl = document.getElementById('pa-status');
    
    const vtRowEl = document.getElementById('vt-row');
    const vtIconEl = document.getElementById('vt-icon');
    const vtStatusEl = document.getElementById('vt-status');

    // Details
    const detailsSectionEl = document.getElementById('details-section');
    const detailsToggleEl = document.getElementById('details-toggle');
    const detailsContentEl = document.getElementById('details-content');
    const domainDetailsEl = document.getElementById('domain-details');
    const paDetailsEl = document.getElementById('page-analysis-details');
    const vtDetailsEl = document.getElementById('vt-details');

    if (detailsToggleEl && detailsSectionEl && detailsContentEl) {
        detailsToggleEl.addEventListener('click', () => {
            const isOpen = detailsSectionEl.classList.contains('open');
            if (isOpen) {
                detailsSectionEl.classList.remove('open');
                detailsContentEl.style.display = 'none';
            } else {
                detailsSectionEl.classList.add('open');
                detailsContentEl.style.display = 'block';
            }
        });
    }

    const enableToggleEl = document.getElementById('enable-toggle') as HTMLInputElement | null;

    if (enableToggleEl && chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['linkSentinelEnabled'], (result) => {
            if (result.linkSentinelEnabled !== undefined) {
                enableToggleEl.checked = result.linkSentinelEnabled as boolean;
            } else {
                enableToggleEl.checked = true; // default to ON
            }
        });

        enableToggleEl.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            chrome.storage.local.set({ linkSentinelEnabled: target.checked });
            
            if (!target.checked) {
                // When disabled, revert to empty state
                updateUI(undefined);
            } else {
                // When enabled, fetch last scan if any
                chrome.storage.local.get('lastScan', (data) => {
                    if (data && data.lastScan) {
                        updateUI(data.lastScan as ScanResult);
                    }
                });
            }
        });

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes.linkSentinelEnabled !== undefined) {
                if (enableToggleEl.checked !== (changes.linkSentinelEnabled.newValue as boolean)) {
                    enableToggleEl.checked = changes.linkSentinelEnabled.newValue as boolean;
                }
            }
        });
    }

    const escapeHtml = (str: string | number | boolean | undefined | null): string => {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    };

    const updateOverallStatus = (scan: ScanResult) => {
        if (!overallCardEl || !overallValueEl) return;
        
        overallCardEl.className = 'overall-status-card';
        
        const verdict = scan.verdict || "UNKNOWN";
        
        if (verdict === 'MALICIOUS') {
            overallValueEl.textContent = 'DANGEROUS';
            overallCardEl.classList.add('card-threat');
        } else if (verdict === 'SUSPICIOUS') {
            overallValueEl.textContent = 'SUSPICIOUS';
            overallCardEl.classList.add('card-error'); 
        } else if (verdict === 'SCANNING') {
            overallValueEl.textContent = 'SCANNING...';
            overallCardEl.classList.add('card-scanning');
        } else if (verdict === 'ERROR') {
            overallValueEl.textContent = 'ERROR / INCOMPLETE';
            overallCardEl.classList.add('card-unknown');
        } else if (verdict === 'UNKNOWN') {
            overallValueEl.textContent = 'UNVERIFIED';
            overallCardEl.classList.add('card-unknown');
        } else {
            overallValueEl.textContent = 'SAFE';
            overallCardEl.classList.add('card-safe');
        }
    };

    const renderDomainAnalysis = (da: DomainAnalysis | undefined) => {
        if (!domainRowEl || !domainIconEl || !domainStatusEl || !domainDetailsEl || !detailsSectionEl) return;

        domainRowEl.classList.remove('inactive');
        domainDetailsEl.innerHTML = '';
        domainDetailsEl.style.display = 'none';

        if (!da || da.status === 'UNKNOWN') {
            domainIconEl.innerHTML = ICONS.unknown;
            domainIconEl.className = 'provider-icon icon-unknown';
            domainStatusEl.textContent = 'NO DATA';
            domainStatusEl.className = 'provider-status status-unknown';
            if (domainSourceEl) domainSourceEl.textContent = 'AlienVault OTX';
            return;
        }

        if (da.status === 'ERROR') {
            domainIconEl.innerHTML = ICONS.error;
            domainIconEl.className = 'provider-icon icon-error';
            domainStatusEl.textContent = 'ERROR';
            domainStatusEl.className = 'provider-status status-error';
            return;
        }

        if (da.status === 'MALICIOUS' || da.status === 'SUSPICIOUS') {
            const isMalicious = da.status === 'MALICIOUS';
            domainIconEl.innerHTML = ICONS.threat;
            domainIconEl.className = `provider-icon ${isMalicious ? 'icon-threat' : 'icon-error'}`;
            domainStatusEl.textContent = da.status;
            domainStatusEl.className = `provider-status ${isMalicious ? 'status-threat' : 'status-error'}`;
            
            if (domainSourceEl) {
                domainSourceEl.textContent = `Found in ${da.pulseCount} OTX pulse${da.pulseCount === 1 ? '' : 's'}`;
            }

            if (da.relatedMalware && da.relatedMalware.length > 0) {
                detailsSectionEl.style.display = 'block';
                domainDetailsEl.style.display = 'block';
                domainDetailsEl.innerHTML = `
                    <div class="pa-section">
                        <div class="pa-label">OTX THREAT INTELLIGENCE</div>
                        <div class="pa-row"><span class="pa-key">Related Malware</span></div>
                        <div class="pa-row"><span class="pa-value pa-truncate" style="text-align: left;" title="${escapeHtml(da.relatedMalware.join(', '))}">${escapeHtml(da.relatedMalware.join(', '))}</span></div>
                    </div>
                `;
            }
            return;
        }

        domainIconEl.innerHTML = ICONS.safe;
        domainIconEl.className = 'provider-icon icon-safe';
        domainStatusEl.textContent = 'SAFE';
        domainStatusEl.className = 'provider-status status-safe';
    };

    const renderPageAnalysis = (pa: PageAnalysis | undefined) => {
        if (!paRowEl || !paIconEl || !paStatusEl || !paDetailsEl || !detailsSectionEl) return;

        paDetailsEl.innerHTML = '';
        paDetailsEl.style.display = 'none';
        paRowEl.classList.remove('inactive');

        if (!pa || pa.status === 'not_analyzed') {
            paIconEl.innerHTML = ICONS.unknown;
            paIconEl.className = 'provider-icon icon-unknown';
            paStatusEl.textContent = 'AWAITING';
            paStatusEl.className = 'provider-status status-unknown';
            return;
        }

        if (pa.status === 'submitting' || pa.status === 'scanning') {
            paIconEl.innerHTML = ICONS.scanning;
            paIconEl.className = 'provider-icon icon-scanning';
            paStatusEl.textContent = 'SCANNING';
            paStatusEl.className = 'provider-status status-scanning';
            return;
        }

        if (pa.status === 'failed' || pa.status === 'timeout' || pa.status === 'rate_limited') {
            paIconEl.innerHTML = ICONS.error;
            paIconEl.className = 'provider-icon icon-error';
            paStatusEl.textContent = 'ERROR';
            paStatusEl.className = 'provider-status status-error';
            return;
        }

        if (pa.status === 'complete') {
            paIconEl.innerHTML = ICONS.analyzed;
            paIconEl.className = 'provider-icon icon-analyzed';
            paStatusEl.textContent = 'ANALYZED';
            paStatusEl.className = 'provider-status status-analyzed';
            
            detailsSectionEl.style.display = 'block';
            paDetailsEl.style.display = 'block';

            let html = '<div class="pa-results">';

            if (pa.pageInfo) {
                html += `
                    <div class="pa-section">
                        <div class="pa-label">PAGE (URLSCAN)</div>
                        <div class="pa-row"><span class="pa-key">Title</span> <span class="pa-value pa-truncate" title="${escapeHtml(pa.pageInfo.pageTitle)}">${escapeHtml(pa.pageInfo.pageTitle)}</span></div>
                        <div class="pa-row"><span class="pa-key">Final URL</span> <span class="pa-value pa-truncate" title="${escapeHtml(pa.pageInfo.finalUrl)}">${escapeHtml(pa.pageInfo.finalUrl)}</span></div>
                    </div>
                `;
            }

            if (pa.infrastructure) {
                html += `
                    <div class="pa-section">
                        <div class="pa-label">INFRASTRUCTURE</div>
                        <div class="pa-row"><span class="pa-key">Country</span> <span class="pa-value">${escapeHtml(pa.infrastructure.country)}</span></div>
                        <div class="pa-row"><span class="pa-key">ASN</span> <span class="pa-value">${escapeHtml(pa.infrastructure.asn)}</span></div>
                    </div>
                `;
            }

            html += '</div>';
            paDetailsEl.innerHTML = html;
        }
    };

    const renderVirusTotalAnalysis = (vt: any) => {
        if (!vtRowEl || !vtIconEl || !vtStatusEl || !vtDetailsEl || !detailsSectionEl) return;

        vtDetailsEl.innerHTML = '';
        vtDetailsEl.style.display = 'none';
        vtRowEl.classList.remove('inactive');

        if (!vt || vt.status === 'not_found') {
            vtIconEl.innerHTML = ICONS.unknown;
            vtIconEl.className = 'provider-icon icon-unknown';
            vtStatusEl.textContent = 'NOT FOUND';
            vtStatusEl.className = 'provider-status status-unknown';
            return;
        }

        if (vt.status === 'scanning') {
            vtIconEl.innerHTML = ICONS.scanning;
            vtIconEl.className = 'provider-icon icon-scanning';
            vtStatusEl.textContent = 'SCANNING';
            vtStatusEl.className = 'provider-status status-scanning';
            return;
        }

        if (vt.status === 'rate_limited') {
            vtIconEl.innerHTML = ICONS.error;
            vtIconEl.className = 'provider-icon icon-error';
            vtStatusEl.textContent = 'UNAVAILABLE';
            vtStatusEl.className = 'provider-status status-error';
            return;
        }

        if (vt.status === 'error' || vt.status === 'unauthorized' || vt.status === 'forbidden') {
            vtIconEl.innerHTML = ICONS.error;
            vtIconEl.className = 'provider-icon icon-error';
            vtStatusEl.textContent = 'ERROR';
            vtStatusEl.className = 'provider-status status-error';
            return;
        }

        if (vt.status === 'found') {
            const hasThreats = (vt.malicious && vt.malicious > 0) || (vt.suspicious && vt.suspicious > 0);
            
            vtIconEl.innerHTML = hasThreats ? ICONS.threat : ICONS.safe;
            vtIconEl.className = `provider-icon ${hasThreats ? 'icon-threat' : 'icon-safe'}`;
            vtStatusEl.textContent = hasThreats ? 'THREATS DETECTED' : '0 DETECTIONS';
            vtStatusEl.className = `provider-status ${hasThreats ? 'status-threat' : 'status-safe'}`;
            
            detailsSectionEl.style.display = 'block';
            vtDetailsEl.style.display = 'block';

            let html = '<div class="pa-results">';
            html += `
                <div class="pa-section">
                    <div class="pa-label">VIRUSTOTAL STATISTICS</div>
                    <div class="pa-row"><span class="pa-key">Malicious</span> <span class="pa-value">${escapeHtml(vt.malicious)}</span></div>
                    <div class="pa-row"><span class="pa-key">Suspicious</span> <span class="pa-value">${escapeHtml(vt.suspicious)}</span></div>
                    <div class="pa-row"><span class="pa-key">Harmless</span> <span class="pa-value">${escapeHtml(vt.harmless)}</span></div>
                    <div class="pa-row"><span class="pa-key">Undetected</span> <span class="pa-value">${escapeHtml(vt.undetected)}</span></div>
                </div>
            `;
            html += '</div>';
            vtDetailsEl.innerHTML = html;
        }
    };

    const updateUI = (scan: ScanResult | undefined) => {
        if (!urlRepStatusEl || !urlRepIconEl || !emptyStateEl || !scanContentEl || !detailsSectionEl) return;

        if (!scan) {
            emptyStateEl.style.display = 'flex';
            scanContentEl.style.display = 'none';
            return;
        }
        
        emptyStateEl.style.display = 'none';
        scanContentEl.style.display = 'block';
        
        detailsSectionEl.style.display = 'none';

        if (scan.status === 'SAFE') {
            urlRepStatusEl.textContent = 'SAFE';
            urlRepStatusEl.className = 'provider-status status-safe';
            urlRepIconEl.innerHTML = ICONS.safe;
            urlRepIconEl.className = 'provider-icon icon-safe';
        } else if (scan.status === 'MALICIOUS') {
            urlRepStatusEl.textContent = 'UNSAFE';
            urlRepStatusEl.className = 'provider-status status-threat';
            urlRepIconEl.innerHTML = ICONS.threat;
            urlRepIconEl.className = 'provider-icon icon-threat';
        } else if (scan.status === 'ERROR') {
            urlRepStatusEl.textContent = 'ERROR';
            urlRepStatusEl.className = 'provider-status status-error';
            urlRepIconEl.innerHTML = ICONS.error;
            urlRepIconEl.className = 'provider-icon icon-error';
        } else if (scan.status === 'UNKNOWN') {
            urlRepStatusEl.textContent = 'UNKNOWN';
            urlRepStatusEl.className = 'provider-status status-unknown';
            urlRepIconEl.innerHTML = ICONS.unknown;
            urlRepIconEl.className = 'provider-icon icon-unknown';
        } else {
            urlRepStatusEl.textContent = 'SCANNING';
            urlRepStatusEl.className = 'provider-status status-scanning';
            urlRepIconEl.innerHTML = ICONS.scanning;
            urlRepIconEl.className = 'provider-icon icon-scanning';
        }

        renderDomainAnalysis(scan.domainAnalysis);
        
        if (scan.url !== currentScanUrl) {
            currentScanUrl = scan.url;
        }

        renderPageAnalysis(scan.pageAnalysis);
        renderVirusTotalAnalysis(scan.virusTotalAnalysis);
        updateOverallStatus(scan);
    };

    if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('lastScan', (data) => {
            if (data && data.lastScan) {
                const scan = data.lastScan as ScanResult;
                currentScanUrl = scan.url;
                updateUI(scan);
            } else {
                updateUI(undefined);
            }
        });
    }

    if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes.lastScan && changes.lastScan.newValue) {
                const updatedScan = changes.lastScan.newValue as ScanResult;
                if (updatedScan.url === currentScanUrl) {
                    updateUI(updatedScan);
                }
            }
        });
    }
});
