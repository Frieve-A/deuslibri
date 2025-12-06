"""
Create a multi-resolution favicon.ico file from a PNG image.

This script creates an ICO file containing multiple resolutions (16x16, 32x32, 48x48, 64x64)
by constructing the ICO file format at the binary level.
"""

from PIL import Image
import io
import struct
import sys
import os


def create_multi_size_ico(input_path, output_path, sizes):
    """
    Create a multi-resolution ICO file.

    Args:
        input_path: Path to the input PNG image
        output_path: Path to the output ICO file
        sizes: List of sizes (e.g., [16, 32, 48, 64])
    """
    # Open the source image
    base_img = Image.open(input_path)

    # Generate PNG data for each size
    png_data_list = []
    for size in sizes:
        # Resize the image
        resized = base_img.resize((size, size), Image.Resampling.LANCZOS)

        # Convert to PNG bytes
        png_buffer = io.BytesIO()
        resized.save(png_buffer, format='PNG')
        png_bytes = png_buffer.getvalue()
        png_data_list.append((size, png_bytes))

    # Build ICO file header
    ico_header = struct.pack(
        '<HHH',  # Little-endian: 2 bytes x 3
        0,       # Reserved (0)
        1,       # Type (1 = ICO)
        len(sizes)  # Number of images
    )

    # Build directory entries for each image
    offset = 6 + (16 * len(sizes))  # Header(6) + Directory entries(16 * n)
    directory_entries = b''

    for size, png_bytes in png_data_list:
        # ICO directory entry (16 bytes)
        width = size if size < 256 else 0
        height = size if size < 256 else 0

        entry = struct.pack(
            '<BBBBHHII',
            width,           # Width (0 = 256)
            height,          # Height (0 = 256)
            0,               # Color palette count (0 = no palette)
            0,               # Reserved (0)
            1,               # Color planes
            32,              # Bit depth (32-bit RGBA)
            len(png_bytes),  # Image data size
            offset           # Image data offset
        )
        directory_entries += entry
        offset += len(png_bytes)

    # Write ICO file
    with open(output_path, 'wb') as f:
        # Write header
        f.write(ico_header)

        # Write directory entries
        f.write(directory_entries)

        # Write PNG data for each image
        for _, png_bytes in png_data_list:
            f.write(png_bytes)


if __name__ == '__main__':
    # Configuration
    input_image_path = "public/icons/icon-192x192.png"
    output_favicon_path = "public/favicon.ico"
    sizes = [16, 32, 48, 64]

    print("[INFO] Creating favicon.ico...")
    print(f"  Input: {input_image_path}")
    print(f"  Output: {output_favicon_path}")
    print(f"  Sizes: {', '.join([f'{s}x{s}' for s in sizes])}")

    try:
        create_multi_size_ico(input_image_path, output_favicon_path, sizes)

        print(f"\n[OK] favicon.ico created successfully!")
        print(f"     File size: {os.path.getsize(output_favicon_path)} bytes")
        print(f"     Included sizes: {', '.join([f'{s}x{s}' for s in sizes])}")

    except Exception as e:
        print(f"[ERROR] An error occurred: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
