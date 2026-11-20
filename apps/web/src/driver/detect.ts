/** On-device detectors: MargAI YOLO11n (onnxruntime-web, WASM) + Google MediaPipe EfficientDet-Lite0. Nothing is synthesised: every Det comes from a model run on a real frame. */
export type DetClass = 'pothole' | 'animal' | 'pedestrian' | 'vehicle';
export type Det = {cls: DetClass; conf: number; x: number; y: number; w: number; h: number; src: 'margai-yolo11n-int8' | 'margai-yolo11n-fp32' | 'mediapipe-efficientdet-lite0'; label?: string};

export const YOLO_SIZE = 320;
export const YOLO_VERSION = 'margai-yolo11n-int8';
export const YOLO_FP32_VERSION = 'margai-yolo11n-fp32';
export const MP_VERSION = 'mediapipe-efficientdet-lite0';
const YOLO_CLASSES: DetClass[] = ['pothole', 'animal', 'pedestrian'];
/** Per-class confidence floors. Default 0.35; the custom model's 'animal' head needs more (see report: it fires on real pothole photos). */
const YOLO_MIN_CONF: Record<string, number> = {pothole: 0.35, animal: 0.7, pedestrian: 0.35};

export const iou = (a: {x: number; y: number; w: number; h: number}, b: {x: number; y: number; w: number; h: number}) => {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = ix * iy; return inter / (a.w * a.h + b.w * b.h - inter || 1);
};
export function nms<T extends Det>(dets: T[], thr = 0.45): T[] {
  const sorted = [...dets].sort((a, b) => b.conf - a.conf); const keep: T[] = [];
  for (const d of sorted) if (!keep.some(k => k.cls === d.cls && iou(k, d) > thr)) keep.push(d);
  return keep;
}

/** Decode an Ultralytics YOLO11 head: data laid out [1, 4+nc, anchors] (channel-major), boxes are cx,cy,w,h in input pixels.
 *  lb maps letterboxed input pixels back to normalised source coordinates. */
export function decodeYolo(data: ArrayLike<number>, nc: number, anchors: number, lb: {scale: number; padX: number; padY: number; srcW: number; srcH: number}, minConf = YOLO_MIN_CONF): Det[] {
  const out: Det[] = [];
  for (let i = 0; i < anchors; i++) {
    let best = 0, bc = 0;
    for (let c = 0; c < nc; c++) { const s = data[(4 + c) * anchors + i]; if (s > best) { best = s; bc = c; } }
    const cls = YOLO_CLASSES[bc]; if (!cls || best < (minConf[cls] ?? 0.35)) continue;
    const cx = data[i], cy = data[anchors + i], w = data[2 * anchors + i], h = data[3 * anchors + i];
    const x0 = (cx - w / 2 - lb.padX) / lb.scale / lb.srcW, y0 = (cy - h / 2 - lb.padY) / lb.scale / lb.srcH;
    const x1 = (cx + w / 2 - lb.padX) / lb.scale / lb.srcW, y1 = (cy + h / 2 - lb.padY) / lb.scale / lb.srcH;
    const x = Math.max(0, x0), y = Math.max(0, y0), ww = Math.min(1, x1) - x, hh = Math.min(1, y1) - y;
    if (ww <= 0.003 || hh <= 0.003) continue;
    out.push({cls, conf: best, x, y, w: ww, h: hh, src: YOLO_VERSION});
  }
  return nms(out, 0.45);
}

/** Fill `dst` (CHW float32 0..1, 3x320x320) from RGBA ImageData of the letterboxed frame. */
export function rgbaToChw(rgba: Uint8ClampedArray | Uint8Array, dst: Float32Array) {
  const n = YOLO_SIZE * YOLO_SIZE;
  for (let i = 0; i < n; i++) { dst[i] = rgba[i * 4] / 255; dst[n + i] = rgba[i * 4 + 1] / 255; dst[2 * n + i] = rgba[i * 4 + 2] / 255; }
}

export class YoloDetector {
  ready = false; ms = 0; version = YOLO_VERSION;
  private sess: any; private ort: any; private ctx!: CanvasRenderingContext2D; private input = new Float32Array(3 * YOLO_SIZE * YOLO_SIZE);
  async load() {
    const ort: any = await import('onnxruntime-web/wasm'); this.ort = ort;
    // Vite dev refuses to dynamic-import files from /public, so dev uses the jsDelivr copy of the same version; production uses the bundled /ort files.
    ort.env.wasm.wasmPaths = import.meta.env.DEV ? 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/' : '/ort/'; ort.env.wasm.numThreads = 1; ort.env.wasm.proxy = false;
    const o = {executionProviders: ['wasm'], graphOptimizationLevel: 'all'};
    // The int8 export uses ConvInteger, which onnxruntime-web's WASM backend does not implement; fall back to the fp32 export of the same network.
    try { this.sess = await ort.InferenceSession.create('/models/margai_detector_int8.onnx', o); this.version = YOLO_VERSION; }
    catch (e) { console.warn('int8 model unsupported by onnxruntime-web, using fp32 export', e); this.sess = await ort.InferenceSession.create('/models/margai_detector.onnx', o); this.version = YOLO_FP32_VERSION; }
    const cv = document.createElement('canvas'); cv.width = cv.height = YOLO_SIZE; this.ctx = cv.getContext('2d', {willReadFrequently: true})!;
    this.ready = true;
  }
  async detect(src: CanvasImageSource, w: number, h: number): Promise<Det[]> {
    const t0 = performance.now(); const s = Math.min(YOLO_SIZE / w, YOLO_SIZE / h);
    const dw = Math.round(w * s), dh = Math.round(h * s), px = Math.floor((YOLO_SIZE - dw) / 2), py = Math.floor((YOLO_SIZE - dh) / 2);
    this.ctx.fillStyle = 'rgb(114,114,114)'; this.ctx.fillRect(0, 0, YOLO_SIZE, YOLO_SIZE); this.ctx.drawImage(src, px, py, dw, dh);
    rgbaToChw(this.ctx.getImageData(0, 0, YOLO_SIZE, YOLO_SIZE).data, this.input);
    const res = await this.sess.run({images: new this.ort.Tensor('float32', this.input, [1, 3, YOLO_SIZE, YOLO_SIZE])});
    const o = res[this.sess.outputNames[0]]; const [, ch, anchors] = o.dims as number[];
    const dets = decodeYolo(o.data as Float32Array, ch - 4, anchors, {scale: s, padX: px, padY: py, srcW: w, srcH: h}).map(d => ({...d, src: this.version as Det['src']}));
    this.ms = performance.now() - t0; return dets;
  }
}

const COCO_ANIMAL = new Set(['cow', 'horse', 'sheep', 'dog', 'bear']);
const COCO_VEHICLE = new Set(['car', 'truck', 'bus', 'motorcycle']);
export class MediaPipeDetector {
  ready = false; ms = 0; private det: any;
  async load() {
    const {FilesetResolver, ObjectDetector} = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm');
    const modelAssetPath = 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite';
    const opts = (delegate: 'GPU' | 'CPU') => ({baseOptions: {modelAssetPath, delegate}, scoreThreshold: 0.4, maxResults: 12, runningMode: 'IMAGE' as const});
    try { this.det = await ObjectDetector.createFromOptions(fileset, opts('GPU')); } catch { this.det = await ObjectDetector.createFromOptions(fileset, opts('CPU')); }
    this.ready = true;
  }
  detect(src: HTMLCanvasElement): Det[] {
    const t0 = performance.now(); const r = this.det.detect(src); const out: Det[] = [];
    for (const d of r.detections ?? []) {
      const c = d.categories?.[0]; const bb = d.boundingBox; if (!c || !bb) continue;
      const name = c.categoryName as string; const cls: DetClass | null = COCO_ANIMAL.has(name) ? 'animal' : name === 'person' ? 'pedestrian' : COCO_VEHICLE.has(name) ? 'vehicle' : null;
      if (!cls) continue;
      const x = Math.max(0, bb.originX / src.width), y = Math.max(0, bb.originY / src.height);
      out.push({cls, conf: c.score, x, y, w: Math.min(1, (bb.originX + bb.width) / src.width) - x, h: Math.min(1, (bb.originY + bb.height) / src.height) - y, src: MP_VERSION, label: name});
    }
    this.ms = performance.now() - t0; return out;
  }
}

/** Merge both detectors; same-class overlaps keep the higher-confidence box. */
export const mergeDets = (a: Det[], b: Det[]) => nms([...a, ...b], 0.5);
