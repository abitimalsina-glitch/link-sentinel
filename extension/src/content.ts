import { startHoverScanner } from './scanner.js';
import { ScanResult } from './types.js';

import { themeVariables } from './theme.js';

console.log("[Link-Sentinel] Content script loaded");

let currentHoveredUrl: string | null = null;
let tooltipElement: HTMLElement | null = null;
let tooltipContent: HTMLElement | null = null;

const createTooltip = () => {
    if (tooltipElement) return;

    tooltipElement = document.createElement('div');
    tooltipElement.id = 'link-sentinel-tooltip';
    tooltipElement.style.position = 'absolute';
    tooltipElement.style.display = 'none';
    tooltipElement.style.zIndex = '2147483647';
    tooltipElement.style.pointerEvents = 'none';
    
    const shadow = tooltipElement.attachShadow({ mode: 'open' });
    
    const style = document.createElement('style');
    style.textContent = `
        :host {
            ${themeVariables}
        }
        .container {
            background: var(--bg-card);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 12px 16px;
            font-family: var(--font-family);
            font-size: 13px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            min-width: 180px;
        }
        .header { 
            font-weight: 600; 
            margin-bottom: 8px; 
            border-bottom: 1px solid var(--border-color); 
            padding-bottom: 6px; 
            color: var(--text-secondary);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .safe { color: var(--color-safe); font-weight: 600; }
        .malicious { color: var(--color-threat); font-weight: 600; }
        .suspicious { color: var(--color-error); font-weight: 600; }
        .error { color: var(--color-unknown); font-weight: 600; }
        .unknown { color: var(--color-unknown); font-weight: 600; }
        .checking { color: var(--color-scanning); font-weight: 600; }
        .row { margin: 6px 0; }
        .url {
            color: var(--text-secondary);
            font-size: 11px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 250px;
            margin-top: 4px;
        }
        .detail {
            color: var(--text-secondary);
            font-size: 12px;
            margin-top: 4px;
        }
        .provider-grid {
            margin-top: 10px;
            border-top: 1px solid var(--border-color);
            padding-top: 8px;
            display: grid;
            grid-template-columns: 100px 1fr;
            gap: 4px 12px;
            font-size: 11px;
        }
        .provider-name {
            color: var(--text-secondary);
        }
        .provider-val {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            display: inline-block;
        }
        .dot-safe { background-color: var(--color-safe); }
        .dot-threat { background-color: var(--color-threat); }
        .dot-error { background-color: var(--color-error); }
        .dot-unknown { background-color: var(--color-unknown); }
        .dot-scanning { background-color: var(--color-scanning); }
    `
    
    tooltipContent = document.createElement('div');
    tooltipContent.className = 'container';
    
    shadow.appendChild(style);
    shadow.appendChild(tooltipContent);
    
    document.body.appendChild(tooltipElement);
};

const updateTooltipPosition = (anchor: HTMLAnchorElement) => {
    if (!tooltipElement) return;
    const rect = anchor.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    
    tooltipElement.style.top = `${rect.bottom + scrollTop + 8}px`;
    tooltipElement.style.left = `${rect.left + scrollLeft}px`;
    tooltipElement.style.display = 'block';
};

const hideTooltip = () => {
    if (tooltipElement) {
        tooltipElement.style.display = 'none';
    }
};

const renderTooltip = (state: "CHECKING" | "SAFE" | "SUSPICIOUS" | "MALICIOUS" | "UNKNOWN" | "ERROR" | "SCANNING", details?: ScanResult) => {
    if (!tooltipContent) return;
    
    tooltipContent.innerHTML = '';
    
    const header = document.createElement('div');
    header.className = 'header';
    header.textContent = 'LINK-SENTINEL';
    tooltipContent.appendChild(header);
    
    if (state === "CHECKING" || state === "SCANNING") {
        const row = document.createElement('div');
        row.className = 'row checking';
        row.textContent = 'SCANNING...';
        tooltipContent.appendChild(row);
        
        const row2 = document.createElement('div');
        row2.className = 'url';
        row2.textContent = currentHoveredUrl || '';
        tooltipContent.appendChild(row2);
    } else if (state === "SAFE") {
        const row1 = document.createElement('div');
        row1.className = 'row safe';
        row1.textContent = 'SAFE';
        tooltipContent.appendChild(row1);
        
        const row2 = document.createElement('div');
        row2.className = 'detail';
        row2.textContent = 'No threats detected by providers';
        tooltipContent.appendChild(row2);
    } else if (state === "SUSPICIOUS") {
        const row1 = document.createElement('div');
        row1.className = 'row suspicious';
        row1.textContent = 'SUSPICIOUS';
        tooltipContent.appendChild(row1);
    } else if (state === "MALICIOUS") {
        const row1 = document.createElement('div');
        row1.className = 'row malicious';
        row1.textContent = 'DANGEROUS';
        tooltipContent.appendChild(row1);
        
        if (details && details.threats && details.threats.length > 0) {
            const row2 = document.createElement('div');
            row2.className = 'detail';
            row2.textContent = `Type: ${details.threats.join(', ')}`;
            tooltipContent.appendChild(row2);
        }
    } else if (state === "UNKNOWN") {
        const row1 = document.createElement('div');
        row1.className = 'row unknown';
        row1.textContent = 'UNVERIFIED';
        tooltipContent.appendChild(row1);
    } else if (state === "ERROR") {
        const row1 = document.createElement('div');
        row1.className = 'row error';
        row1.textContent = 'ERROR';
        tooltipContent.appendChild(row1);
        
        const row2 = document.createElement('div');
        row2.className = 'detail';
        row2.textContent = 'Unable to complete scan';
        tooltipContent.appendChild(row2);
    }

    if (details && state !== "CHECKING" && state !== "SCANNING") {
        const grid = document.createElement('div');
        grid.className = 'provider-grid';
        
        const addProvider = (name: string, text: string, dotClass: string) => {
            const nameEl = document.createElement('div');
            nameEl.className = 'provider-name';
            nameEl.textContent = name;
            
            const valEl = document.createElement('div');
            valEl.className = 'provider-val';
            
            const dot = document.createElement('span');
            dot.className = `dot dot-${dotClass}`;
            
            const textEl = document.createElement('span');
            textEl.textContent = text;
            
            valEl.appendChild(dot);
            valEl.appendChild(textEl);
            
            grid.appendChild(nameEl);
            grid.appendChild(valEl);
        };
        
        // Safe Browsing
        let sbText = 'unavailable';
        let sbDot = 'unknown';
        if (details.status === 'SAFE') { sbText = 'clean'; sbDot = 'safe'; }
        else if (details.status === 'MALICIOUS') { sbText = 'detected'; sbDot = 'threat'; }
        else if (details.status === 'ERROR') { sbText = 'error'; sbDot = 'error'; }
        addProvider('Safe Browsing', sbText, sbDot);
        
        // URLScan
        let usText = 'unavailable';
        let usDot = 'unknown';
        if (details.pageAnalysis) {
            const pas = details.pageAnalysis.status;
            if (pas === 'complete') { usText = 'scanned'; usDot = 'safe'; }
            else if (pas === 'submitting' || pas === 'scanning') { usText = 'scanning'; usDot = 'scanning'; }
            else if (pas === 'failed' || pas === 'timeout' || pas === 'rate_limited') { usText = 'error'; usDot = 'error'; }
        }
        addProvider('URLScan', usText, usDot);
        
        // OTX
        let otxText = 'unavailable';
        let otxDot = 'unknown';
        if (details.domainAnalysis) {
            const das = details.domainAnalysis.status;
            if (das === 'SAFE') { otxText = 'clean'; otxDot = 'safe'; }
            else if (das === 'MALICIOUS' || das === 'SUSPICIOUS') { otxText = `${details.domainAnalysis.pulseCount || 0} hits`; otxDot = 'threat'; }
            else if (das === 'ERROR') { otxText = 'error'; otxDot = 'error'; }
        }
        addProvider('OTX', otxText, otxDot);
        
        // VirusTotal
        let vtText = 'unavailable';
        let vtDot = 'unknown';
        if (details.virusTotalAnalysis) {
            const vts = details.virusTotalAnalysis;
            if (vts.status === 'found') {
                const detected = (vts.malicious || 0) + (vts.suspicious || 0);
                const total = detected + (vts.harmless || 0) + (vts.undetected || 0);
                vtText = `${detected}/${total}`;
                vtDot = detected > 0 ? 'threat' : 'safe';
            } else if (vts.status === 'not_found') {
                vtText = 'no report';
                vtDot = 'unknown';
            } else if (vts.status === 'scanning') {
                vtText = 'scanning';
                vtDot = 'scanning';
            } else if (vts.status === 'rate_limited') {
                vtText = 'rate limited';
                vtDot = 'error';
            } else if (vts.status === 'error' || vts.status === 'unauthorized' || vts.status === 'forbidden') {
                vtText = 'error';
                vtDot = 'error';
            }
        }
        addProvider('VirusTotal', vtText, vtDot);
        
        tooltipContent.appendChild(grid);
    }
};

let isEnabled = false;

chrome.storage.local.get(['linkSentinelEnabled'], (result) => {
    if (result.linkSentinelEnabled !== undefined) {
        isEnabled = result.linkSentinelEnabled as boolean;
    } else {
        isEnabled = false;
    }
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.linkSentinelEnabled !== undefined) {
        isEnabled = changes.linkSentinelEnabled.newValue as boolean;
        if (!isEnabled) {
            hideTooltip();
            currentHoveredUrl = null;
        }
    }
});

startHoverScanner((url: string, anchor: HTMLAnchorElement) => {
    console.log(`[Link-Sentinel] Hover detected: ${url}`);
    currentHoveredUrl = url;
    
    createTooltip();
    updateTooltipPosition(anchor);
    
    renderTooltip("CHECKING");
    
    try {
        chrome.runtime.sendMessage({ type: "SCAN_URL", url }, (response) => {
            // Check for chrome.runtime.lastError to handle background worker issues
            if (chrome.runtime.lastError) {
                console.error("[Link-Sentinel] Message passing error:", chrome.runtime.lastError);
                if (url === currentHoveredUrl) {
                    renderTooltip("ERROR");
                }
                return;
            }

            // Ensure the user hasn't moved their mouse to a different URL
            if (url !== currentHoveredUrl) return;

            if (response && response.result) {
                const result = response.result as ScanResult;
                const verdict = result.status;
                renderTooltip(verdict, result);
            } else {
                renderTooltip("ERROR");
            }
        });
    } catch (e) {
        console.error("[Link-Sentinel] Failed to send message", e);
        if (url === currentHoveredUrl) {
            renderTooltip("ERROR");
        }
    }
    
}, (anchor: HTMLAnchorElement) => {
    currentHoveredUrl = null;
    hideTooltip();
}, () => isEnabled);