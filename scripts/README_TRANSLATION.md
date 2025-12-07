# Book Translation Scripts

This directory contains scripts for translating book content using Claude API.

## Main Script: `translate_book.py`

A generic translation script that can translate book content between any languages using Claude's API.

### Features

- **Language-agnostic**: Supports translation between any language pairs
- **Chunk-based processing**: Automatically splits large files into manageable sections
- **Caching**: Saves translated chunks to avoid re-translating on interruption
- **Customizable prompts**: Use default prompts or provide custom ones via config file
- **Multiple models**: Support for different Claude models (Opus, Sonnet, Haiku)

### Prerequisites

```bash
# Install required packages
pip install anthropic pyyaml

# Set your API key
export ANTHROPIC_API_KEY="your-api-key-here"
```

### Basic Usage

#### Japanese to English

```bash
python translate_book.py \
  --source content/books/2025-12/my-book/ja/content.md \
  --target en \
  --from-lang ja \
  --to-lang en
```

#### English to Japanese

```bash
python translate_book.py \
  --source content/books/2025-12/my-book/en/content.md \
  --target ja \
  --from-lang en \
  --to-lang ja
```

### Advanced Usage

#### Using Custom Configuration

Create a configuration file based on `translation_config.example.yml`:

```bash
cp translation_config.example.yml my_translation_config.yml
# Edit my_translation_config.yml with your custom prompts
```

Then use it:

```bash
python translate_book.py \
  --source content/books/2025-12/my-book/ja/content.md \
  --target en \
  --from-lang ja \
  --to-lang en \
  --config my_translation_config.yml
```

#### Using Different Models

```bash
# Use Sonnet for faster/cheaper translation
python translate_book.py \
  --source ja/content.md \
  --target en \
  --from-lang ja \
  --to-lang en \
  --model claude-sonnet-4-5-20250929

# Use Haiku for quick drafts
python translate_book.py \
  --source ja/content.md \
  --target en \
  --from-lang ja \
  --to-lang en \
  --model claude-haiku-4-5-20250929
```

#### Adjusting Translation Style

```bash
# More creative translation (higher temperature)
python translate_book.py \
  --source ja/content.md \
  --target en \
  --from-lang ja \
  --to-lang en \
  --temperature 0.7

# More literal translation (lower temperature)
python translate_book.py \
  --source ja/content.md \
  --target en \
  --from-lang ja \
  --to-lang en \
  --temperature 0.1
```

#### Full Path Output

```bash
# Specify exact output directory
python translate_book.py \
  --source content/books/2025-12/my-book/ja/content.md \
  --target content/books/2025-12/my-book/en-us \
  --from-lang ja \
  --to-lang en
```

### Command-Line Options

| Option | Required | Description |
|--------|----------|-------------|
| `--source` | Yes | Path to source content.md file |
| `--target` | Yes | Target language code (e.g., "en", "ja") or full output path |
| `--from-lang` | Yes | Source language code (e.g., "ja", "en") |
| `--to-lang` | Yes | Target language code (e.g., "en", "ja") |
| `--config` | No | Path to YAML configuration file |
| `--model` | No | Claude model to use (default: claude-opus-4-5-20251101) |
| `--temperature` | No | Temperature 0.0-1.0 (default: 0.3) |
| `--api-key` | No | API key (default: ANTHROPIC_API_KEY env var) |
| `--skip-cache` | No | Ignore cached translations and retranslate all chunks |

### How It Works

1. **Split**: The script splits the source `content.md` into sections based on `# ` headers
2. **Translate**: Each section is translated independently using Claude API
3. **Cache**: Translated chunks are saved in `.translation_chunks/` directory
4. **Merge**: All translated sections are merged into final `content.md`

### Output Structure

```
target-language-dir/
├── content.md                  # Final translated content
└── .translation_chunks/        # Temporary translation chunks
    ├── 00_section_name_JA.md   # Original chunk
    ├── 00_section_name_EN.md   # Translated chunk
    ├── 01_section_name_JA.md
    ├── 01_section_name_EN.md
    └── ...
```

### Resume Interrupted Translation

If translation is interrupted, simply run the same command again. The script will:
- Load previously translated chunks from `.translation_chunks/`
- Only translate sections that haven't been completed
- Merge everything at the end

To force re-translation of all chunks:

```bash
python translate_book.py \
  --source ja/content.md \
  --target en \
  --from-lang ja \
  --to-lang en \
  --skip-cache
```

### Cleanup

After verifying the translation, you can remove temporary chunks:

```bash
rm -rf content/books/2025-12/my-book/en/.translation_chunks
```

## Configuration File Format

See `translation_config.example.yml` for a complete example with comments.

```yaml
# Optional: Override model
model: "claude-opus-4-5-20251101"

# Optional: Override temperature
temperature: 0.3

# Optional: Custom prompts
prompts:
  system: |
    You are a professional translator...

  user_template: |
    Translate the following text:

    {chunk_text}

    Provide only the translation.
```

**Important**: The `user_template` must include `{chunk_text}` placeholder.

## Supported Language Pairs

The script includes built-in high-quality prompts for:
- **ja → en**: Japanese to English (philosophical/literary)
- **en → ja**: English to Japanese (philosophical/literary)

For other language pairs, the script will use a generic prompt. You can provide custom prompts via configuration file for best results.

## Tips for Best Results

1. **Use Opus for literary works**: Claude Opus 4.5 provides the highest quality for nuanced translation
2. **Lower temperature for technical content**: Use 0.1-0.2 for technical/precise translation
3. **Higher temperature for creative works**: Use 0.4-0.6 for more creative interpretation
4. **Custom prompts for specialized content**: Create a config file with domain-specific instructions
5. **Review chunks individually**: Check `.translation_chunks/` during long translations to catch issues early

## Example: Translating "God's Bootloader"

```bash
# Japanese to English
python translate_book.py \
  --source content/books/2025-12/gods-bootloader/ja/content.md \
  --target en \
  --from-lang ja \
  --to-lang en \
  --model claude-opus-4-5-20251101 \
  --temperature 0.3
```

## Troubleshooting

### "ANTHROPIC_API_KEY not set"

Set your API key:
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Or pass it directly:
```bash
python translate_book.py --api-key "sk-ant-..." ...
```

### Translation quality issues

1. Try lowering temperature: `--temperature 0.2`
2. Use a better model: `--model claude-opus-4-5-20251101`
3. Create custom prompts in a config file
4. Review the system prompt in the script for the language pair

### Out of memory / API errors

The script processes one chunk at a time, so memory shouldn't be an issue. If you hit API rate limits:
- Wait a few minutes and run again (it will resume)
- Check your API tier limits

## Legacy Scripts

- `translate_gods_bootloader.py`: Original script specific to God's Bootloader book (deprecated, use `translate_book.py` instead)
