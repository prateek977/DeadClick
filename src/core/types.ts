export type FindingCategory =
  | 'DEAD_CLICK'
  | 'BROKEN_LINK'
  | 'EMPTY_LINK'
  | 'NO_INTERACTION_HANDLER'
  | 'FORM_FAILURE'
  | 'INCONCLUSIVE';

export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Finding {
  id: string;
  pageUrl: string;
  selector: string;
  elementText: string;
  category: FindingCategory;
  severity: FindingSeverity;
  evidence: string;
  suggestedFix: string;
  metadata?: Record<string, unknown>;
}

export interface DiscoveredElement {
  selector: string;
  tagName: string;
  role?: string;
  type?: string;
  href?: string;
  text: string;
  accessibleName?: string;
  isVisible: boolean;
  isDisabled: boolean;
  isDestructive: boolean;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  attributes: Record<string, string>;
}

export interface InteractionSignals {
  urlChanged: boolean;
  initialUrl: string;
  finalUrl: string;
  hashChanged: boolean;
  domMutationsCount: number;
  dialogAppeared: boolean;
  dialogMessage?: string;
  dialogType?: string;
  networkRequestsCount: number;
  networkResponses: Array<{
    url: string;
    status: number;
    ok: boolean;
  }>;
  hasNetworkFailures: boolean;
  formSubmitted: boolean;
  stateChanged: boolean;
  consoleErrors: string[];
  pageErrors: string[];
  targetElementRemoved: boolean;
}

export interface ScannerOptions {
  url: string;
  maxPages?: number;
  timeout?: number;
  exclude?: string[];
  safeMode?: boolean;
  headless?: boolean;
  format?: ('terminal' | 'json' | 'html')[];
  outputPath?: string;
  viewport?: { width: number; height: number };
  concurrency?: number;
  verbose?: boolean;
}

export interface ScanSummary {
  totalPagesScanned: number;
  totalElementsDiscovered: number;
  totalElementsTested: number;
  findingsCount: Record<FindingCategory, number>;
  durationMs: number;
  startTime: string;
  endTime: string;
}

export interface ScanResult {
  url: string;
  summary: ScanSummary;
  findings: Finding[];
  scannedPages: string[];
  errors: Array<{ pageUrl: string; error: string }>;
}

