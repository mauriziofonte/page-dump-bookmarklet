const ALLOWED_TAGS = [
	'p',
	'div',
	'span',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'pre',
	'code',
	'ul',
	'ol',
	'li',
	'strong',
	'em',
	'table',
	'thead',
	'tbody',
	'tr',
	'th',
	'td',
	'a',
	'img',
	'blockquote',
	'br',
	'hr',
]

// Attributes to preserve for specific tags
const PRESERVED_ATTRS = {
	a: ['href'],
	img: ['src', 'alt'],
}

/**
 * Recursively removes all HTML comments from a node.
 * @param {Node} node - The root node to clean.
 */
function _removeComments(node) {
	const walker = document.createTreeWalker(node, NodeFilter.SHOW_COMMENT, null)
	const comments = []
	let current
	while ((current = walker.nextNode())) {
		comments.push(current)
	}
	comments.forEach((comment) => comment.remove())
}

/**
 * Cleans and sanitizes an HTML node or string.
 * @param {string|Node} htmlInput - The HTML content to clean.
 * @returns {string} The cleaned HTML string.
 */
export function cleanHtml(htmlInput) {
	let node
	let returnInnerHTML = false

	if (typeof htmlInput === 'string') {
		node = document.createElement('div')
		node.innerHTML = htmlInput
		returnInnerHTML = true
	} else {
		node = htmlInput
	}

	_removeComments(node)

	// Remove non-essential elements (preserve img for markdown conversion)
	node.querySelectorAll(
		'script, style, video, audio, button, input, textarea, select, iframe, noscript, svg, canvas, math, .sr-only, [role="button"], [role="textbox"], [role="presentation"]',
	).forEach((e) => e.remove())

	// Process all remaining elements
	node.querySelectorAll('*').forEach((element) => {
		const tagName = element.tagName.toLowerCase()

		// Remove empty elements (but not self-closing like img, br, hr)
		const selfClosing = ['img', 'br', 'hr']
		if (!selfClosing.includes(tagName) && !element.textContent?.trim() && element.children.length === 0) {
			element.remove()
			return
		}

		// Preserve specific attributes for allowed tags, remove all others
		const preservedForTag = PRESERVED_ATTRS[tagName] || []
		const attrsToRemove = []
		for (let i = 0; i < element.attributes.length; i++) {
			const attrName = element.attributes[i].name
			if (!preservedForTag.includes(attrName)) {
				attrsToRemove.push(attrName)
			}
		}
		attrsToRemove.forEach((attr) => element.removeAttribute(attr))

		// Convert non-essential tags to a div to preserve content
		if (!ALLOWED_TAGS.includes(tagName)) {
			const div = document.createElement('div')
			div.innerHTML = element.innerHTML
			element.parentNode?.replaceChild(div, element)
		}
	})

	return returnInnerHTML ? node.innerHTML : node.outerHTML
}
