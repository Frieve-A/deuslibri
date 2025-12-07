#!/usr/bin/env python3
"""
Merge translated chunks into final content.md
"""

from pathlib import Path

CHUNKS_DIR = Path("content/books/2025-12/gods-bootloader/en/.chunks")
OUTPUT_FILE = Path("content/books/2025-12/gods-bootloader/en/content.md")

# Chunks in order
chunk_files = [
    "00_prologue.md",
    "01_part_one.md",
    "02_part_two.md",
    "03_chapter_four.md",
    "04_part_three_a.md",
    "05_part_three_b.md",
    "06_epilogue.md",
]

print("Merging translated chunks...")

merged_content = []

for chunk_file in chunk_files:
    chunk_path = CHUNKS_DIR / chunk_file
    print(f"Reading {chunk_file}...")

    with open(chunk_path, 'r', encoding='utf-8') as f:
        content = f.read()
        merged_content.append(content)

# Join with single newline (chunks already end with newlines)
final_content = '\n'.join(merged_content)

# Write to output
OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    f.write(final_content)

print(f"\n✓ Translation merged successfully!")
print(f"Output: {OUTPUT_FILE}")
print(f"Total length: {len(final_content):,} characters")
print(f"Total chunks merged: {len(chunk_files)}")
