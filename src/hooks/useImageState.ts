import { useMemo } from 'react';
import type { ImageData } from '../types';
import { interpolateLogits, softmax } from '../lib/data';

export interface ImageState {
  logits: number[];
  probs: number[];
  margin: number;
  predictedClass: number;
  flipped: boolean;
  attackStrength: number;
  initialMargin: number;
}

export function useImageState(imageData: ImageData, epsilon: number): ImageState {
  return useMemo(() => {
    const logits = interpolateLogits(imageData, epsilon);
    const probs = softmax(logits);

    // Find predicted class (argmax of logits)
    let predictedClass = 0;
    for (let i = 1; i < logits.length; i++) {
      if (logits[i] > logits[predictedClass]) predictedClass = i;
    }

    // Margin: true class logit minus best other class logit
    let bestOther = -Infinity;
    for (let i = 0; i < logits.length; i++) {
      if (i !== imageData.true_class && logits[i] > bestOther) {
        bestOther = logits[i];
      }
    }
    const margin = logits[imageData.true_class] - bestOther;

    const flipped = predictedClass !== imageData.true_class;
    const attackStrength = epsilon * imageData.fgsm_margin_dot;
    const initialMargin = imageData.margin_at_eps[0];

    return { logits, probs, margin, predictedClass, flipped, attackStrength, initialMargin };
  }, [imageData, epsilon]);
}
