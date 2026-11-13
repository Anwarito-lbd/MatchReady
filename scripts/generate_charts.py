"""Measure real MatchReady studio pipeline & validation timings and plot empirical proof charts."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import matplotlib.pyplot as plt
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from backend.app.pipeline import STYLE_PRESETS, DeterministicStudioAdapter
from backend.app.validation import validate_image_upload


def main() -> None:
    demo_path = REPO_ROOT / "public" / "examples" / "demo-input.png"
    payload = demo_path.read_bytes()

    val_times_ms: list[float] = []
    for _ in range(5):
        t0 = time.perf_counter()
        validate_image_upload(
            filename="demo-input.png",
            content_type="image/png",
            payload=payload,
        )
        val_times_ms.append((time.perf_counter() - t0) * 1000.0)

    adapter = DeterministicStudioAdapter()
    with Image.open(demo_path) as im:
        src = im.copy()

    style_labels: list[str] = []
    latencies_ms: list[float] = []
    luminances: list[float] = []
    telemetry: dict[str, object] = {
        "validationAvgMs": round(sum(val_times_ms) / len(val_times_ms), 2),
        "styles": [],
    }

    for style_id, cfg in STYLE_PRESETS.items():
        res = adapter.generate(src, cfg)
        luma = float(res.metrics["meanLuminance"])
        style_labels.append(cfg.label.replace(" ", "\n"))
        latencies_ms.append(res.processing_ms)
        luminances.append(luma)
        telemetry["styles"].append(
            {
                "id": style_id,
                "label": cfg.label,
                "processingMs": res.processing_ms,
                "inputContrastStd": float(res.metrics["inputContrastStd"]),
                "outputContrastStd": float(res.metrics["outputContrastStd"]),
                "meanLuminance": luma,
            }
        )

    out_dir = REPO_ROOT / "docs" / "images"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "benchmark_metrics.json").write_text(json.dumps(telemetry, indent=2), encoding="utf-8")

    plt.rcParams.update({"font.family": "DejaVu Sans", "axes.edgecolor": "#D0CEC9"})
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12.0, 5.2), dpi=180, constrained_layout=True)
    fig.patch.set_facecolor("#FFFFFF")

    colors = ["#0A66C2", "#1D2226", "#378FE9", "#004182"]
    bars1 = ax1.bar(style_labels, latencies_ms, color=colors, width=0.52)
    ax1.set_title("Deterministic Studio Processing Time (ms)", fontsize=11, fontweight="bold", color="#1D2226", pad=10)
    ax1.set_ylabel("Wall Time (ms)", fontsize=9.5, color="#5E6B73")
    ax1.set_facecolor("#FAF9F7")
    ax1.grid(axis="y", linestyle="--", alpha=0.45)
    ax1.set_axisbelow(True)
    ax1.tick_params(axis="x", labelsize=8.5)
    for bar, val in zip(bars1, latencies_ms):
        ax1.text(
            bar.get_x() + bar.get_width() / 2,
            val + max(latencies_ms) * 0.025,
            f"{val:.0f} ms",
            ha="center",
            va="bottom",
            fontsize=8.5,
            fontweight="bold",
            color="#1D2226",
        )
    ax1.set_ylim(0, max(latencies_ms) * 1.18)

    bars2 = ax2.bar(style_labels, luminances, color=["#1B365D", "#4A515A", "#6BA4D9", "#0A66C2"], width=0.52)
    ax2.set_title("Output Mean Luminance (Rec. 709 Y)", fontsize=11, fontweight="bold", color="#1D2226", pad=10)
    ax2.set_ylabel("Normalized Luminance [0, 1]", fontsize=9.5, color="#5E6B73")
    ax2.set_facecolor("#FAF9F7")
    ax2.grid(axis="y", linestyle="--", alpha=0.45)
    ax2.set_axisbelow(True)
    ax2.tick_params(axis="x", labelsize=8.5)
    for bar, val in zip(bars2, luminances):
        ax2.text(
            bar.get_x() + bar.get_width() / 2,
            val + 0.02,
            f"{val:.3f}",
            ha="center",
            va="bottom",
            fontsize=8.5,
            fontweight="bold",
            color="#0A66C2",
        )
    ax2.set_ylim(0, 0.85)

    fig.suptitle(
        f"MatchReady Local Studio Pipeline Telemetry (5-Layer Upload Validation Avg: {telemetry['validationAvgMs']} ms)",
        fontsize=12.5,
        fontweight="bold",
        color="#0A66C2",
    )
    fig.savefig(out_dir / "pipeline-benchmark.png", dpi=180)
    plt.close(fig)
    print(json.dumps(telemetry, indent=2))


if __name__ == "__main__":
    main()
