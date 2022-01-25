import { useEffect } from "react";

export function useDocumentTitle(props: { title: string }) {
  const { title } = props;
  useEffect(() => {
    const originalTitle = document.title;
    document.title = title;

    return () => {
      document.title = originalTitle;
    };
  }, [title]);
}
