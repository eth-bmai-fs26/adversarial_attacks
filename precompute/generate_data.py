"""
Precomputation pipeline for Standard LeNet-5 FGSM adversarial attack visualization.

Trains (or loads) a standard LeNet-5 on MNIST, curates 50 images (5 per digit),
and precomputes all data needed by the browser visualization.

Output: ../public/data/standard_model.json
"""

import json
import gzip
import os
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms

# Paths
SCRIPT_DIR = Path(__file__).parent
MODEL_PATH = SCRIPT_DIR / "models" / "lenet5_standard.pt"
OUTPUT_PATH = SCRIPT_DIR.parent / "public" / "data" / "standard_model.json"

# Hyperparameters
NUM_IMAGES = 50
IMAGES_PER_CLASS = 5
NUM_EPS_STEPS = 100
EPS_MAX = 0.35
EPS_VALUES = np.linspace(0, EPS_MAX, NUM_EPS_STEPS).tolist()
EPS_STAR_MIN = 0.08
EPS_STAR_MAX = 0.25
CONFIDENCE_THRESHOLD = 0.95
BINARY_SEARCH_TOL = 0.001
FLOAT_ROUND = 4


class LeNet5(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 6, 5)
        self.conv2 = nn.Conv2d(6, 16, 5)
        self.fc1 = nn.Linear(256, 120)
        self.fc2 = nn.Linear(120, 84)
        self.fc3 = nn.Linear(84, 10)
        self.relu = nn.ReLU()
        self.pool = nn.MaxPool2d(2)

    def forward(self, x):
        x = self.pool(self.relu(self.conv1(x)))
        x = self.pool(self.relu(self.conv2(x)))
        x = x.view(x.size(0), -1)
        x = self.relu(self.fc1(x))
        x = self.relu(self.fc2(x))
        x = self.fc3(x)
        return x


def train_model(device):
    """Train LeNet-5 on MNIST to >=98.5% test accuracy."""
    print("Training LeNet-5...")
    transform = transforms.ToTensor()
    train_set = datasets.MNIST(root=str(SCRIPT_DIR / "data"), train=True, download=True, transform=transform)
    test_set = datasets.MNIST(root=str(SCRIPT_DIR / "data"), train=False, download=True, transform=transform)

    train_loader = torch.utils.data.DataLoader(train_set, batch_size=128, shuffle=True, num_workers=2)
    test_loader = torch.utils.data.DataLoader(test_set, batch_size=256, shuffle=False, num_workers=2)

    model = LeNet5().to(device)
    optimizer = optim.SGD(model.parameters(), lr=0.01, momentum=0.9)
    criterion = nn.CrossEntropyLoss()

    for epoch in range(1, 21):
        model.train()
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            loss = criterion(model(images), labels)
            loss.backward()
            optimizer.step()

        # Test accuracy
        model.eval()
        correct = 0
        total = 0
        with torch.no_grad():
            for images, labels in test_loader:
                images, labels = images.to(device), labels.to(device)
                preds = model(images).argmax(dim=1)
                correct += (preds == labels).sum().item()
                total += labels.size(0)
        acc = correct / total
        print(f"  Epoch {epoch}: {acc:.4f}")
        if acc >= 0.985:
            print(f"  Reached target accuracy {acc:.4f} at epoch {epoch}")
            break

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), MODEL_PATH)
    return model, acc


def load_or_train_model(device):
    """Load pretrained model or train from scratch."""
    model = LeNet5().to(device)
    if MODEL_PATH.exists():
        print(f"Loading model from {MODEL_PATH}")
        model.load_state_dict(torch.load(MODEL_PATH, map_location=device, weights_only=True))
        # Evaluate accuracy
        transform = transforms.ToTensor()
        test_set = datasets.MNIST(root=str(SCRIPT_DIR / "data"), train=False, download=True, transform=transform)
        test_loader = torch.utils.data.DataLoader(test_set, batch_size=256, shuffle=False, num_workers=2)
        model.eval()
        correct = 0
        total = 0
        with torch.no_grad():
            for images, labels in test_loader:
                images, labels = images.to(device), labels.to(device)
                preds = model(images).argmax(dim=1)
                correct += (preds == labels).sum().item()
                total += labels.size(0)
        acc = correct / total
        print(f"  Model accuracy: {acc:.4f}")
        return model, acc
    else:
        return train_model(device)


def compute_gradients(model, image, label, device):
    """Compute loss gradient and margin gradient for a single image."""
    x = image.unsqueeze(0).to(device).requires_grad_(True)
    logits = model(x)

    # Loss gradient: ∇_x J where J = CrossEntropy
    loss = nn.CrossEntropyLoss()(logits, torch.tensor([label], device=device))
    loss_grad = torch.autograd.grad(loss, x, create_graph=False)[0]
    loss_grad = loss_grad.squeeze()  # [1, 1, 28, 28] -> [1, 28, 28]

    # Margin gradient: ∇_x m where m = z_y - max_{k≠y} z_k
    x2 = image.unsqueeze(0).to(device).requires_grad_(True)
    logits2 = model(x2)
    true_logit = logits2[0, label]
    mask = torch.ones(10, device=device, dtype=torch.bool)
    mask[label] = False
    runner_up_logit = logits2[0, mask].max()
    margin = true_logit - runner_up_logit
    margin_grad = torch.autograd.grad(margin, x2, create_graph=False)[0]
    margin_grad = margin_grad.squeeze()

    return loss_grad, margin_grad


def binary_search_epsilon_star(model, image, label, loss_grad_sign, device):
    """Find ε* where classification first flips via binary search."""
    lo, hi = 0.0, EPS_MAX

    # First check if it flips at all
    x = image.unsqueeze(0).to(device)
    x_adv = torch.clamp(x + hi * loss_grad_sign.unsqueeze(0), 0, 1)
    with torch.no_grad():
        pred = model(x_adv).argmax(dim=1).item()
    if pred == label:
        return None, None  # No flip in range

    while hi - lo > BINARY_SEARCH_TOL:
        mid = (lo + hi) / 2
        x_adv = torch.clamp(x + mid * loss_grad_sign.unsqueeze(0), 0, 1)
        with torch.no_grad():
            pred = model(x_adv).argmax(dim=1).item()
        if pred == label:
            lo = mid
        else:
            hi = mid

    eps_star = (lo + hi) / 2
    # Find adversarial class at eps_star
    x_adv = torch.clamp(x + eps_star * loss_grad_sign.unsqueeze(0), 0, 1)
    with torch.no_grad():
        adv_class = model(x_adv).argmax(dim=1).item()

    return eps_star, adv_class


def compute_dead_pixel_mask(grad_magnitude_flat, loss_grad_flat):
    """Compute dead pixel mask with sign coherence check."""
    max_grad = grad_magnitude_flat.max()
    tau = 0.01 * max_grad

    active = grad_magnitude_flat >= tau

    # Check sign coherence among adjacent active pixels using loss gradient sign
    active_2d = active.reshape(28, 28)
    grad_sign_2d = np.sign(loss_grad_flat.reshape(28, 28))

    coherent = 0
    total_pairs = 0
    for i in range(28):
        for j in range(28):
            if not active_2d[i, j]:
                continue
            for di, dj in [(0, 1), (1, 0)]:
                ni, nj = i + di, j + dj
                if 0 <= ni < 28 and 0 <= nj < 28 and active_2d[ni, nj]:
                    total_pairs += 1
                    if grad_sign_2d[i, j] == grad_sign_2d[ni, nj]:
                        coherent += 1

    coherence = coherent / total_pairs if total_pairs > 0 else 1.0

    if coherence < 0.65:
        # Adjust to percentile 55
        tau = np.percentile(grad_magnitude_flat, 55)
        active = grad_magnitude_flat >= tau

    dead = ~active
    return dead, float(tau)


def check_multi_flip(model, image, loss_grad_sign, label, device):
    """Check if image flips to multiple classes across epsilon range."""
    x = image.unsqueeze(0).to(device)
    flipped_classes = set()
    for eps in EPS_VALUES:
        x_adv = torch.clamp(x + eps * loss_grad_sign.unsqueeze(0), 0, 1)
        with torch.no_grad():
            pred = model(x_adv).argmax(dim=1).item()
        if pred != label:
            flipped_classes.add(pred)
    return len(flipped_classes) > 1


def curate_images(model, device):
    """Select 50 images (5 per class) meeting quality criteria."""
    print("Curating images...")
    transform = transforms.ToTensor()
    test_set = datasets.MNIST(root=str(SCRIPT_DIR / "data"), train=False, download=True, transform=transform)
    test_loader = torch.utils.data.DataLoader(test_set, batch_size=1, shuffle=False)

    # Collect candidates per class
    candidates = {c: [] for c in range(10)}
    model.eval()

    for idx, (image, label) in enumerate(test_loader):
        label_val = label.item()
        if len(candidates[label_val]) >= 20:  # Collect more candidates than needed
            if all(len(v) >= 20 for v in candidates.values()):
                break
            continue

        image = image.to(device)
        x = image.requires_grad_(False)

        # Check confidence
        with torch.no_grad():
            logits = model(x)
            probs = torch.softmax(logits, dim=1)
            pred = logits.argmax(dim=1).item()
            conf = probs[0, label_val].item()

        if pred != label_val or conf < CONFIDENCE_THRESHOLD:
            continue

        # Compute gradients
        loss_grad, margin_grad = compute_gradients(model, image.squeeze(0), label_val, device)
        loss_grad_sign = torch.sign(loss_grad)  # [1, 28, 28]

        # Binary search for eps_star
        eps_star, adv_class = binary_search_epsilon_star(
            model, image.squeeze(0), label_val, loss_grad_sign, device
        )

        if eps_star is None:
            continue
        if eps_star < EPS_STAR_MIN or eps_star > EPS_STAR_MAX:
            continue

        # Check for clean single-class flip
        multi_flip = check_multi_flip(model, image.squeeze(0), loss_grad_sign, label_val, device)

        candidates[label_val].append({
            "idx": idx,
            "image": image.squeeze(0).cpu(),  # [1, 28, 28]
            "label": label_val,
            "confidence": conf,
            "eps_star": eps_star,
            "adv_class": adv_class,
            "loss_grad": loss_grad.cpu(),
            "margin_grad": margin_grad.cpu(),
            "loss_grad_sign": loss_grad_sign.cpu(),
            "multi_flip": multi_flip,
        })

    # Select best 5 per class: prefer single-flip, then sort by confidence
    selected = []
    for c in range(10):
        pool = candidates[c]
        # Prefer non-multi-flip
        pool.sort(key=lambda x: (x["multi_flip"], -x["confidence"]))
        selected.extend(pool[:IMAGES_PER_CLASS])
        if len(pool) < IMAGES_PER_CLASS:
            print(f"  WARNING: Only found {len(pool)} candidates for class {c}")

    print(f"  Selected {len(selected)} images")
    return selected


def compute_image_data(model, candidate, image_id, device):
    """Compute all precomputed data for a single image."""
    image = candidate["image"]  # [1, 28, 28]
    label = candidate["label"]
    loss_grad = candidate["loss_grad"]  # [1, 28, 28]
    margin_grad = candidate["margin_grad"]  # [1, 28, 28]
    loss_grad_sign = candidate["loss_grad_sign"]  # [1, 28, 28]

    pixels = image.squeeze().flatten().numpy()  # [784]
    loss_grad_flat = loss_grad.squeeze().flatten().numpy()
    margin_grad_flat = margin_grad.squeeze().flatten().numpy()
    grad_magnitude_flat = np.abs(loss_grad_flat)

    # Dead pixel mask
    dead_mask, tau = compute_dead_pixel_mask(grad_magnitude_flat, loss_grad_flat)

    # Apply dead pixel masking to sign: sign=0 for dead pixels
    loss_grad_sign_np = np.sign(loss_grad_flat).astype(int)
    loss_grad_sign_np[dead_mask] = 0

    # Recompute loss_grad_sign tensor with dead pixel masking for FGSM
    loss_grad_sign_masked = torch.from_numpy(loss_grad_sign_np.astype(np.float32)).reshape(1, 28, 28).to(device)

    # Logits at 100 epsilon values (FGSM attack)
    x = image.unsqueeze(0).to(device)  # [1, 1, 28, 28]
    logits_at_eps = []
    margin_at_eps = []
    probs_at_eps = []

    model.eval()
    for eps in EPS_VALUES:
        x_adv = torch.clamp(x + eps * loss_grad_sign_masked.unsqueeze(0), 0, 1)
        with torch.no_grad():
            logits = model(x_adv)
        logits_np = logits[0].cpu().numpy()
        logits_at_eps.append([round(float(v), 2) for v in logits_np])

        # Margin
        true_logit = logits_np[label]
        mask = np.ones(10, dtype=bool)
        mask[label] = False
        runner_up = logits_np[mask].max()
        margin_at_eps.append(round(float(true_logit - runner_up), 3))

        # Probabilities
        exp_logits = np.exp(logits_np - logits_np.max())
        probs = exp_logits / exp_logits.sum()
        probs_at_eps.append([round(float(v), 4) for v in probs])

    # Find epsilon_star_index
    eps_star = candidate["eps_star"]
    eps_arr = np.array(EPS_VALUES)
    eps_star_index = int(np.argmin(np.abs(eps_arr - eps_star)))

    # Dimensional scaling quantities
    l1_margin_gradient = float(np.abs(margin_grad_flat).sum())
    avg_pixel_sensitivity = float(np.abs(margin_grad_flat).mean())
    fgsm_margin_dot = float(np.sum(margin_grad_flat * loss_grad_sign_np))
    # Sign disagreement: fraction where sign(∂J/∂x_i) and sign(∂m/∂x_i) unexpectedly agree
    # Since ∇J ≈ -∇m (loss up = margin down), agreement means disagreement from expected
    sign_loss = np.sign(loss_grad_flat)
    sign_margin = np.sign(margin_grad_flat)
    nonzero = (sign_loss != 0) & (sign_margin != 0)
    sign_disagreement = float((sign_loss[nonzero] == sign_margin[nonzero]).mean()) if nonzero.any() else 0.0

    # Raw gradient attack (for Beat 2b comparison)
    raw_grad = loss_grad.squeeze().flatten().numpy()  # [784]
    raw_grad_linf = np.abs(raw_grad).max()
    if raw_grad_linf > 0:
        raw_grad_normalized = raw_grad / raw_grad_linf
    else:
        raw_grad_normalized = raw_grad
    raw_grad_tensor = torch.from_numpy(raw_grad_normalized.astype(np.float32)).reshape(1, 1, 28, 28).to(device)

    raw_gradient_attack_logits = []
    raw_gradient_flipped = []
    for eps in EPS_VALUES:
        x_adv = torch.clamp(x + eps * raw_grad_tensor, 0, 1)
        with torch.no_grad():
            logits = model(x_adv)
        logits_np = logits[0].cpu().numpy()
        raw_gradient_attack_logits.append([round(float(v), 2) for v in logits_np])
        raw_gradient_flipped.append(bool(logits_np.argmax() != label))

    # Store dead_pixel_mask as list of active indices (more compact)
    active_indices = np.where(~dead_mask)[0].tolist()

    # Check multi_flip
    multi_flip = candidate["multi_flip"]

    return {
        "id": image_id,
        "pixels": [round(float(v), 3) for v in pixels],
        "true_class": label,
        "adversarial_class": candidate["adv_class"],
        "loss_grad_sign": loss_grad_sign_np.tolist(),
        "margin_gradient": [round(float(v), FLOAT_ROUND) for v in margin_grad_flat],
        "grad_magnitude": [round(float(v), FLOAT_ROUND) for v in grad_magnitude_flat],
        "dead_pixel_mask": active_indices,
        "dead_pixel_threshold": round(float(tau), 6),
        "epsilon_values": [round(float(v), FLOAT_ROUND) for v in EPS_VALUES],
        "logits_at_eps": logits_at_eps,
        "margin_at_eps": margin_at_eps,
        "probs_at_eps": probs_at_eps,
        "epsilon_star": round(float(eps_star), FLOAT_ROUND),
        "epsilon_star_index": eps_star_index,
        "l1_margin_gradient": round(float(l1_margin_gradient), FLOAT_ROUND),
        "avg_pixel_sensitivity": round(float(avg_pixel_sensitivity), FLOAT_ROUND),
        "fgsm_margin_dot": round(float(fgsm_margin_dot), FLOAT_ROUND),
        "sign_disagreement_fraction": round(float(sign_disagreement), FLOAT_ROUND),
        "raw_gradient_attack_logits": [[round(float(v), FLOAT_ROUND) for v in row] for row in raw_gradient_attack_logits],
        "raw_gradient_flipped": raw_gradient_flipped,
        "multi_flip": multi_flip,
    }


def print_summary(output_data, output_path):
    """Print verification summary."""
    images = output_data["images"]
    eps_stars = [img["epsilon_star"] for img in images]
    dead_counts = [784 - len(img["dead_pixel_mask"]) for img in images]
    disagree = [img["sign_disagreement_fraction"] for img in images]

    easiest_idx = np.argmin(eps_stars)
    hardest_idx = np.argmax(eps_stars)
    easiest = images[easiest_idx]
    hardest = images[hardest_idx]

    # File sizes
    file_size = os.path.getsize(output_path)
    with open(output_path, "rb") as f:
        gz_size = len(gzip.compress(f.read()))

    print()
    print("Standard LeNet-5 Precomputation Summary")
    print("=" * 40)
    print(f"Model accuracy: {output_data['model_accuracy'] * 100:.1f}%")
    print(f"Images curated: {len(images)} ({IMAGES_PER_CLASS} per class)")
    print(f"Epsilon range: [0.0, {EPS_MAX}], {NUM_EPS_STEPS} steps")
    print(f"Epsilon* range: [{min(eps_stars):.2f}, {max(eps_stars):.2f}]")
    print(f"  Mean ε*: {np.mean(eps_stars):.3f}")
    print(f"  Easiest: image #{easiest['id']} (digit \"{easiest['true_class']}\", ε*={easiest['epsilon_star']:.3f})")
    print(f"  Hardest: image #{hardest['id']} (digit \"{hardest['true_class']}\", ε*={hardest['epsilon_star']:.3f})")
    print(f"Sign disagreement (loss vs margin): {np.mean(disagree) * 100:.1f}% avg")
    print(f"Dead pixels per image: {int(np.mean(dead_counts))} avg ({np.mean(dead_counts) / 784 * 100:.1f}%)")
    print(f"Output size: {file_size / 1e6:.2f} MB (gzipped: {gz_size / 1024:.0f} KB)")
    multi_count = sum(1 for img in images if img.get("multi_flip"))
    if multi_count:
        print(f"Multi-flip images: {multi_count}")

    # Verify margin at eps_star is near zero
    margins_at_star = []
    for img in images:
        idx = img["epsilon_star_index"]
        margins_at_star.append(abs(img["margin_at_eps"][idx]))
    print(f"Margin at ε* (should be ~0): max={max(margins_at_star):.2f}, mean={np.mean(margins_at_star):.2f}")


def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")
    print(f"Using device: {device}")

    # Load or train model
    model, accuracy = load_or_train_model(device)
    model.eval()

    # Curate images
    selected = curate_images(model, device)

    # Compute data for each image
    print("Computing per-image data...")
    image_data = []
    for i, candidate in enumerate(selected):
        print(f"  Processing image {i + 1}/{len(selected)} (class {candidate['label']}, ε*={candidate['eps_star']:.3f})")
        data = compute_image_data(model, candidate, i, device)
        image_data.append(data)

    # Build output
    output = {
        "model": "lenet5_standard",
        "model_accuracy": round(accuracy, 4),
        "images": image_data,
    }

    # Write JSON (compact, no extra whitespace)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, separators=(",", ":"))
    print(f"\nWrote {OUTPUT_PATH}")

    # Summary
    print_summary(output, OUTPUT_PATH)


if __name__ == "__main__":
    main()
