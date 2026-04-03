# Panda Images for Beat 0

Beat 0 uses the famous Goodfellow et al. (2015) panda adversarial example.

## Required Files

Place these two images in this directory:

- **`panda_clean.jpg`** — The original giant panda image from ImageNet (at least 800x800px)
- **`panda_adversarial.jpg`** — The adversarial version with imperceptible perturbation (visually identical)

## Where to Find Them

The original images are from:
> Goodfellow, I.J., Shlens, J. and Szegedy, C., 2015. "Explaining and Harnessing Adversarial Examples." ICLR 2015.

You can find the panda image in most adversarial ML papers and tutorials. The clean image is an ImageNet sample classified as "giant panda" with 57.7% confidence by GoogLeNet, and the adversarial version is classified as "gibbon" with 99.3% confidence.

## Fallback

If images are not present, the component shows a green-tinted placeholder with instructions.
