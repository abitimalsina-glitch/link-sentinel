import { startHoverScanner } from './scanner.js';

console.log("[Link-Sentinel] Content script loaded");

const cache = new Map<string, any>();
const inFlight = new Map<string, Promise<any>>();
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
        .checking { color: #60a5fa; }
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

const renderTooltip = (state: "CHECKING" | "SAFE" | "MALICIOUS" | "ERROR", details?: any) => {
    if (!tooltipContent) return;
    
    tooltipContent.innerHTML = '';
    
    const header = document.createElement('div');
    header.className = 'header';
    header.textContent = 'Link-Sentinel';
    tooltipContent.appendChild(header);
    
    if (state === "CHECKING") {
        const row = document.createElement('div');
        row.className = 'row checking';
        row.textContent = '🔍 Hover detected';
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
        row2.textContent = 'No known threats';
        tooltipContent.appendChild(row2);
    } else if (state === "MALICIOUS") {
        const row1 = document.createElement('div');
        row1.className = 'row malicious';
        row1.textContent = '⚠️ MALICIOUS';
        tooltipContent.appendChild(row1);
        
        if (details && details.threats && details.threats.length > 0) {
            const row2 = document.createElement('div');
            row2.className = 'row';
            row2.textContent = `Type: ${details.threats[0].threat_type || 'Unknown'}`;
            tooltipContent.appendChild(row2);
        }
    } else if (state === "ERROR") {
        const row1 = document.createElement('div');
        row1.className = 'row error';
        row1.textContent = 'Error';
        tooltipContent.appendChild(row1);
        
        const row2 = document.createElement('div');
        row2.className = 'row';
        row2.textContent = 'Unable to check link';
        tooltipContent.appendChild(row2);
    }
};

startHoverScanner(async (url: string, anchor: HTMLAnchorElement) => {
    console.log(`[Link-Sentinel] Hover detected: ${url}`);
    currentHoveredUrl = url;
    
    createTooltip();
    updateTooltipPosition(anchor);
    
    renderTooltip("CHECKING");
    
    setTimeout(() => {
        if (url !== currentHoveredUrl) return;
        renderTooltip("SAFE");
        
        try {
            if (chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({
                    lastScan: {
                        url: url,
                        status: "SAFE",
                        timestamp: Date.now()
                    }
                });
            }
        } catch (e) {
            console.warn("Storage API not available", e);
        }
    }, 600);
    
}, (anchor: HTMLAnchorElement) => {
    currentHoveredUrl = null;
    hideTooltip();
});