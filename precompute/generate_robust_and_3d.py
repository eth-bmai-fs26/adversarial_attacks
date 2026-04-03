#!/usr/bin/env python3
"""
Issue 2: Precomputation Pipeline — Robust Model + 3D Surface Data

Depends on Issue 1 outputs:
  - public/data/standard_model.json (curated images + FGSM directions)
  - precompute/models/lenet5_standard.pt (standard model weights)

Produces:
  - precompute/models/lenet5_robust.pt
  - public/data/robust_model.json
  - public/data/3d_surface_data.json
"""

import json
import os
import sys
import gzip
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torchvision import datasets, transforms

# ── Paths ──────────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
MODELS_DIR = SCRIPT_DIR / "models"
DATA_DIR = PROJECT_ROOT / "public" / "data"

STANDARD_JSON = DATA_DIR / "standard_model.json"
STANDARD_WEIGHTS = MODELS_DIR / "lenet5_standard.pt"
ROBUST_WEIGHTS = MODELS_DIR / "lenet5_robust.pt"
ROBUST_JSON = DATA_DIR / "robust_model.json"
SURFACE_JSON = DATA_DIR / "3d_surface_data.json"

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ── LeNet-5 ────────────────────────────────────────────────────────────────────

class LeNet5(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 6, 5)
        self.conv2 = nn.Conv2d(6, 16, 5)
        self.fc1 = nn.Linear(256, 120)
        self.fc2 = nn.Linear(120, 84)
        self.fc3 = nn.Linear(84, 10)

    def forward(self, x):
        x = F.max_pool2d(F.relu(self.conv1(x)), 2)
        x = F.max_pool2d(F.relu(self.conv2(x)), 2)
        x = x.view(x.size(0), -1)
        x = F.relu(self.fc1(x))
        x = F.relu(self.fc2(x))
        return self.fc3(x)


# ── PGD Attack ─────────────────────────────────────────────────────────────────

def pgd_attack(model, x, y, epsilon, alpha, steps):
    """PGD L∞ attack. Returns perturbed input."""
    x_adv = x.clone().detach() + torch.empty_like(x).uniform_(-epsilon, epsilon)
    x_adv = torch.clamp(x_adv, 0, 1).detach()

    for _ in range(steps):
        x_adv.requires_grad_(True)
        loss = F.cross_entropy(model(x_adv), y)
        grad = torch.autograd.grad(loss, x_adv)[0]
        x_adv = x_adv.detach() + alpha * grad.sign()
        # Project back to L∞ ball and valid range
        delta = torch.clamp(x_adv - x, -epsilon, epsilon)
        x_adv = torch.clamp(x + delta, 0, 1).detach()

    return x_adv


# ── Training ───────────────────────────────────────────────────────────────────

def get_mnist_loaders(batch_size=128):
    transform = transforms.Compose([transforms.ToTensor()])
    train_ds = datasets.MNIST(
        str(SCRIPT_DIR / "data"), train=True, download=True, transform=transform
    )
    test_ds = datasets.MNIST(
        str(SCRIPT_DIR / "data"), train=False, download=True, transform=transform
    )
    train_loader = torch.utils.data.DataLoader(
        train_ds, batch_size=batch_size, shuffle=True, num_workers=2
    )
    test_loader = torch.utils.data.DataLoader(
        test_ds, batch_size=batch_size, shuffle=False, num_workers=2
    )
    return train_loader, test_loader


def evaluate(model, loader):
    model.eval()
    correct = total = 0
    with torch.no_grad():
        for x, y in loader:
            x, y = x.to(DEVICE), y.to(DEVICE)
            correct += (model(x).argmax(1) == y).sum().item()
            total += y.size(0)
    return correct / total


def evaluate_robust(model, loader, epsilon=0.3, alpha=0.01, steps=20):
    model.eval()
    correct = total = 0
    for x, y in loader:
        x, y = x.to(DEVICE), y.to(DEVICE)
        x_adv = pgd_attack(model, x, y, epsilon, alpha, steps)
        with torch.no_grad():
            correct += (model(x_adv).argmax(1) == y).sum().item()
        total += y.size(0)
    return correct / total


def train_robust_model():
    """Train LeNet-5 with PGD adversarial training."""
    if ROBUST_WEIGHTS.exists():
        print(f"Loading existing robust model from {ROBUST_WEIGHTS}")
        model = LeNet5().to(DEVICE)
        model.load_state_dict(torch.load(ROBUST_WEIGHTS, map_location=DEVICE, weights_only=True))
        return model

    print("Training robust LeNet-5 with PGD-AT...")
    model = LeNet5().to(DEVICE)
    optimizer = optim.SGD(model.parameters(), lr=0.01, momentum=0.9, weight_decay=5e-4)
    scheduler = optim.lr_scheduler.MultiStepLR(optimizer, milestones=[30, 40], gamma=0.1)

    train_loader, test_loader = get_mnist_loaders(batch_size=128)

    eps_train = 0.3
    pgd_alpha = 0.01
    pgd_steps = 40

    for epoch in range(1, 51):
        model.train()
        total_loss = 0
        for x, y in train_loader:
            x, y = x.to(DEVICE), y.to(DEVICE)
            # Generate adversarial examples
            x_adv = pgd_attack(model, x, y, eps_train, pgd_alpha, pgd_steps)
            # Train on adversarial examples
            optimizer.zero_grad()
            loss = F.cross_entropy(model(x_adv), y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * x.size(0)

        scheduler.step()
        if epoch % 5 == 0 or epoch == 1:
            clean_acc = evaluate(model, test_loader)
            print(f"  Epoch {epoch:2d}: loss={total_loss / len(train_loader.dataset):.4f}, "
                  f"clean_acc={clean_acc:.4f}")

    # Final evaluation
    clean_acc = evaluate(model, test_loader)
    robust_acc = evaluate_robust(model, test_loader, epsilon=0.3, alpha=0.01, steps=20)
    print(f"  Final — clean: {clean_acc:.4f}, robust@0.3: {robust_acc:.4f}")

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), ROBUST_WEIGHTS)
    print(f"  Saved to {ROBUST_WEIGHTS}")
    return model


# ── Part A: Robust Model Per-Image Data ────────────────────────────────────────

def compute_fgsm_logits_at_epsilons(model, x, y, grad_sign, epsilon_values):
    """Compute logits, margin, probs at each epsilon for FGSM attack."""
    model.eval()
    n_eps = len(epsilon_values)
    logits_all = np.zeros((n_eps, 10), dtype=np.float32)
    margin_all = np.zeros(n_eps, dtype=np.float32)
    probs_all = np.zeros((n_eps, 10), dtype=np.float32)

    sign_tensor = torch.tensor(grad_sign, dtype=torch.float32, device=DEVICE).view(1, 1, 28, 28)

    with torch.no_grad():
        for i, eps in enumerate(epsilon_values):
            x_adv = torch.clamp(x + eps * sign_tensor, 0, 1)
            logits = model(x_adv).squeeze(0)
            logits_all[i] = logits.cpu().numpy()
            probs = F.softmax(logits, dim=0)
            probs_all[i] = probs.cpu().numpy()
            # Margin: z_y - max_{k!=y} z_k
            z_y = logits[y].item()
            logits_copy = logits.clone()
            logits_copy[y] = -float("inf")
            margin_all[i] = z_y - logits_copy.max().item()

    return logits_all, margin_all, probs_all


def find_epsilon_star(margin_at_eps, epsilon_values):
    """Find first epsilon where margin crosses zero (classification flips)."""
    for i in range(len(margin_at_eps)):
        if margin_at_eps[i] < 0:
            if i == 0:
                return epsilon_values[0], 0
            # Linear interpolation
            m0 = margin_at_eps[i - 1]
            m1 = margin_at_eps[i]
            frac = m0 / (m0 - m1)
            eps_star = epsilon_values[i - 1] + frac * (epsilon_values[i] - epsilon_values[i - 1])
            return float(eps_star), i
    return None, None


def compute_dead_pixel_mask(grad_mag, target_active=350):
    """Compute dead pixel mask with adaptive threshold."""
    max_grad = grad_mag.max()
    if max_grad < 1e-10:
        return np.ones(784, dtype=bool), 0.0

    tau = 0.01 * max_grad
    active = grad_mag >= tau

    # Check sign coherence (simplified: just check active count)
    n_active = active.sum()
    if n_active > target_active * 1.5:
        # Adjust tau to keep ~target_active pixels
        sorted_mags = np.sort(grad_mag)[::-1]
        if target_active < len(sorted_mags):
            tau = float(sorted_mags[target_active])
            active = grad_mag >= tau

    dead = ~active
    return dead.astype(bool), float(tau)


def compute_raw_gradient_attack(model, x, y, raw_grad, epsilon_values):
    """Compute logits using raw gradient direction (δ = ε · ∇J / ‖∇J‖_∞)."""
    model.eval()
    grad_linf = np.abs(raw_grad).max()
    if grad_linf < 1e-10:
        direction = np.zeros_like(raw_grad)
    else:
        direction = raw_grad / grad_linf

    dir_tensor = torch.tensor(direction, dtype=torch.float32, device=DEVICE).view(1, 1, 28, 28)
    n_eps = len(epsilon_values)
    logits_all = np.zeros((n_eps, 10), dtype=np.float32)
    flipped = np.zeros(n_eps, dtype=bool)

    with torch.no_grad():
        for i, eps in enumerate(epsilon_values):
            x_adv = torch.clamp(x + eps * dir_tensor, 0, 1)
            logits = model(x_adv).squeeze(0)
            logits_all[i] = logits.cpu().numpy()
            flipped[i] = logits.argmax().item() != y

    return logits_all, flipped


def generate_robust_model_data(model, standard_data):
    """Generate per-image data for the robust model."""
    print("\nGenerating robust model per-image data...")
    images_data = []
    epsilon_values = np.linspace(0, 0.35, 100).tolist()

    for idx, img_data in enumerate(standard_data["images"]):
        pixels = np.array(img_data["pixels"], dtype=np.float32)
        true_class = img_data["true_class"]

        x = torch.tensor(pixels, dtype=torch.float32, device=DEVICE).view(1, 1, 28, 28)
        x.requires_grad_(True)

        # Forward pass + gradient
        model.eval()
        logits = model(x)
        loss = F.cross_entropy(logits, torch.tensor([true_class], device=DEVICE))
        loss.backward()

        raw_grad = x.grad.data.squeeze().cpu().numpy().flatten()
        grad_mag = np.abs(raw_grad)
        grad_sign = np.sign(raw_grad).astype(np.int8)

        # Dead pixel mask
        dead_mask, tau = compute_dead_pixel_mask(grad_mag)
        # Set sign to 0 for dead pixels
        grad_sign[dead_mask] = 0

        # Margin gradient
        x2 = torch.tensor(pixels, dtype=torch.float32, device=DEVICE).view(1, 1, 28, 28)
        x2.requires_grad_(True)
        logits2 = model(x2)
        z_y = logits2[0, true_class]
        logits_other = logits2.clone()
        logits_other[0, true_class] = -float("inf")
        z_max_other = logits_other.max()
        margin = z_y - z_max_other
        margin.backward()
        margin_grad = x2.grad.data.squeeze().cpu().numpy().flatten()

        # Logits at epsilons
        x_clean = torch.tensor(pixels, dtype=torch.float32, device=DEVICE).view(1, 1, 28, 28)
        logits_at_eps, margin_at_eps, probs_at_eps = compute_fgsm_logits_at_epsilons(
            model, x_clean, true_class, grad_sign, epsilon_values
        )

        # Find epsilon_star
        eps_star, eps_star_idx = find_epsilon_star(margin_at_eps, epsilon_values)

        # Adversarial class
        if eps_star is not None and eps_star <= 0.35:
            adv_class = int(np.argmax(logits_at_eps[eps_star_idx]))
        else:
            adv_class = None
            eps_star = None
            eps_star_idx = None

        # Dimensional scaling
        l1_margin_grad = float(np.abs(margin_grad).sum())
        avg_sensitivity = float(np.abs(margin_grad).mean())
        fgsm_margin_dot = float(np.sum(margin_grad * grad_sign))
        sign_disagree = float(np.mean(
            (np.sign(raw_grad) != np.sign(margin_grad)) & (np.abs(raw_grad) > tau)
        ))

        # Raw gradient attack
        raw_logits, raw_flipped = compute_raw_gradient_attack(
            model, x_clean, true_class, raw_grad, epsilon_values
        )

        # Store active pixel indices (more compact than full boolean array)
        active_indices = np.where(~dead_mask)[0].tolist()

        record = {
            "id": img_data["id"],
            "pixels": [round(float(p), 4) for p in pixels],
            "true_class": true_class,
            "adversarial_class": adv_class,
            "loss_grad_sign": grad_sign.tolist(),
            "margin_gradient": [round(float(v), 4) for v in margin_grad],
            "grad_magnitude": [round(float(v), 4) for v in grad_mag],
            "dead_pixel_mask": active_indices,
            "dead_pixel_threshold": round(float(tau), 6),
            "epsilon_values": [round(float(e), 5) for e in epsilon_values],
            "logits_at_eps": [[round(float(v), 4) for v in row] for row in logits_at_eps],
            "margin_at_eps": [round(float(v), 4) for v in margin_at_eps],
            "probs_at_eps": [[round(float(v), 4) for v in row] for row in probs_at_eps],
            "epsilon_star": round(eps_star, 4) if eps_star is not None else None,
            "epsilon_star_index": eps_star_idx,
            "l1_margin_gradient": round(l1_margin_grad, 2),
            "avg_pixel_sensitivity": round(avg_sensitivity, 4),
            "fgsm_margin_dot": round(fgsm_margin_dot, 2),
            "sign_disagreement_fraction": round(sign_disagree, 4),
            "raw_gradient_attack_logits": [[round(float(v), 4) for v in row] for row in raw_logits],
            "raw_gradient_flipped": raw_flipped.tolist(),
        }
        images_data.append(record)

        status = f"ε*={eps_star:.4f}" if eps_star is not None else "no flip"
        print(f"  Image {idx:2d} (digit {true_class}): {status}, "
              f"active={len(active_indices)}/{784}")

    return images_data


# ── Part B: 3D Surface + Attack Paths ──────────────────────────────────────────

def build_subspace(standard_img_data):
    """Build 2D subspace: v1 = normalized FGSM sign, v2 = orthogonal gradient component."""
    grad_sign = np.array(standard_img_data["loss_grad_sign"], dtype=np.float32)
    margin_grad = np.array(standard_img_data["margin_gradient"], dtype=np.float32)

    # v1 = normalized FGSM direction from standard model
    v1 = grad_sign.copy()
    v1_norm = np.linalg.norm(v1)
    if v1_norm > 1e-10:
        v1 = v1 / v1_norm
    else:
        v1 = np.zeros_like(v1)

    # v2 = component of gradient orthogonal to v1 (Gram-Schmidt)
    # Use the raw gradient (margin_gradient) for v2
    raw_grad = margin_grad.copy()
    proj = np.dot(raw_grad, v1) * v1
    v2 = raw_grad - proj
    v2_norm = np.linalg.norm(v2)
    if v2_norm > 1e-10:
        v2 = v2 / v2_norm
    else:
        v2 = np.zeros_like(v2)

    return v1, v2


def compute_surface(model, x_clean, true_class, v1, v2, grid_size=80, grid_range=0.4):
    """Compute 80x80 margin surface in the 2D subspace."""
    model.eval()
    alphas = np.linspace(-grid_range, grid_range, grid_size)
    betas = np.linspace(-grid_range, grid_range, grid_size)

    v1_t = torch.tensor(v1, dtype=torch.float32, device=DEVICE).view(1, 1, 28, 28)
    v2_t = torch.tensor(v2, dtype=torch.float32, device=DEVICE).view(1, 1, 28, 28)

    surface_margin = np.zeros((grid_size, grid_size), dtype=np.float32)
    surface_prediction = np.zeros((grid_size, grid_size), dtype=np.int8)

    with torch.no_grad():
        # Batch process rows for efficiency
        for i, alpha in enumerate(alphas):
            # Create batch of all beta values for this alpha
            x_batch = x_clean.expand(grid_size, -1, -1, -1) + alpha * v1_t
            beta_tensor = torch.tensor(betas, dtype=torch.float32, device=DEVICE).view(-1, 1, 1, 1)
            x_batch = torch.clamp(x_batch + beta_tensor * v2_t, 0, 1)

            logits = model(x_batch)
            preds = logits.argmax(dim=1).cpu().numpy()

            z_y = logits[:, true_class]
            logits_copy = logits.clone()
            logits_copy[:, true_class] = -float("inf")
            z_max_other = logits_copy.max(dim=1).values
            margins = (z_y - z_max_other).cpu().numpy()

            surface_margin[i] = margins
            surface_prediction[i] = preds

    return surface_margin, surface_prediction, alphas, betas


def extract_decision_boundary(surface_margin, alphas, betas):
    """Extract zero-contour of margin surface (decision boundary)."""
    try:
        from skimage.measure import find_contours
        contours = find_contours(surface_margin, level=0.0)
        if not contours:
            return []

        # Convert pixel indices to (alpha, beta) coordinates
        all_points = []
        for contour in contours:
            points = []
            for row, col in contour:
                # Interpolate grid coordinates
                alpha = np.interp(row, np.arange(len(alphas)), alphas)
                beta = np.interp(col, np.arange(len(betas)), betas)
                points.append([round(float(alpha), 4), round(float(beta), 4)])
            all_points.extend(points)
        return all_points
    except ImportError:
        print("  Warning: scikit-image not available, skipping contour extraction")
        return []


def run_pgd_path(model, x_clean, true_class, v1, v2, epsilon=0.3, alpha=0.01, steps=20):
    """Run PGD attack and record path projected onto (v1, v2) subspace."""
    model.eval()
    v1_t = torch.tensor(v1, dtype=torch.float32, device=DEVICE).flatten()
    v2_t = torch.tensor(v2, dtype=torch.float32, device=DEVICE).flatten()

    x = x_clean.clone().detach()
    x_flat = x.view(-1)

    path = []

    # Start point
    with torch.no_grad():
        logits = model(x)
        z_y = logits[0, true_class].item()
        logits_copy = logits.clone()
        logits_copy[0, true_class] = -float("inf")
        m0 = z_y - logits_copy.max().item()
    path.append([0.0, 0.0, round(m0, 2)])

    # Initialize with small random perturbation
    delta = torch.zeros_like(x, requires_grad=True)

    for step in range(steps):
        x_adv = torch.clamp(x + delta, 0, 1)
        x_adv_input = x_adv.detach().requires_grad_(True)
        logits = model(x_adv_input)
        loss = F.cross_entropy(logits, torch.tensor([true_class], device=DEVICE))
        grad = torch.autograd.grad(loss, x_adv_input)[0]

        # PGD step
        with torch.no_grad():
            delta = delta + alpha * grad.sign()
            delta = torch.clamp(delta, -epsilon, epsilon)
            delta = torch.clamp(x + delta, 0, 1) - x

        # Project delta onto subspace
        delta_flat = delta.view(-1)
        a = torch.dot(delta_flat, v1_t).item()
        b = torch.dot(delta_flat, v2_t).item()

        # Compute margin at this point
        with torch.no_grad():
            x_adv = torch.clamp(x + delta, 0, 1)
            logits = model(x_adv)
            z_y = logits[0, true_class].item()
            logits_copy = logits.clone()
            logits_copy[0, true_class] = -float("inf")
            margin = z_y - logits_copy.max().item()

        path.append([round(a, 4), round(b, 4), round(margin, 2)])

    return path


def run_cw_path(model, x_clean, true_class, v1, v2, steps=50, lr=0.01, c_init=1.0):
    """Simplified C&W L2 attack with path recording."""
    model.eval()
    v1_t = torch.tensor(v1, dtype=torch.float32, device=DEVICE).flatten()
    v2_t = torch.tensor(v2, dtype=torch.float32, device=DEVICE).flatten()

    x = x_clean.clone().detach()

    # Start point
    path = []
    with torch.no_grad():
        logits = model(x)
        z_y = logits[0, true_class].item()
        logits_copy = logits.clone()
        logits_copy[0, true_class] = -float("inf")
        m0 = z_y - logits_copy.max().item()
    path.append([0.0, 0.0, round(m0, 2)])

    # Binary search for c
    c = c_init
    best_path = None

    for c_attempt in [0.1, 1.0, 10.0, 100.0]:
        w = torch.zeros_like(x, requires_grad=True)
        optimizer = optim.Adam([w], lr=lr)
        trial_path = [path[0]]

        for step in range(steps):
            optimizer.zero_grad()
            delta = torch.tanh(w) * 0.5  # Keep perturbations bounded
            x_adv = torch.clamp(x + delta, 0, 1)
            logits = model(x_adv)

            # C&W objective: minimize L2 + c * max(z_y - max_{k!=y} z_k, 0)
            l2_loss = torch.norm(delta)
            z_y_val = logits[0, true_class]
            logits_other = logits.clone()
            logits_other[0, true_class] = -float("inf")
            z_max_other = logits_other.max()
            f_loss = torch.clamp(z_y_val - z_max_other, min=0)
            total_loss = l2_loss + c_attempt * f_loss

            total_loss.backward()
            optimizer.step()

            # Record path point
            with torch.no_grad():
                delta_eval = torch.tanh(w) * 0.5
                delta_flat = delta_eval.view(-1)
                a = torch.dot(delta_flat, v1_t).item()
                b = torch.dot(delta_flat, v2_t).item()
                x_adv_eval = torch.clamp(x + delta_eval, 0, 1)
                logits_eval = model(x_adv_eval)
                z_y_e = logits_eval[0, true_class].item()
                logits_copy = logits_eval.clone()
                logits_copy[0, true_class] = -float("inf")
                margin = z_y_e - logits_copy.max().item()
                trial_path.append([round(a, 4), round(b, 4), round(margin, 2)])

        # Check if attack succeeded (margin < 0)
        if trial_path[-1][2] < 0:
            if best_path is None or len(trial_path) <= len(best_path):
                best_path = trial_path
            break
        else:
            best_path = trial_path  # Keep even if failed

    return best_path if best_path else path


def generate_3d_surface_data(standard_model, standard_data):
    """Generate 3D surface mesh and attack paths for all curated images."""
    print("\nGenerating 3D surface data...")
    images_3d = []
    contour_count = 0
    pgd_visible_count = 0
    cw_visible_count = 0

    for idx, img_data in enumerate(standard_data["images"]):
        pixels = np.array(img_data["pixels"], dtype=np.float32)
        true_class = img_data["true_class"]
        eps_star = img_data["epsilon_star"]

        x_clean = torch.tensor(pixels, dtype=torch.float32, device=DEVICE).view(1, 1, 28, 28)

        # Build subspace from standard model's gradients
        v1, v2 = build_subspace(img_data)

        # Compute surface mesh
        surface_margin, surface_prediction, alphas, betas = compute_surface(
            standard_model, x_clean, true_class, v1, v2
        )

        # Extract decision boundary contour
        contour = extract_decision_boundary(surface_margin, alphas, betas)
        if contour:
            contour_count += 1

        # FGSM path (straight line along v1)
        # Compute margin at origin and at eps_star
        with torch.no_grad():
            logits_0 = standard_model(x_clean)
            z_y = logits_0[0, true_class].item()
            lc = logits_0.clone()
            lc[0, true_class] = -float("inf")
            m0 = z_y - lc.max().item()

        if eps_star is not None:
            v1_t = torch.tensor(v1, dtype=torch.float32, device=DEVICE).view(1, 1, 28, 28)
            with torch.no_grad():
                x_adv = torch.clamp(x_clean + eps_star * v1_t, 0, 1)
                logits_e = standard_model(x_adv)
                z_y = logits_e[0, true_class].item()
                lc = logits_e.clone()
                lc[0, true_class] = -float("inf")
                m_star = z_y - lc.max().item()
            fgsm_path = [
                [0, 0, round(m0, 2)],
                [round(eps_star, 4), 0, round(m_star, 2)],
            ]
        else:
            fgsm_path = [[0, 0, round(m0, 2)]]

        # PGD path
        pgd_path = run_pgd_path(standard_model, x_clean, true_class, v1, v2)
        pgd_max_beta = max(abs(p[1]) for p in pgd_path)
        pgd_visible = pgd_max_beta > 0.02

        # C&W path
        cw_path = run_cw_path(standard_model, x_clean, true_class, v1, v2)
        cw_in_range = all(abs(p[0]) <= 0.5 and abs(p[1]) <= 0.5 for p in cw_path)
        cw_visible = cw_in_range

        if pgd_visible:
            pgd_visible_count += 1
        if cw_visible:
            cw_visible_count += 1

        record = {
            "id": img_data["id"],
            "surface_margin": [[round(float(v), 2) for v in row] for row in surface_margin],
            "surface_prediction": surface_prediction.tolist(),
            "fgsm_path": fgsm_path,
            "pgd_path": pgd_path,
            "cw_path": cw_path,
            "pgd_path_visible": pgd_visible,
            "cw_path_visible": cw_visible,
            "decision_boundary_contour": contour,
        }
        images_3d.append(record)
        print(f"  Image {idx:2d}: PGD β_max={pgd_max_beta:.4f} "
              f"({'visible' if pgd_visible else 'degenerate'}), "
              f"C&W {'visible' if cw_visible else 'out-of-range'}, "
              f"contour={'yes' if contour else 'no'}")

    return images_3d, contour_count, pgd_visible_count, cw_visible_count


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    # Check dependencies
    if not STANDARD_JSON.exists():
        print(f"ERROR: {STANDARD_JSON} not found.")
        print("Run generate_data.py (Issue 1) first.")
        sys.exit(1)

    if not STANDARD_WEIGHTS.exists():
        print(f"ERROR: {STANDARD_WEIGHTS} not found.")
        print("Run generate_data.py (Issue 1) first.")
        sys.exit(1)

    # Load standard model data
    print(f"Loading standard model data from {STANDARD_JSON}...")
    with open(STANDARD_JSON) as f:
        standard_data = json.load(f)
    print(f"  Loaded {len(standard_data['images'])} images")

    # Load standard model
    print(f"Loading standard model from {STANDARD_WEIGHTS}...")
    standard_model = LeNet5().to(DEVICE)
    standard_model.load_state_dict(
        torch.load(STANDARD_WEIGHTS, map_location=DEVICE, weights_only=True)
    )
    standard_model.eval()

    # ── Part A: Train robust model + generate per-image data ──
    robust_model = train_robust_model()

    _, test_loader = get_mnist_loaders()
    clean_acc = evaluate(robust_model, test_loader)
    robust_acc = evaluate_robust(robust_model, test_loader, epsilon=0.3, alpha=0.01, steps=20)

    images_data = generate_robust_model_data(robust_model, standard_data)

    # Count stats
    n_successful = sum(1 for img in images_data if img["epsilon_star"] is not None)
    n_failed = len(images_data) - n_successful
    successful_eps = [img["epsilon_star"] for img in images_data if img["epsilon_star"] is not None]
    mean_eps = np.mean(successful_eps) if successful_eps else 0
    active_counts = [
        784 - len(img["dead_pixel_mask"]) if isinstance(img["dead_pixel_mask"], list)
        else sum(1 for v in img["dead_pixel_mask"] if not v)
        for img in images_data
    ]
    # dead_pixel_mask stores active indices, so len = number of active pixels
    active_counts = [len(img["dead_pixel_mask"]) for img in images_data]
    avg_active = np.mean(active_counts)

    # Write robust model JSON
    robust_output = {
        "model": "lenet5_robust",
        "model_accuracy": round(clean_acc, 4),
        "robust_accuracy_at_03": round(robust_acc, 4),
        "training": {
            "method": "PGD-AT",
            "epsilon_train": 0.3,
            "pgd_steps": 40,
            "step_size": 0.01,
        },
        "images": images_data,
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(ROBUST_JSON, "w") as f:
        json.dump(robust_output, f)
    robust_size = ROBUST_JSON.stat().st_size

    with open(ROBUST_JSON, "rb") as f_in:
        robust_gz = gzip.compress(f_in.read())
    robust_gz_size = len(robust_gz)

    print(f"\nRobust LeNet-5 Precomputation Summary")
    print(f"========================================")
    print(f"Clean accuracy: {clean_acc:.1%}")
    print(f"Robust accuracy (ε=0.3): {robust_acc:.1%}")
    print(f"Images where attack fails (ε* > 0.35): {n_failed}/50")
    print(f"Images where attack succeeds: {n_successful}/50")
    if successful_eps:
        print(f"  Mean ε* (successful): {mean_eps:.3f}")
    print(f"Active pixels per image: {avg_active:.0f} avg ({avg_active / 784 * 100:.1f}%)")
    print(f"Output: {ROBUST_JSON}")
    print(f"  Size: {robust_size / 1e6:.2f} MB (gzipped: {robust_gz_size / 1e6:.2f} MB)")

    # ── Part B: 3D Surface Data ──
    images_3d, contour_count, pgd_vis, cw_vis = generate_3d_surface_data(
        standard_model, standard_data
    )

    surface_output = {
        "subspace_info": {
            "description": "v1 = normalized FGSM direction, v2 = orthogonal gradient component",
            "grid_range": [-0.4, 0.4],
            "grid_size": 80,
        },
        "images": images_3d,
    }

    with open(SURFACE_JSON, "w") as f:
        json.dump(surface_output, f)
    surface_size = SURFACE_JSON.stat().st_size

    with open(SURFACE_JSON, "rb") as f_in:
        surface_gz = gzip.compress(f_in.read())
    surface_gz_size = len(surface_gz)

    print(f"\n3D Surface Data Summary")
    print(f"========================================")
    print(f"Grid: 80×80, range [-0.4, 0.4]")
    print(f"PGD paths visible: {pgd_vis}/50")
    print(f"C&W paths visible: {cw_vis}/50")
    print(f"Decision boundary contours extracted: {contour_count}/50")
    print(f"Output: {SURFACE_JSON}")
    print(f"  Size: {surface_size / 1e6:.1f} MB (gzipped: {surface_gz_size / 1e6:.1f} MB)")

    print("\nDone!")


if __name__ == "__main__":
    main()
