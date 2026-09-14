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
};

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
                const verdict = result.verdict || result.status;
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
});