import type { DiscoveredElement, Finding, FindingCategory, FindingSeverity, InteractionSignals } from './types.js';

export class InteractionDetector {
  static classify(
    element: DiscoveredElement,
    signals: InteractionSignals,
    pageUrl: string,
    safeMode = false
  ): Finding | null {
    // If element is disabled, clicking it not doing anything is expected behavior
    if (element.isDisabled) {
      return null;
    }

    // If skipped because of safe mode
    if (safeMode && element.isDestructive) {
      return {
        id: `finding-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        pageUrl,
        selector: element.selector,
        elementText: element.text || element.accessibleName || 'Unnamed destructive element',
        category: 'INCONCLUSIVE',
        severity: 'low',
        evidence: 'Destructive interaction was skipped to protect application state in safe-mode.',
        suggestedFix: 'Review manually in an isolated staging or test environment.',
        metadata: { isDestructive: true, safeMode: true }
      };
    }

    const isAnchor = element.tagName === 'a';
    const isSubmit = element.type === 'submit' || (element.tagName === 'button' && (!element.type || element.type === 'submit'));
    const rawHref = element.attributes['href']?.trim() ?? '';
    const isPlaceholderHref = !rawHref || rawHref === '#' || rawHref.startsWith('javascript:');

    // 1. Broken Link check
    if (isAnchor && signals.hasNetworkFailures) {
      const failedResponse = signals.networkResponses.find((r) => r.status >= 400);
      return {
        id: `finding-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        pageUrl,
        selector: element.selector,
        elementText: element.text || element.accessibleName || rawHref || 'Broken Link',
        category: 'BROKEN_LINK',
        severity: failedResponse && failedResponse.status >= 500 ? 'critical' : 'high',
        evidence: `Link navigation failed with HTTP status ${failedResponse?.status ?? 'error'} for target: ${failedResponse?.url || rawHref}`,
        suggestedFix: 'Update the href attribute to a valid existing route or fix the destination server endpoint.',
        metadata: { href: rawHref, failedResponse }
      };
    }

    // 2. Empty Link check
    if (isAnchor && isPlaceholderHref) {
      const initialBase = signals.initialUrl.split('#')[0];
      const finalBase = signals.finalUrl.split('#')[0];
      const pageNavigated = initialBase !== finalBase;

      const hasRealEffect =
        pageNavigated ||
        signals.domMutationsCount > 0 ||
        signals.networkRequestsCount > 0 ||
        signals.dialogAppeared ||
        signals.stateChanged ||
        signals.targetElementRemoved;

      if (!hasRealEffect) {
        return {
          id: `finding-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          pageUrl,
          selector: element.selector,
          elementText: element.text || element.accessibleName || '(empty link)',
          category: 'EMPTY_LINK',
          severity: 'medium',
          evidence: `Anchor element has placeholder href="${rawHref}" and produced no DOM mutation, page navigation, or network activity upon click.`,
          suggestedFix: 'Provide a valid destination URL or replace the anchor with a semantic <button> with an attached event listener.',
          metadata: { href: rawHref }
        };
      }
    }

    // 3. Form Failure check
    if (isSubmit && (signals.pageErrors.length > 0 || signals.hasNetworkFailures)) {
      return {
        id: `finding-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        pageUrl,
        selector: element.selector,
        elementText: element.text || element.accessibleName || 'Submit',
        category: 'FORM_FAILURE',
        severity: 'critical',
        evidence: `Form submission triggered errors: ${signals.pageErrors.concat(signals.consoleErrors).slice(0, 3).join('; ') || 'Network error on form endpoint'}`,
        suggestedFix: 'Ensure form validation and submission handlers gracefully catch errors and communicate status to users.',
        metadata: { errors: signals.pageErrors }
      };
    }

    // 4. Observable Signals Summary
    const hasObservableEffect =
      signals.urlChanged ||
      signals.domMutationsCount > 0 ||
      signals.dialogAppeared ||
      signals.networkRequestsCount > 0 ||
      signals.formSubmitted ||
      signals.stateChanged ||
      signals.targetElementRemoved;

    if (hasObservableEffect) {
      // Something observable happened, so it's not a dead click.
      return null;
    }

    // 5. No observable effect occurred: differentiate Dead Click vs No Interaction Handler vs Inconclusive
    const isInteractiveRole = element.role === 'button' || element.role === 'link';
    const isButtonTag = element.tagName === 'button' || (element.tagName === 'input' && ['button', 'submit', 'reset'].includes(element.type || ''));

    if (isButtonTag || (isInteractiveRole && Boolean(element.attributes['onclick']))) {
      return {
        id: `finding-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        pageUrl,
        selector: element.selector,
        elementText: element.text || element.accessibleName || 'Button',
        category: 'DEAD_CLICK',
        severity: 'high',
        evidence: `Click on ${element.tagName} resulted in 0 DOM mutations, 0 network requests, no URL change, and no dialog appearance.`,
        suggestedFix: 'Attach a functional click handler, wire up an API call, or disable the button if the action is currently unavailable.',
        metadata: { tagName: element.tagName, role: element.role }
      };
    }

    if (isInteractiveRole || element.attributes['onclick']) {
      return {
        id: `finding-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        pageUrl,
        selector: element.selector,
        elementText: element.text || element.accessibleName || 'Interactive element',
        category: 'NO_INTERACTION_HANDLER',
        severity: 'medium',
        evidence: `Element declared with role="${element.role || ''}" produced no observable effect and lacks an operational event handler.`,
        suggestedFix: 'Ensure interactive roles have corresponding keyboard and click event listeners attached.',
        metadata: { role: element.role }
      };
    }

    // If it was an anchor with regular href that produced no effect (e.g. mailto, tel, or hash on same position)
    if (isAnchor && (rawHref.startsWith('mailto:') || rawHref.startsWith('tel:'))) {
      return null; // External protocol handler, not dead
    }

    return null;
  }
}
