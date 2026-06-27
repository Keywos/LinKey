/* eslint-disable */
/**
 * Emulate touch event — 精简优化版
 * Source：https://github.com/hammerjs/touchemulator
 */

(function () {
  if (typeof window === "undefined") return;

  let eventTarget;
  const supportTouch = "ontouchstart" in window;

  // ---- polyfills ----
  if (!document.createTouch) {
    document.createTouch = (view, target, identifier, pageX, pageY, screenX, screenY) =>
      new Touch(target, identifier, {
        pageX,
        pageY,
        screenX,
        screenY,
        clientX: pageX - window.scrollX,
        clientY: pageY - window.scrollY,
      }, 0, 0);
  }

  if (!document.createTouchList) {
    document.createTouchList = (...args) => {
      const tl = TouchList();
      args.forEach((a, i) => { tl[i] = a; });
      tl.length = args.length;
      return tl;
    };
  }

  if (!Element.prototype.matches) {
    Element.prototype.matches =
      Element.prototype.msMatchesSelector ||
      Element.prototype.webkitMatchesSelector;
  }

  if (!Element.prototype.closest) {
    Element.prototype.closest = function (s) {
      let el = this;
      do {
        if (el.matches(s)) return el;
        el = el.parentElement || el.parentNode;
      } while (el && el.nodeType === 1);
      return null;
    };
  }

  // ---- Touch point ----
  class Touch {
    constructor(target, identifier, pos, deltaX = 0, deltaY = 0) {
      this.identifier = identifier;
      this.target = target;
      this.clientX = pos.clientX + deltaX;
      this.clientY = pos.clientY + deltaY;
      this.screenX = pos.screenX + deltaX;
      this.screenY = pos.screenY + deltaY;
      this.pageX = pos.pageX + deltaX;
      this.pageY = pos.pageY + deltaY;
    }
  }

  // ---- TouchList factory ----
  function TouchList() {
    const tl = [];
    tl.item = (i) => tl[i] || null;
    tl.identifiedTouch = (id) => tl[id + 1] || null;
    return tl;
  }

  // ---- Mouse → Touch bridging ----
  let initiated = false;

  function onMouse(touchType) {
    return (ev) => {
      if (ev.type === "mousedown") initiated = true;
      else if (ev.type === "mouseup") initiated = false;
      else if (ev.type === "mousemove" && !initiated) return;

      if (ev.type === "mousedown" || !eventTarget?.dispatchEvent) {
        eventTarget = ev.target;
      }

      if (!eventTarget.closest("[data-no-touch-simulate]")) {
        triggerTouch(touchType, ev);
      }

      if (ev.type === "mouseup") eventTarget = null;
    };
  }

  function triggerTouch(eventName, mouseEv) {
    const touchEvent = new Event(eventName, { bubbles: true, cancelable: true });
    touchEvent.altKey = mouseEv.altKey;
    touchEvent.ctrlKey = mouseEv.ctrlKey;
    touchEvent.metaKey = mouseEv.metaKey;
    touchEvent.shiftKey = mouseEv.shiftKey;
    touchEvent.touches = getActiveTouches(mouseEv);
    touchEvent.targetTouches = getActiveTouches(mouseEv);
    touchEvent.changedTouches = createTouchList(mouseEv);
    eventTarget.dispatchEvent(touchEvent);
  }

  function createTouchList(mouseEv) {
    const tl = TouchList();
    tl.push(new Touch(eventTarget, 1, mouseEv, 0, 0));
    return tl;
  }

  function getActiveTouches(mouseEv) {
    return mouseEv.type === "mouseup" ? TouchList() : createTouchList(mouseEv);
  }

  // ---- Init ----
  function TouchEmulator() {
    window.addEventListener("mousedown", onMouse("touchstart"), true);
    window.addEventListener("mousemove", onMouse("touchmove"), true);
    window.addEventListener("mouseup", onMouse("touchend"), true);
  }

  TouchEmulator.multiTouchOffset = 75;

  if (!supportTouch) new TouchEmulator();
})();
