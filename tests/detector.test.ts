import { describe, it, expect } from 'vitest';
import { InteractionDetector } from '../src/core/detector.js';
import type { DiscoveredElement, InteractionSignals } from '../src/core/types.js';

describe('InteractionDetector', () => {
  const baseElement: DiscoveredElement = {
    selector: '#test-btn',
    tagName: 'button',
    text: 'Click Me',
    isVisible: true,
    isDisabled: false,
    isDestructive: false,
    attributes: {}
  };

  const baseSignals: InteractionSignals = {
    urlChanged: false,
    initialUrl: 'http://localhost/',
    finalUrl: 'http://localhost/',
    hashChanged: false,
    domMutationsCount: 0,
    dialogAppeared: false,
    networkRequestsCount: 0,
    networkResponses: [],
    hasNetworkFailures: false,
    formSubmitted: false,
    stateChanged: false,
    consoleErrors: [],
    pageErrors: [],
    targetElementRemoved: false
  };

  it('should ignore disabled elements', () => {
    const disabledEl = { ...baseElement, isDisabled: true };
    const finding = InteractionDetector.classify(disabledEl, baseSignals, 'http://localhost/');
    expect(finding).toBeNull();
  });

  it('should classify DEAD_CLICK when button produces no observable signal', () => {
    const finding = InteractionDetector.classify(baseElement, baseSignals, 'http://localhost/');
    expect(finding).not.toBeNull();
    expect(finding?.category).toBe('DEAD_CLICK');
    expect(finding?.severity).toBe('high');
  });

  it('should return null if button produces DOM mutation', () => {
    const activeSignals = { ...baseSignals, domMutationsCount: 2 };
    const finding = InteractionDetector.classify(baseElement, activeSignals, 'http://localhost/');
    expect(finding).toBeNull();
  });

  it('should return null if button triggers a network request', () => {
    const networkSignals = { ...baseSignals, networkRequestsCount: 1 };
    const finding = InteractionDetector.classify(baseElement, networkSignals, 'http://localhost/');
    expect(finding).toBeNull();
  });

  it('should return null if button triggers a dialog', () => {
    const dialogSignals = { ...baseSignals, dialogAppeared: true };
    const finding = InteractionDetector.classify(baseElement, dialogSignals, 'http://localhost/');
    expect(finding).toBeNull();
  });

  it('should classify EMPTY_LINK for href="#" with no effect', () => {
    const anchorEl: DiscoveredElement = {
      ...baseElement,
      tagName: 'a',
      selector: '#empty-link',
      attributes: { href: '#' }
    };
    const finding = InteractionDetector.classify(anchorEl, baseSignals, 'http://localhost/');
    expect(finding).not.toBeNull();
    expect(finding?.category).toBe('EMPTY_LINK');
  });

  it('should classify BROKEN_LINK when navigation results in 404 or network failure', () => {
    const anchorEl: DiscoveredElement = {
      ...baseElement,
      tagName: 'a',
      selector: '#broken-link',
      attributes: { href: '/missing' }
    };
    const brokenSignals: InteractionSignals = {
      ...baseSignals,
      hasNetworkFailures: true,
      networkResponses: [{ url: 'http://localhost/missing', status: 404, ok: false }]
    };
    const finding = InteractionDetector.classify(anchorEl, brokenSignals, 'http://localhost/');
    expect(finding).not.toBeNull();
    expect(finding?.category).toBe('BROKEN_LINK');
  });

  it('should classify FORM_FAILURE when submit triggers errors', () => {
    const submitEl: DiscoveredElement = {
      ...baseElement,
      selector: '#submit-btn',
      type: 'submit',
      attributes: { type: 'submit' }
    };
    const errorSignals: InteractionSignals = {
      ...baseSignals,
      pageErrors: ['Uncaught Error in form handler']
    };
    const finding = InteractionDetector.classify(submitEl, errorSignals, 'http://localhost/');
    expect(finding).not.toBeNull();
    expect(finding?.category).toBe('FORM_FAILURE');
    expect(finding?.severity).toBe('critical');
  });

  it('should classify INCONCLUSIVE for destructive actions in safeMode', () => {
    const destructiveEl: DiscoveredElement = {
      ...baseElement,
      selector: '#del-btn',
      text: 'Delete Profile',
      isDestructive: true
    };
    const finding = InteractionDetector.classify(destructiveEl, baseSignals, 'http://localhost/', true);
    expect(finding).not.toBeNull();
    expect(finding?.category).toBe('INCONCLUSIVE');
  });
});

