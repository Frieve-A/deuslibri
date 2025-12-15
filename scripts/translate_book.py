#!/usr/bin/env python3
"""
Generic translation script for book content using Claude API.
Splits large markdown files into logical chunks, translates each with Claude API,
then merges them back together.

Usage:
    python translate_book.py --source ja/content.md --target en --from-lang ja --to-lang en
    python translate_book.py --source en/content.md --target ja --from-lang en --to-lang ja --config translation_config.yml
"""

import os
import re
import sys
import argparse
import anthropic
from pathlib import Path
from typing import Optional

# Optional YAML support for config files
try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False

# Default translation prompts by language pair
DEFAULT_TRANSLATION_PROMPTS = {
    "ja_to_en": {
        "system": """You are a world-class literary translator specializing in philosophical and speculative fiction.
Your task is to translate Japanese text to English with the highest quality possible.

Guidelines:
1. Preserve the philosophical depth and poetic nuance of the original
2. Maintain the formal, contemplative tone
3. Use sophisticated English that matches the intellectual level of the source
4. Preserve all markdown formatting, image references, and structure exactly
5. Technical terms (e.g., "ASI", "Compute", "Singularity") should remain in English
6. Translate Japanese terms in parentheses appropriately (e.g., "知能暦(Anno Intelligentia)" → keep both)
7. Preserve section breaks (---) and spacing
8. Maintain the rhythm and cadence where possible
9. When Japanese text includes English terms in parentheses, preserve them
10. For poetic or philosophical passages, prioritize capturing the essence over literal translation
11. Make it into natural expressions as if originally written in English
12. Convert to terms, currencies, examples, and metaphors that naturally make sense in English-speaking cultures""",
        "user_template": """Please translate the following Japanese text to English with the highest literary quality.
Preserve all markdown formatting exactly as it appears.

Japanese text:

{chunk_text}

Please provide ONLY the English translation, maintaining all formatting."""
    },
    "en_to_ja": {
        "system": """あなたは哲学的思弁小説を専門とする世界最高峰の文芸翻訳者です。
英語のテキストを最高品質で日本語に翻訳することがあなたの任務です。

ガイドライン:
1. 原文の哲学的深さと詩的ニュアンスを保持する
2. 格調高く思索的なトーンを維持する
3. 原文の知的レベルに相応しい洗練された日本語を使用する
4. マークダウンの書式、画像参照、構造を正確に保持する
5. 専門用語（例: "ASI", "Compute", "Singularity"）は適切に翻訳するか、必要に応じて原語を併記する
6. セクション区切り（---）と間隔を保持する
7. 可能な限りリズムと韻律を維持する
8. 詩的または哲学的な箇所では、逐語訳よりも本質を捉えることを優先する""",
        "user_template": """以下の英語テキストを最高の文学的品質で日本語に翻訳してください。

マークダウンの書式を正確に保持してください。

英語テキスト:

{chunk_text}

書式を維持したまま、日本語訳のみを提供してください。"""
    }
}

def load_config(config_path: Optional[Path]) -> dict:
    """Load configuration from YAML file if provided."""
    if not config_path or not config_path.exists():
        return {}

    if not HAS_YAML:
        print("Warning: PyYAML not installed. Config file will be ignored.")
        print("Install with: pip install pyyaml")
        return {}

    with open(config_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f) or {}

def get_translation_prompt(from_lang: str, to_lang: str, config: dict) -> tuple[str, str]:
    """
    Get translation prompts (system and user template) for the language pair.
    First checks config, then falls back to defaults.
    """
    # Check config for custom prompts
    if 'prompts' in config:
        prompts = config['prompts']
        if 'system' in prompts and 'user_template' in prompts:
            return prompts['system'], prompts['user_template']

    # Fall back to defaults
    key = f"{from_lang}_to_{to_lang}"
    if key in DEFAULT_TRANSLATION_PROMPTS:
        prompts = DEFAULT_TRANSLATION_PROMPTS[key]
        return prompts['system'], prompts['user_template']

    # Generic fallback
    return (
        f"You are a professional translator. Translate from {from_lang} to {to_lang} while preserving markdown formatting and the original tone.",
        "Please translate the following text:\n\n{chunk_text}\n\nProvide only the translation, maintaining all formatting."
    )

def split_by_sections(content: str) -> list[tuple[str, str]]:
    """
    Split content into logical sections based on markdown headers.
    Returns list of (section_name, content) tuples.
    """
    sections = []
    current_section = "front_matter"
    current_content = []

    lines = content.split('\n')

    for i, line in enumerate(lines):
        # Detect major section headers
        if line.startswith('# '):
            # Save previous section
            if current_content:
                sections.append((current_section, '\n'.join(current_content)))
                current_content = []

            # Start new section
            # Clean the header for filename
            section_name = line[2:].strip()
            # Remove special characters for filename
            clean_name = re.sub(r'[^\w\s-]', '', section_name)
            clean_name = re.sub(r'[-\s]+', '_', clean_name)
            current_section = f"section_{len(sections):02d}_{clean_name[:50]}"

        current_content.append(line)

    # Don't forget the last section
    if current_content:
        sections.append((current_section, '\n'.join(current_content)))

    return sections

def translate_chunk(
    client: anthropic.Anthropic,
    chunk_text: str,
    chunk_name: str,
    system_prompt: str,
    user_template: str,
    model: str,
    temperature: float
) -> str:
    """
    Translate a single chunk using Claude API with specified settings.
    """
    print(f"Translating {chunk_name}...")

    user_prompt = user_template.format(chunk_text=chunk_text)

    message = client.messages.create(
        model=model,
        max_tokens=16000,
        temperature=temperature,
        system=system_prompt,
        messages=[
            {
                "role": "user",
                "content": user_prompt
            }
        ]
    )

    translated = message.content[0].text
    print(f"✓ Completed {chunk_name}")
    return translated

def main():
    """Main translation workflow"""
    parser = argparse.ArgumentParser(
        description="Translate book content using Claude API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Translate Japanese to English
  python translate_book.py --source content/books/2025-12/my-book/ja/content.md \\
                          --target en --from-lang ja --to-lang en

  # Translate with custom config
  python translate_book.py --source ja/content.md --target en \\
                          --from-lang ja --to-lang en \\
                          --config translation_config.yml

  # Use different model and temperature
  python translate_book.py --source ja/content.md --target en \\
                          --from-lang ja --to-lang en \\
                          --model claude-sonnet-4-5-20250929 \\
                          --temperature 0.5
        """
    )

    parser.add_argument(
        '--source',
        required=True,
        type=Path,
        help='Path to source content.md file'
    )
    parser.add_argument(
        '--target',
        required=True,
        help='Target language code (e.g., "en", "ja") or full path to output directory'
    )
    parser.add_argument(
        '--from-lang',
        required=True,
        help='Source language code (e.g., "ja", "en")'
    )
    parser.add_argument(
        '--to-lang',
        required=True,
        help='Target language code (e.g., "en", "ja")'
    )
    parser.add_argument(
        '--config',
        type=Path,
        help='Optional YAML configuration file for custom prompts and settings'
    )
    parser.add_argument(
        '--model',
        default='claude-opus-4-5-20251101',
        help='Claude model to use (default: claude-opus-4-5-20251101)'
    )
    parser.add_argument(
        '--temperature',
        type=float,
        default=0.3,
        help='Temperature for translation (default: 0.3 for consistent, careful translation)'
    )
    parser.add_argument(
        '--api-key',
        help='Anthropic API key (default: ANTHROPIC_API_KEY environment variable)'
    )
    parser.add_argument(
        '--skip-cache',
        action='store_true',
        help='Ignore cached translations and retranslate all chunks'
    )

    args = parser.parse_args()

    # Get API key
    api_key = args.api_key or os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY not set. Use --api-key or set environment variable.")
        return 1

    # Validate source file
    if not args.source.exists():
        print(f"Error: Source file not found: {args.source}")
        return 1

    # Determine output directory
    if '/' in args.target or '\\' in args.target:
        # Full path provided
        output_dir = Path(args.target)
    else:
        # Language code provided, construct path relative to source
        source_parent = args.source.parent.parent
        output_dir = source_parent / args.target

    chunks_dir = output_dir / ".translation_chunks"

    # Load configuration
    config = load_config(args.config)

    # Get translation prompts
    system_prompt, user_template = get_translation_prompt(
        args.from_lang,
        args.to_lang,
        config
    )

    # Override model and temperature from config if provided
    model = config.get('model', args.model)
    temperature = config.get('temperature', args.temperature)

    # Initialize API client
    client = anthropic.Anthropic(api_key=api_key)

    # Create output directories
    output_dir.mkdir(parents=True, exist_ok=True)
    chunks_dir.mkdir(parents=True, exist_ok=True)

    print(f"Translation Settings:")
    print(f"  Source: {args.source}")
    print(f"  Target: {output_dir}")
    print(f"  From: {args.from_lang} → To: {args.to_lang}")
    print(f"  Model: {model}")
    print(f"  Temperature: {temperature}")
    print()

    print("Loading source file...")
    with open(args.source, 'r', encoding='utf-8') as f:
        source_content = f.read()

    print(f"Source file loaded: {len(source_content)} characters")

    # Split into sections
    print("Splitting into logical sections...")
    sections = split_by_sections(source_content)
    print(f"Split into {len(sections)} sections")
    print()

    # Translate each section
    translated_sections = []

    for i, (section_name, section_content) in enumerate(sections):
        chunk_file = chunks_dir / f"{i:02d}_{section_name}.md"
        source_lang_suffix = args.from_lang.upper()
        target_lang_suffix = args.to_lang.upper()
        source_chunk_file = chunks_dir / f"{i:02d}_{section_name}_{source_lang_suffix}.md"
        translated_file = chunks_dir / f"{i:02d}_{section_name}_{target_lang_suffix}.md"

        # Save original chunk
        with open(source_chunk_file, 'w', encoding='utf-8') as f:
            f.write(section_content)

        # Check if already translated
        if translated_file.exists() and not args.skip_cache:
            print(f"Loading cached translation for {section_name}...")
            with open(translated_file, 'r', encoding='utf-8') as f:
                translated_content = f.read()
        else:
            # Translate
            translated_content = translate_chunk(
                client,
                section_content,
                section_name,
                system_prompt,
                user_template,
                model,
                temperature
            )

            # Save translated chunk
            with open(translated_file, 'w', encoding='utf-8') as f:
                f.write(translated_content)

        translated_sections.append(translated_content)

        print(f"Progress: {i+1}/{len(sections)}")
        print()

    # Merge all translated sections
    print("Merging translated sections...")
    final_translation = '\n'.join(translated_sections)

    # Save final translation
    output_file = output_dir / "content.md"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(final_translation)

    print(f"\n✓ Translation complete!")
    print(f"Output saved to: {output_file}")
    print(f"Total sections: {len(sections)}")
    print(f"Output length: {len(final_translation)} characters")
    print(f"\nTemporary chunks saved in: {chunks_dir}")
    print(f"You can delete this directory after verifying the translation.")

    return 0

if __name__ == "__main__":
    exit(main())
