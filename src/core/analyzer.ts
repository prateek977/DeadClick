import type { Page } from 'playwright';
import type { DiscoveredElement, InteractionSignals } from './types.js';

const DESTRUCTIVE_KEYWORDS = [
  'delete',
  'remove',
  'destroy',
  'purge',
  'erase',
  'logout',
  'sign out',
  'signout',
  'log off',
  'logoff',
  'drop',
  'terminate',
  'cancel account',
  'deactivate'
];

export class InteractionAnalyzer {
  static isDestructiveElement(text: string, attributes: Record<string, string>): boolean {
    const combined = [
      text,
      attributes.id ?? '',
      attributes.class ?? '',
      attributes.name ?? '',
      attributes['aria-label'] ?? '',
      attributes.title ?? ''
    ].join(' ').toLowerCase();

    return DESTRUCTIVE_KEYWORDS.some((kw) => combined.includes(kw));
  }

  static async discoverElements(page: Page, exclusions: string[] = []): Promise<DiscoveredElement[]> {
    return page.evaluate((customExclusions: string[]) => {
      const candidates = Array.from(
        document.querySelectorAll(
          'button, a, input[type="button"], input[type="submit"], input[type="reset"], [role="button"], [role="link"], [onclick]'
        )
      );

      const isExcluded = (el: Element): boolean => {
        for (const pattern of customExclusions) {
          try {
            if (el.matches(pattern)) return true;
          } catch {
            // Invalid selector syntax, skip
          }
        }
        return false;
      };

      const getCssSelector = (el: Element): string => {
        if (el.id) {
          return `#${CSS.escape(el.id)}`;
        }
        const path: string[] = [];
        let curr: Element | null = el;
        while (curr && curr.nodeType === Node.ELEMENT_NODE && curr !== document.documentElement) {
          let selector = curr.nodeName.toLowerCase();
          if (curr.id) {
            selector = `#${CSS.escape(curr.id)}`;
            path.unshift(selector);
            break;
          }
          let siblingIndex = 1;
          let sibling = curr.previousElementSibling;
          while (sibling) {
            if (sibling.nodeName.toLowerCase() === selector) {
              siblingIndex++;
            }
            sibling = sibling.previousElementSibling;
          }
          selector += `:nth-of-type(${siblingIndex})`;
          path.unshift(selector);
          curr = curr.parentElement;
        }
        return path.join(' > ');
      };

      const discovered: DiscoveredElement[] = [];

      for (const el of candidates) {
        if (isExcluded(el)) continue;

        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const isVisible =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          rect.width > 0 &&
          rect.height > 0;

        const isDisabled =
          el.hasAttribute('disabled') ||
          el.getAttribute('aria-disabled') === 'true' ||
          el.classList.contains('disabled');

        const rawAttrs: Record<string, string> = {};
        for (const attr of Array.from(el.attributes)) {
          rawAttrs[attr.name] = attr.value;
        }

        const text = (el.textContent || '').trim();
        const accessibleName =
          el.getAttribute('aria-label') ||
          el.getAttribute('title') ||
          el.getAttribute('alt') ||
          text;

        const tagName = el.tagName.toLowerCase();
        const role = el.getAttribute('role') || undefined;
        const type = el.getAttribute('type') || undefined;
        const href = el instanceof HTMLAnchorElement ? el.href : el.getAttribute('href') || undefined;

        discovered.push({
          selector: getCssSelector(el),
          tagName,
          role,
          type,
          href,
          text,
          accessibleName,
          isVisible,
          isDisabled,
          isDestructive: false,
          boundingBox: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          },
          attributes: rawAttrs
        });
      }

      return discovered;
    }, exclusions).then((elements) => {
      return elements.map((item) => ({
        ...item,
        isDestructive: InteractionAnalyzer.isDestructiveElement(item.text, item.attributes)
      }));
    });
  }

  static async testInteraction(page: Page, element: DiscoveredElement, settleTimeoutMs = 700): Promise<InteractionSignals> {
    const initialUrl = page.url();
    const networkResponses: Array<{ url: string; status: number; ok: boolean }> = [];
    let networkRequestsCount = 0;
    let hasNetworkFailures = false;
    let dialogAppeared = false;
    let dialogMessage: string | undefined;
    let dialogType: string | undefined;
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    const onDialog = async (dialog: any) => {
      dialogAppeared = true;
      dialogMessage = dialog.message();
      dialogType = dialog.type();
      try {
        await dialog.dismiss();
      } catch {
        // Ignored
      }
    };

    const onRequest = () => {
      networkRequestsCount++;
    };

    const onResponse = (response: any) => {
      const status = response.status();
      const ok = response.ok();
      networkResponses.push({
        url: response.url(),
        status,
        ok
      });
      if (status >= 400) {
        hasNetworkFailures = true;
      }
    };

    const onPageError = (err: Error) => {
      pageErrors.push(err.message);
    };

    const onConsole = (msg: any) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    };

    page.on('dialog', onDialog);
    page.on('request', onRequest);
    page.on('response', onResponse);
    page.on('pageerror', onPageError);
    page.on('console', onConsole);

    try {
      // Set up in-page mutation and submit tracking
      await page.evaluate((selector) => {
        (window as any).__deadclick_mutations = 0;
        (window as any).__deadclick_form_submitted = false;
        (window as any).__deadclick_state_changed = false;

        const target = document.querySelector(selector);
        if (target) {
          const initialAttrs = target.getAttributeNames().reduce((acc, name) => {
            acc[name] = target.getAttribute(name);
            return acc;
          }, {} as Record<string, string | null>);
          (window as any).__deadclick_target_attrs = initialAttrs;
        }

        const observer = new MutationObserver((mutations) => {
          (window as any).__deadclick_mutations += mutations.length;
          if (target) {
            for (const m of mutations) {
              if (m.type === 'attributes') {
                (window as any).__deadclick_state_changed = true;
              }
            }
          }
        });

        observer.observe(document.body || document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true
        });

        (window as any).__deadclick_observer = observer;

        const submitHandler = () => {
          (window as any).__deadclick_form_submitted = true;
        };
        window.addEventListener('submit', submitHandler, { capture: true, once: true });
      }, element.selector).catch(() => {});

      // Execute click with a short timeout to prevent hanging on sticky dialogs or unresponsive elements
      let clickSucceeded = false;
      try {
        const locator = page.locator(element.selector).first();
        await locator.click({ timeout: 2500, force: false });
        clickSucceeded = true;
      } catch (err: any) {
        // If regular click failed (e.g. timeout or covered), try dispatching click event
        try {
          await page.$eval(element.selector, (el: HTMLElement) => el.click());
          clickSucceeded = true;
        } catch (evalErr: any) {
          consoleErrors.push(`Click failed: ${evalErr?.message || err?.message}`);
        }
      }

      // Allow async actions / microtasks / mutations to settle
      await page.waitForTimeout(settleTimeoutMs);

      const inPageMetrics = await page.evaluate((selector) => {
        const obs = (window as any).__deadclick_observer;
        if (obs) obs.disconnect();

        const target = document.querySelector(selector);
        let targetRemoved = false;
        let stateChanged = Boolean((window as any).__deadclick_state_changed);

        if (!target) {
          targetRemoved = true;
        } else {
          const prevAttrs = (window as any).__deadclick_target_attrs || {};
          const currAttrNames = target.getAttributeNames();
          for (const name of currAttrNames) {
            if (target.getAttribute(name) !== prevAttrs[name]) {
              stateChanged = true;
              break;
            }
          }
        }

        return {
          mutationsCount: (window as any).__deadclick_mutations || 0,
          formSubmitted: Boolean((window as any).__deadclick_form_submitted),
          stateChanged,
          targetRemoved
        };
      }, element.selector).catch(() => ({
        mutationsCount: 0,
        formSubmitted: false,
        stateChanged: false,
        targetRemoved: false
      }));

      const finalUrl = page.url();
      const urlChanged = finalUrl !== initialUrl;
      const hashChanged = urlChanged && finalUrl.split('#')[0] === initialUrl.split('#')[0];

      return {
        urlChanged,
        initialUrl,
        finalUrl,
        hashChanged,
        domMutationsCount: inPageMetrics.mutationsCount,
        dialogAppeared,
        dialogMessage,
        dialogType,
        networkRequestsCount,
        networkResponses,
        hasNetworkFailures,
        formSubmitted: inPageMetrics.formSubmitted,
        stateChanged: inPageMetrics.stateChanged,
        consoleErrors,
        pageErrors,
        targetElementRemoved: inPageMetrics.targetRemoved
      };
    } finally {
      page.off('dialog', onDialog);
      page.off('request', onRequest);
      page.off('response', onResponse);
      page.off('pageerror', onPageError);
      page.off('console', onConsole);
    }
  }
}
