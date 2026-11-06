"use client";
import { useCallback, useSyncExternalStore } from "react";

const mediaQueryLists = new Map<string, MediaQueryList>();

function getMediaQueryList(query: string) {
  const cached = mediaQueryLists.get(query);
  if (cached) return cached;

  const mediaQueryList = matchMedia(query);
  mediaQueryLists.set(query, mediaQueryList);
  return mediaQueryList;
}

// The server has no viewport to measure, and the first client render has to
// match it, so the snapshot starts as false and settles after hydration.
const getServerSnapshot = () => false;

export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mediaQueryList = getMediaQueryList(query);
      mediaQueryList.addEventListener("change", onStoreChange);
      return () => mediaQueryList.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => getMediaQueryList(query).matches,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
