"""
Verify that a favicon.ico file contains multiple resolutions.

This script analyzes the ICO file structure at the binary level to verify
that it contains all expected image sizes.
"""

import struct
import sys
import os


def read_ico_file(filepath):
    """
    Read and parse ICO file structure.

    Args:
        filepath: Path to the ICO file

    Returns:
        List of dictionaries containing image information
    """
    with open(filepath, 'rb') as f:
        # ICONDIR header (6 bytes)
        reserved = struct.unpack('<H', f.read(2))[0]
        image_type = struct.unpack('<H', f.read(2))[0]
        num_images = struct.unpack('<H', f.read(2))[0]

        print(f"[ICO Header Information]")
        print(f"  Reserved: {reserved} (expected: 0)")
        print(f"  Type: {image_type} (1=ICO, 2=CUR)")
        print(f"  Number of images: {num_images}")
        print()

        # Read directory entries for each image (16 bytes each)
        print(f"[Image Directory Entries]")
        entries = []
        for i in range(num_images):
            width = struct.unpack('<B', f.read(1))[0]
            height = struct.unpack('<B', f.read(1))[0]
            colors = struct.unpack('<B', f.read(1))[0]
            reserved2 = struct.unpack('<B', f.read(1))[0]
            color_planes = struct.unpack('<H', f.read(2))[0]
            bits_per_pixel = struct.unpack('<H', f.read(2))[0]
            data_size = struct.unpack('<I', f.read(4))[0]
            data_offset = struct.unpack('<I', f.read(4))[0]

            # Width and height of 0 means 256
            actual_width = 256 if width == 0 else width
            actual_height = 256 if height == 0 else height

            print(f"  Image {i + 1}:")
            print(f"    Size: {actual_width}x{actual_height}")
            print(f"    Colors: {colors}")
            print(f"    Color planes: {color_planes}")
            print(f"    Bit depth: {bits_per_pixel}")
            print(f"    Data size: {data_size} bytes")
            print(f"    Data offset: {data_offset}")

            entries.append({
                'width': actual_width,
                'height': actual_height,
                'data_size': data_size,
                'data_offset': data_offset
            })

        return entries


if __name__ == '__main__':
    ico_path = 'public/favicon.ico'

    if not os.path.exists(ico_path):
        print(f"[ERROR] File not found: {ico_path}")
        sys.exit(1)

    print(f"ICO File Analysis: {ico_path}\n")
    print("=" * 60)

    try:
        entries = read_ico_file(ico_path)
        print()
        print("=" * 60)
        print(f"\n[Result] Total {len(entries)} images found")

        sizes = [(e['width'], e['height']) for e in entries]
        print(f"Sizes: {', '.join([f'{w}x{h}' for w, h in sizes])}")

        # Verify expected sizes
        expected_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
        if set(sizes) == set(expected_sizes):
            print("\n[OK] All expected sizes are present!")
        else:
            missing = set(expected_sizes) - set(sizes)
            extra = set(sizes) - set(expected_sizes)
            if missing:
                print(f"\n[WARNING] Missing sizes: {missing}")
            if extra:
                print(f"\n[WARNING] Extra sizes: {extra}")

    except Exception as e:
        print(f"[ERROR] An error occurred: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
