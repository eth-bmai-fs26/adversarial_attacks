#!/usr/bin/env python3
"""
Train a Keras LeNet-5 on MNIST and export to TensorFlow.js format.

This produces the same architecture as the PyTorch model used for precomputation,
but in a format TF.js can load directly in the browser.

Usage:
    pip install tensorflow tensorflowjs
    python train_keras_lenet5.py

Output:
    ../public/models/lenet5_tfjs/model.json
    ../public/models/lenet5_tfjs/group1-shard1of1.bin
"""

import os
import numpy as np

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers


def build_lenet5():
    """LeNet-5 matching the PyTorch version used in generate_data.py."""
    model = keras.Sequential([
        layers.Input(shape=(28, 28, 1)),
        layers.Conv2D(6, kernel_size=5, padding="same", activation="relu"),
        layers.AvgPool2D(pool_size=2),
        layers.Conv2D(16, kernel_size=5, activation="relu"),
        layers.AvgPool2D(pool_size=2),
        layers.Flatten(),
        layers.Dense(120, activation="relu"),
        layers.Dense(84, activation="relu"),
        layers.Dense(10),  # Raw logits — no softmax
    ])
    return model


def main():
    # Load MNIST
    (x_train, y_train), (x_test, y_test) = keras.datasets.mnist.load_data()
    x_train = x_train.astype("float32") / 255.0
    x_test = x_test.astype("float32") / 255.0
    x_train = x_train[..., np.newaxis]
    x_test = x_test[..., np.newaxis]

    model = build_lenet5()
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=1e-3),
        loss=keras.losses.SparseCategoricalCrossentropy(from_logits=True),
        metrics=["accuracy"],
    )

    print("Training LeNet-5...")
    model.fit(
        x_train, y_train,
        epochs=10,
        batch_size=128,
        validation_data=(x_test, y_test),
        verbose=1,
    )

    loss, acc = model.evaluate(x_test, y_test, verbose=0)
    print(f"Test accuracy: {acc:.4f}")

    # Save as Keras format first
    keras_path = os.path.join(os.path.dirname(__file__), "models", "lenet5_keras.keras")
    os.makedirs(os.path.dirname(keras_path), exist_ok=True)
    model.save(keras_path)
    print(f"Saved Keras model to {keras_path}")

    # Convert to TF.js
    output_dir = os.path.join(
        os.path.dirname(__file__), "..", "public", "models", "lenet5_tfjs"
    )
    os.makedirs(output_dir, exist_ok=True)

    try:
        import tensorflowjs as tfjs
        tfjs.converters.save_keras_model(model, output_dir)
        print(f"Saved TF.js model to {output_dir}")
    except ImportError:
        print("tensorflowjs not installed. Run:")
        print(f"  tensorflowjs_converter --input_format keras {keras_path} {output_dir}")


if __name__ == "__main__":
    main()
