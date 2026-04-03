export interface ImageData {
  id: number;
  pixels: number[];              // [784]
  true_class: number;
  adversarial_class: number | null;
  loss_grad_sign: number[];      // [784], values -1, 0, 1
  margin_gradient: number[];     // [784]
  grad_magnitude: number[];      // [784]
  dead_pixel_mask: boolean[];    // [784]
  dead_pixel_threshold: number;
  epsilon_values: number[];      // [100]
  logits_at_eps: number[][];     // [100][10]
  margin_at_eps: number[];       // [100]
  probs_at_eps: number[][];      // [100][10]
  epsilon_star: number | null;
  epsilon_star_index: number | null;
  l1_margin_gradient: number;
  avg_pixel_sensitivity: number;
  fgsm_margin_dot: number;
  sign_disagreement_fraction: number;
  raw_gradient_attack_logits: number[][];  // [100][10]
  raw_gradient_flipped: boolean[];         // [100]
  multi_flip?: boolean;
}

export interface ModelData {
  model: string;
  model_accuracy: number;
  images: ImageData[];
}

export interface SurfaceImageData {
  id: number;
  surface_margin: number[][];    // [80][80]
  surface_prediction: number[][]; // [80][80]
  fgsm_path: number[][];         // [N][3] — (alpha, beta, margin)
  pgd_path: number[][];
  cw_path: number[][];
  pgd_path_visible: boolean;
  cw_path_visible: boolean;
  decision_boundary_contour: number[][];  // [N][2]
}

export interface SurfaceData {
  subspace_info: {
    description: string;
    grid_range: [number, number];
    grid_size: number;
  };
  images: SurfaceImageData[];
}

export type Beat = 0 | 1 | '2a' | '2b' | 3;

export interface AppState {
  currentBeat: Beat;
  selectedImageId: number;
  epsilon: number;
  showSignMap: boolean;
  comparisonMode: 'fgsm' | 'gradient';
  modelType: 'standard' | 'robust';
  highContrast: boolean;
}
