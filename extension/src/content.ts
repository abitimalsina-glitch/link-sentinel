import { startHoverScanner } from './scanner.js';
import { ScanResult } from './types.js';

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
        .container {
            background: #111827;
            color: #e2e8f0;
            border: 1px solid #374151;
            border-radius: 6px;
            padding: 12px;
            font-family: Arial, sans-serif;
            font-size: 13px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            min-width: 150px;
        }
        .header { font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #374151; padding-bottom: 4px; }
        .safe { color: #10b981; }
        .malicious { color: #ef4444; }
        .error { color: #f59e0b; }
        .unknown { color: #94a3b8; }
        .checking { color: #3b82f6; }
        .row { margin: 4px 0; }
    `;
    
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

const renderTooltip = (state: "CHECKING" | "SAFE" | "MALICIOUS" | "UNKNOWN" | "ERROR", details?: ScanResult) => {
    if (!tooltipContent) return;
    
    tooltipContent.innerHTML = '';
    
    const header = document.createElement('div');
    header.className = 'header';
    header.textContent = 'Link-Sentinel';
    tooltipContent.appendChild(header);
    
    if (state === "CHECKING") {
        const row = document.createElement('div');
        row.className = 'row checking';
        row.textContent = '🔍 Scanning...';
        tooltipContent.appendChild(row);
        
        const row2 = document.createElement('div');
        row2.className = 'row';
        row2.textContent = currentHoveredUrl || '';
        tooltipContent.appendChild(row2);
    } else if (state === "SAFE") {
        const row1 = document.createElement('div');
        row1.className = 'row safe';
        row1.textContent = '✓ SAFE';
        tooltipContent.appendChild(row1);
        
        const row2 = document.createElement('div');
        row2.className = 'row';
        row2.textContent = 'No known threats detected';
        tooltipContent.appendChild(row2);
    } else if (state === "MALICIOUS") {
        const row1 = document.createElement('div');
        row1.className = 'row malicious';
        row1.textContent = '⚠️ MALICIOUS';
        tooltipContent.appendChild(row1);
        
        if (details && details.threats && details.threats.length > 0) {
            const row2 = document.createElement('div');
            row2.className = 'row';
            row2.textContent = `Type: ${details.threats[0]}`;
            tooltipContent.appendChild(row2);
        }
    } else if (state === "UNKNOWN") {
        const row1 = document.createElement('div');
        row1.className = 'row unknown';
        row1.textContent = '? UNKNOWN';
        tooltipContent.appendChild(row1);
    } else if (state === "ERROR") {
        const row1 = document.createElement('div');
        row1.className = 'row error';
        row1.textContent = '✕ ERROR';
        tooltipContent.appendChild(row1);
        
        const row2 = document.createElement('div');
        row2.className = 'row';
        row2.textContent = 'Unable to verify link';
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
                renderTooltip(result.status, result);
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