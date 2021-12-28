import { useCallback, useEffect, useLayoutEffect, useState } from "react";

export interface Size {
  width: number;
  height: number;
}

export function useElementSize<T extends HTMLElement = HTMLDivElement>(): [
  (element: T | null) => void,
  Size
] {
  const [ref, setRef] = useState<T | null>(null);
  const [size, setSize] = useState<Size>({
    width: 0,
    height: 0,
  });

  const handleSize = useCallback(() => {
    if (ref) {
      setSize({
        width: ref.offsetWidth || 0,
        height: ref.offsetHeight || 0,
      });
    }
  }, [ref]);

  useEffect(() => {
    window.addEventListener("resize", handleSize);

    return () => {
      window.removeEventListener("resize", handleSize);
    };
  }, [handleSize]);

  useLayoutEffect(() => {
    handleSize();
  }, [handleSize]);

  return [setRef, size];
}
