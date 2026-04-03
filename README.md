# FGSM Adversarial Attack Visualization

An interactive lecture demo showing how FGSM (Fast Gradient Sign Method) fools neural networks with imperceptible perturbations. Built for university professors to use in-class on a projector.

## Quick Start

```bash
# Install dependencies
npm install

# Generate precomputed data (requires Python + PyTorch)
cd precompute
pip install -r requirements.txt
python generate_data.py              # Standard model → public/data/standard_model.json
python generate_robust_and_3d.py     # Robust model + 3D surface data
cd ..

# Start the development server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## Production Build

```bash
npm run build
npx serve dist
```

## Project Structure

- **Beats 0–3** — A beat-based presentation (like slides) telling the FGSM story
- **Lab Mode** — Draw your own digit and attack it live with TensorFlow.js
- **3D Advanced Mode** — Interactive loss surface visualization with React Three Fiber

## Tech Stack

- React 18 + TypeScript + Vite + Tailwind CSS 3
- Precomputation: Python + PyTorch (LeNet-5 on MNIST)
- Live inference (Lab Mode only): TensorFlow.js
- 3D (optional): React Three Fiber + Three.js

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` / `→` | Navigate beats (or adjust ε when slider focused) |
| `1`–`4` | Jump to beat |
| `Escape` | Reset to Beat 0 / close overlay |
| `R` | Toggle sign map (Beat 2a) |
| `G` | Toggle FGSM/gradient view (Beat 2b) |
| `Space` | Advance from Beat 0 |

See `CLAUDE.md` for full architecture details.
