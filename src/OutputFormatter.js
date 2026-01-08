import '../types.js'
import { cleanHtml } from './HTMLCleaner.js'
import TurndownService from 'turndown'
import { tables } from 'turndown-plugin-gfm'

/**
 * Creates a configured TurndownService instance
 * @returns {TurndownService}
 */
function _createTurndownService() {
    const ts = new TurndownService({
        hr: '___________',
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '-',
    })
    ts.use(tables)
    return ts
}

/**
 * Converts HTML content to a Markdown string.
 * @param {string} html - The HTML content to convert.
 * @param {string} title - The page title.
 * @returns {string} The complete Markdown document.
 */
export function formatAsMarkdown(html, title) {
    const ts = _createTurndownService()
    const body = ts.turndown(html)
    return `# ${title}\n\n${body}`
}

/**
 * Converts HTML content to a clean HTML string.
 * @param {string} html - The HTML content to clean.
 * @param {string} title - The page title.
 * @returns {string} The complete HTML document string.
 */
export function formatAsHtml(html, title) {
    return `<h1>${title}</h1>\n${cleanHtml(html)}`
}

/**
 * Converts text content to a plain text string.
 * @param {string} text - The text content.
 * @param {string} title - The page title.
 * @returns {string} The complete plain text document.
 */
export function formatAsText(text, title) {
    // Normalize whitespace: collapse multiple newlines/spaces
    const normalized = text
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+/g, ' ')
        .trim()

    const separator = '='.repeat(Math.min(title.length, 60))
    return `${title}\n${separator}\n\n${normalized}`
}
