import { isHttpUrl } from "./url";

type ScanCallback = (url: string, anchor: HTMLAnchorElement) => void;
type LeaveCallback = (anchor: HTMLAnchorElement) => void;

export const startHoverScanner = (onScan: ScanCallback, onLeave: LeaveCallback) => {
    let hoverTimeout: ReturnType<typeof setTimeout> | null = null;
    let currentAnchor: HTMLAnchorElement | null = null;

    document.addEventListener("mouseover", (event) => {
        const target = event.target as HTMLElement;
        const anchor = target.closest("a");

        if (!anchor) return;

        const url = anchor.href;
        if (!isHttpUrl(url)) return;

        if (currentAnchor === anchor) return;

        currentAnchor = anchor;
        
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
        }

        hoverTimeout = setTimeout(() => {
            if (currentAnchor === anchor) {
                onScan(url, anchor);
            }
        }, 300);
    });

    document.addEventListener("mouseout", (event) => {
        const target = event.target as HTMLElement;
        const anchor = target.closest("a");

        if (!anchor) return;

        const relatedTarget = event.relatedTarget as Node | null;
        if (relatedTarget && anchor.contains(relatedTarget)) {
            return;
        }

        if (currentAnchor === anchor) {
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
            }
            onLeave(anchor);
            currentAnchor = null;
        }
    });
};