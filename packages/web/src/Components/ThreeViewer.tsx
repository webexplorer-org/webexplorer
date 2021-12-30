import "./ThreeViewer.css";
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Mesh,
  AmbientLight,
} from "three";
import { useEffect, useRef } from "react";
import { useElementSize } from "../Hooks/useElementSize";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type SupportedFormat = "gltf" | "3mf" | "stl" | "obj";

export interface ThreeViewerProps {
  file: File;
  format: SupportedFormat;
}

export function ThreeViewer(props: ThreeViewerProps) {
  const { file, format } = props;
  const [containerRef, size] = useElementSize();
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);

  useEffect(() => {
    let aborted = false;

    const canvas = canvasRef.current;

    const scene = new Scene();
    const camera = new PerspectiveCamera(75, 10 / 4, 0.1, 100);
    camera.position.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setSize(100, 100);
    renderer.setClearColor(0xffffff);
    renderer.setPixelRatio(window.devicePixelRatio);
    if (canvas) {
      canvas.appendChild(renderer.domElement);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.update();
    controls.enablePan = true;
    controls.enableDamping = true;

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    function render() {
      if (aborted) {
        return;
      }

      requestAnimationFrame(render);
      if (sceneRef.current && cameraRef.current) {
        renderer.render(sceneRef.current, cameraRef.current);
      }
    }

    render();

    return () => {
      aborted = true;
      if (canvas && renderer) {
        canvas.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setSize(size.width, size.height);
    }
  }, [size.width, size.height]);

  useEffect(() => {
    async function load() {
      const url = URL.createObjectURL(file);

      if (sceneRef.current) {
        sceneRef.current.clear();
        var light = new AmbientLight(0xffffff);
        light.position.set(0, 0, 50);
        sceneRef.current.add(light);
      }

      switch (format) {
        case "gltf":
          {
            const loader = new GLTFLoader();
            loader.load(url, (model) => {
              if (sceneRef.current) {
                sceneRef.current.add(model.scene);
              }
            });
          }
          break;
        case "stl":
          {
            const loader = new STLLoader();
            loader.load(url, (geometry) => {
              if (sceneRef.current) {
                sceneRef.current.add(new Mesh(geometry));
              }
            });
          }
          break;
        case "3mf":
          {
            const loader = new ThreeMFLoader();
            loader.load(url, (model) => {
              if (sceneRef.current) {
                sceneRef.current.add(model);
              }
            });
          }
          break;
        case "obj":
          {
            const loader = new OBJLoader();
            loader.load(url, (model) => {
              if (sceneRef.current) {
                sceneRef.current.add(model);
              }
            });
          }
          break;
      }
    }

    load();

    return () => {};
  }, [file, format]);

  return (
    <div className="three__viewer" ref={containerRef}>
      <div className="canvas" ref={canvasRef}></div>
    </div>
  );
}

export default ThreeViewer;
