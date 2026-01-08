# Knowledge Gap Detector

An Obsidian plugin that detects knowledge gaps in your vault using embedding analysis and link graph inspection.

## Features

### 🔍 Sparse Region Detection
- Uses K-means clustering on note embeddings to identify low-density areas
- Reveals topics that may need more exploration
- Suggests related notes as starting points

### ❓ Undefined Concept Detection
- Finds `[[wikilinks]]` that reference non-existent notes
- Prioritizes concepts by mention frequency
- Shows where each concept is referenced

### 📊 Gap Report
- Visual summary of knowledge gaps
- Categorized by severity (significant, moderate, minor)
- Export to Markdown for review

### 💡 LLM-Powered Suggestions (Optional)
- Infers topics for sparse regions
- Generates content suggestions for undefined concepts
- Requires OpenAI API key

## Requirements

- **Vault Embeddings plugin** must be installed and have indexed your vault
  - This plugin reads embedding data from `09_Embedded/` folder
  - [Get Vault Embeddings](https://github.com/eohjun/obsidian-vault-embeddings)

## Installation

### Via BRAT (Recommended)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. Open BRAT settings
3. Click "Add Beta Plugin"
4. Enter: `eohjun/obsidian-knowledge-gap-detector`
5. Enable the plugin in Settings → Community Plugins

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create folder: `.obsidian/plugins/knowledge-gap-detector/`
3. Copy downloaded files to the folder
4. Enable the plugin in Settings → Community Plugins

## Usage

### Commands

- **Analyze Knowledge Gaps**: Full analysis including sparse regions and undefined concepts
- **Show Last Gap Report**: Display the most recent analysis results
- **Find Undefined Concepts**: Quick scan for undefined `[[wikilinks]]`
- **Detect Sparse Regions**: Identify low-density areas in embedding space
- **Clear Analysis Cache**: Reset cached analysis data

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| OpenAI API Key | For LLM-powered suggestions | (empty) |
| LLM Model | Model for topic inference | gpt-4o-mini |
| Cluster Count | K-means cluster count | 10 |
| Min Mentions | Minimum mentions for undefined concepts | 2 |
| Sparse Threshold | Density threshold for sparse regions | 0.3 |
| Exclude Folders | Folders to skip during analysis | 06_Meta, 09_Embedded, templates, .obsidian |

## Architecture

Built with Clean Architecture principles:

```
src/
├── core/
│   ├── domain/        # Entities, interfaces (no dependencies)
│   └── application/   # Use cases (depends on domain only)
├── adapters/          # Implementations (Vault Embeddings reader, clustering)
├── settings/          # Plugin settings
├── views/             # UI components (modal, settings tab)
└── main.ts            # Plugin entry point
```

## Related Plugins

This plugin works best with:

- [Vault Embeddings](https://github.com/eohjun/obsidian-vault-embeddings) - Required for embedding data
- [Learning Path Generator](https://github.com/eohjun/obsidian-learning-path-generator) - Generate learning paths from gaps
- [Note Topic Finder](https://github.com/eohjun/obsidian-note-topic-finder) - Discover related topics

## License

MIT License

## Support

- [Report issues](https://github.com/eohjun/obsidian-knowledge-gap-detector/issues)
- [Feature requests](https://github.com/eohjun/obsidian-knowledge-gap-detector/issues/new)
