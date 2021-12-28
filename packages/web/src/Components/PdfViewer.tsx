import { useEffect, useRef, useState } from "react";
import "./PdfViewer.css";

import * as pdfjs from "pdfjs-dist";
// @ts-ignore
import pdfjsWorder from "pdfjs-dist/build/pdf.worker.entry";
import { Loading } from "./Loading";
import { PageViewport } from "pdfjs-dist/types/web/interfaces";
import { useElementSize } from "../Hooks/useElementSize";
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorder;

const dpr = window.devicePixelRatio || 1;

export interface PdfViewerProps {
  file: File;
}

export function PdfViewer(props: PdfViewerProps) {
  const { file } = props;
  const [doc, setDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<pdfjs.PDFPageProxy[]>([]);
  const [viewports, setViewports] = useState<
    { viewport: PageViewport; scrollY: number; scale: number }[]
  >([]);
  const [containerRef, size] = useElementSize();

  useEffect(() => {
    let aborted = false;
    let url: string | null = null;
    async function load() {
      url = URL.createObjectURL(file);
      const loadingTask = await pdfjs.getDocument({
        url,
      });
      if (aborted) {
        return;
      }

      const doc = await loadingTask.promise;
      if (aborted) {
        return;
      }

      setDoc(doc);

      const pages: pdfjs.PDFPageProxy[] = [];
      for (let i = 0; i < doc.numPages - 1; i++) {
        const page = await doc.getPage(i + 1);
        if (aborted) {
          break;
        }
        pages.push(page);
      }

      if (aborted) {
        return;
      }

      setPages(pages);
    }

    load();

    return () => {
      aborted = false;
      if (url) {
        URL.revokeObjectURL(url);
        url = null;
      }
    };
  }, [file, setDoc, setPages]);

  useEffect(() => {
    const pageGap = 4;
    let scrollY = pageGap;
    const viewports: {
      viewport: PageViewport;
      scrollY: number;
      scale: number;
    }[] = [];
    for (const page of pages) {
      const viewport = page.getViewport({ scale: 1.0 });
      const scale = size ? size.width / viewport.width : 1.0;
      viewports.push({ viewport, scrollY, scale });
      scrollY = scrollY + viewport.height * scale + pageGap;
    }

    setViewports(viewports);
  }, [pages, setViewports, size]);

  const [scrollY, setScrollY] = useState<number>(0);
  useEffect(() => {
    function updatescrollY(evt: Event) {
      setScrollY(window.scrollY);
    }

    window.addEventListener("scroll", updatescrollY, { passive: true });

    return () => {
      window.removeEventListener("scroll", updatescrollY);
    };
  }, [setScrollY]);

  if (!doc) {
    return <Loading />;
  }

  const windowHeight = window.innerHeight;
  const visibleRangeTop = scrollY - windowHeight;
  const visibleRangeBottom = scrollY + windowHeight * 2;

  return (
    <div className="pdf__viewer">
      <div className="pdf__viewer__pages" ref={containerRef}>
        {pages.map((page, index) => {
          const viewport = viewports[index];
          let isVisible = false;
          let scale = 1.0;
          if (viewport) {
            scale = viewport.scale;
            const viewportTop = viewport.scrollY;
            const viewportBottom =
              viewport.scrollY + viewport.viewport.height * scale;
            isVisible = !(
              viewportTop > visibleRangeBottom ||
              viewportBottom < visibleRangeTop
            );
          }

          return (
            <PdfPage
              isVisible={isVisible}
              key={index}
              scale={scale}
              viewport={viewport?.viewport}
              page={page}
            ></PdfPage>
          );
        })}
      </div>
      <footer className="=pdf__viewer__controls"></footer>
    </div>
  );
}

export interface PdfPageProps {
  isVisible: boolean;
  page: pdfjs.PDFPageProxy;
  viewport: PageViewport | undefined;
  scale: number;
}

export function PdfPage(props: PdfPageProps) {
  const { isVisible, page, viewport } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scale = props.scale * dpr;

  useEffect(() => {
    function render() {
      if (!isVisible) {
        return;
      }

      if (!page) {
        return;
      }

      if (!viewport) {
        return;
      }

      if (!canvasRef.current) {
        return;
      }

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      const transformX = window.devicePixelRatio * scale;
      const transform = [transformX, 0, 0, transformX, 0, 0];
      const renderContext = {
        canvasContext: context,
        transform: transform,
        viewport: viewport,
      };
      return page.render(renderContext);
    }

    let task = render();
    return () => {
      if (task) {
        task?.cancel();
        task = undefined;
      }
    };
  }, [isVisible, scale, page, viewport]);

  if (!viewport) {
    return null;
  }

  const width = Math.floor(viewport.width * scale);
  const height = Math.floor(viewport.height * scale);
  const style = {
    width: Math.floor(viewport.width * scale),
    height: Math.floor(viewport.height * scale),
  };

  return (
    <div
      ref={containerRef}
      className="pdf__page"
      style={{ width: `${style.width + 2}px`, height: `${style.height + 2}px` }}
    >
      {isVisible ? (
        <canvas
          width={width}
          height={height}
          ref={canvasRef}
          style={{ width: `${style.width}px`, height: `${style.height}px` }}
        ></canvas>
      ) : null}
    </div>
  );
}

export default PdfViewer;
