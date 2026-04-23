# PageDump

PageDump is a browser bookmarklet that extracts the main content from any web page and exports it to **Markdown**, **HTML**, or **plain text** formats. It uses a hybrid content extraction algorithm combining weighted tag scoring with link density analysis to identify the most relevant content on any page.

## Installation

Copy the source code of [the PageDump bookmarklet](./dist/pagedump.bookmarklet.js) and create a new bookmark in your browser, pasting the code into the URL/location field.

> **Heads up!** Always review the source code of the bookmarklet to ensure its integrity and functionality before using it.

## How It Works

Once you click the bookmarklet on any web page:

1. PageDump **clones the page's content in memory** to avoid altering the live page.
2. A **hybrid extraction algorithm** identifies the main content area, filtering out navigation, sidebars, ads, and other noise.
3. The **extracted HTML is cleaned** to remove unnecessary elements like scripts, buttons, and tracking elements.
4. The content is **formatted into Markdown, HTML, and plain text**.
5. A **notification appears**, giving you options to **download** in any format or **copy** directly to your clipboard.

### Content Extraction Algorithm

PageDump uses a hybrid approach inspired by Mozilla's Readability.js and custom heuristics:

- **Weighted Tag Scoring**: Content-rich tags (`<article>`, `<p>`, `<h1>`-`<h6>`, `<pre>`, `<blockquote>`) receive higher scores.
- **Link Density Penalty**: Elements with high link-to-text ratios (navigation menus, footer links) are penalized.
- **Class/ID Pattern Matching**: Positive patterns (`article`, `content`, `main`, `post`) boost scores; negative patterns (`sidebar`, `comment`, `ads`, `menu`) reduce them.
- **Depth Weighting**: Deeper nested elements receive a slight boost to avoid selecting the entire `<body>`.
- **Text Length Bonus**: Longer content blocks score higher.

## Output Formats

- **Markdown**: Full markdown conversion with images preserved as `![alt](src)`, tables, code blocks, and proper heading hierarchy.
- **HTML**: Cleaned HTML with only semantic tags preserved (`<p>`, `<h1>`-`<h6>`, `<pre>`, `<code>`, `<table>`, `<a>`, `<img>`, etc.).
- **Plain Text**: Normalized text content with collapsed whitespace.

## Building From Source

1. **Clone the repository:**

    ```bash
    git clone https://github.com/mauriziofonte/page-dump-bookmarklet.git
    cd page-dump-bookmarklet
    ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

3. **Build the project:**

    ```bash
    npm run build
    ```

    This command will bundle the code as a bookmarklet (via `esbuild-plugin-bookmarklet`) and create the `dist/pagedump.bookmarklet.js` minified bookmarklet file.

## Personal / Private Builds

The build script supports a second entry point for personal bundles that you don't want to ship publicly (e.g. parsers for sites you don't want to disclose, internal tooling, work-in-progress experiments).

Convention:

- Public entry: `index.js` → bundles to `dist/pagedump.bookmarklet.js`
- Private entry: `index.private.js` → bundles to `dist/pagedump.bookmarklet.private.js`

The `.gitignore` already excludes `index.private.js`, `dist/*.private.js`, and the `src/parsers/private/` directory. Drop your private parsers there, wire them up in `index.private.js`, and run:

```bash
npm run build:private
```

A private bundle can either extend the public flow (importing `src/parsers/private/index.js` to side-effect-register parsers via `registerParser`) or stand alone with its own UI/format pipeline if you need to keep the bundle smaller.

The build script also reads an optional `.canary-private` file (gitignored): if present, it lists newline-separated strings that must NOT appear in the public bundle. Use it as a guard against accidental leaks of private identifiers, names, or domain strings into the public artifact.

## Development and Debugging

1. Make your code changes in the `src/` directory.
2. Run the build command:

    ```bash
    npm run build
    ```

3. Open the generated `dist/pagedump.bookmarklet.js` file and copy its entire content.
4. Navigate to any web page you want to test.
5. Open your browser's developer tools (F12 or Ctrl+Shift+I) and go to the **Console** tab.
6. Paste the copied code into the console and press Enter.

This will execute your modified script in the context of the page, allowing you to see any errors or use `console.log` for debugging.

## Project Structure

```text
src/
├── PageDump.js          # Main entry point and orchestration
├── ContentExtractor.js  # Hybrid content extraction algorithm
├── DomainParsers.js     # Built-in parsers + registerParser/getDomainParser registry
├── HTMLCleaner.js       # HTML sanitization (preserves <a>, <img>)
├── OutputFormatter.js   # Markdown, HTML, and TXT formatters
├── UIManager.js         # Toast notifications for export options
└── Utilities.js         # Filename generation, HTML escaping
```

## Contributing

Contributions are welcome! If you want to improve the extraction algorithm or fix a bug:

1. Fork the repository and create a new branch.
2. Add your feature or bug fix.
3. Test on various websites (blogs, news sites, documentation, etc.).
4. Submit a pull request.

### Tuning the Extraction Algorithm

The content extraction is controlled by constants in `src/ContentExtractor.js`:

- `TAG_WEIGHTS`: Adjust scoring for different HTML tags.
- `REGEX_POSITIVE` / `REGEX_NEGATIVE`: Patterns for class/ID matching.
- `TAG_SCORE_BONUS` / `TAG_SCORE_MALUS`: Direct score modifiers per tag type.

### Extending with Custom Parsers

When the heuristic extractor isn't enough for a specific site (forums, ticket systems, structured content with stable selectors), you can register a **domain parser** that bypasses the algorithm and returns pre-structured HTML.

A parser is a plain object exposing the following contract:

```js
{
  name: 'my-site',
  matches: (hostname) => /(^|\.)example\.com$/i.test(hostname),
  parse: (root) => [/* array of structured items */],
  toHtml: (items) => '<h1>...</h1>...',  // semantic HTML, fed into Turndown
  filename: (items) => 'my-prefix-' + items[0].id,  // optional: overrides default filename
}
```

Register it via the registry exported by `DomainParsers.js`:

```js
import { registerParser } from './src/DomainParsers.js'
import { MyParser } from './src/parsers/my-parser.js'

registerParser('example.com', MyParser)
```

When `getDomainParser(hostname)` finds a match, the structured pipeline runs first and short-circuits the heuristic extractor. The optional `filename(items)` method lets the parser supply a meaningful filename instead of the default `YYYYMMDD-HHMM-<title-slug>` format.

## Changelog

### v1.0.0 (2026-01-08)

Complete rewrite from ChatDump to PageDump:

- **Universal Content Extraction**: Now works on any web page, not just AI chat platforms.
- **Hybrid Extraction Algorithm**: Combines weighted tag scoring with link density analysis.
- **Three Output Formats**: Markdown, HTML, and plain text.
- **Image Preservation**: Images are converted to `![alt](src)` in Markdown output.
- **Cleaner Architecture**: Removed platform-specific parsers in favor of universal extraction.
- **Bundle Size**: ~60KB (at the 60KB target).

### Previous Versions (ChatDump)

- v1.2.0 - Parser fixes for Claude, ChatGPT, and Gemini.
- v1.1.0 - Initial release with support for ChatGPT, Gemini, and Claude.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
