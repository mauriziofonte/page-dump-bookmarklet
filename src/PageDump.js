import '../types.js'
import { extractContent } from './ContentExtractor.js'
import { cleanHtml } from './HTMLCleaner.js'
import { formatAsMarkdown, formatAsHtml, formatAsText } from './OutputFormatter.js'
import { initUI, showExportOptions, showError } from './UIManager.js'
import { generateFilename } from './Utilities.js'

/**
 * Main entry point for the PageDump bookmarklet.
 * Extracts main content from any web page and provides export options.
 */
export function run() {
    try {
        initUI()

        const title = document.title || 'Untitled'
        const clone = document.body.cloneNode(true)

        // Extract main content using hybrid algorithm
        const extracted = extractContent(clone)
        const html = extracted.html
        const text = extracted.text

        // Clean the extracted HTML
        const cleanedHtml = cleanHtml(html)

        // Format outputs
        const mdText = formatAsMarkdown(cleanedHtml, title)
        const htmlText = formatAsHtml(cleanedHtml, title)
        const txtText = formatAsText(text, title)

        // Generate filename (parser hint wins over default)
        const filename = extracted.filename || generateFilename(title)
        showExportOptions({ mdText, htmlText, txtText, filename })
    } catch (err) {
        showError(err.message || 'An unexpected error occurred')
    }
}
