import { isHttpUrl } from "./url";

type ScanCallback = (url: string, anchor: HTMLAnchorElement) => void;
type LeaveCallback = (anchor: HTMLAnchorElement) => void;

export const startHoverScanner = (onScan: ScanCallback, onLeave: LeaveCallback, isEnabled: () => boolean = () => true) => {
    let hoverTimeout: ReturnType<typeof setTimeout> | null = null;
    let currentAnchor: HTMLAnchorElement | null = null;

    document.addEventListener("mouseover", (event) => {
        if (!isEnabled()) return;

        const path = event.composedPath();
        const anchor = path.find((node: any) => node.tagName && node.tagName.toLowerCase() === 'a') as HTMLAnchorElement | undefined;

        if (!anchor) return;

        const url = anchor.href;
        if (!isHttpUrl(url)) return;

        if (currentAnchor === anchor) return;

        currentAnchor = anchor;
        
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
        }

        hoverTimeout = setTimeout(() => {
            if (!isEnabled()) return;
            if (currentAnchor === anchor) {
                onScan(url, anchor);
            }
        }, 300);
    });

    document.addEventListener("mouseout", (event) => {
        if (!isEnabled()) return;

        const path = event.composedPath();
        const anchor = path.find((node: any) => node.tagName && node.tagName.toLowerCase() === 'a') as HTMLAnchorElement | undefined;

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