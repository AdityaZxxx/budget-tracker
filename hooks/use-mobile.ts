"use client";
import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

// The server has no viewport to measure, and the first client render has to
// match it, so the snapshot starts as false and settles after hydration.
const getServerSnapshot = () => false;

const subscribe = (onStoreChange: () => void) => {
  const mql = window.matchMedia(MOBILE_MEDIA_QUERY);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
};

const getSnapshot = () => window.innerWidth < MOBILE_BREAKPOINT;

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
