/**
 * ContentExtractor.js - Hybrid content extraction algorithm
 * Combines weighted-tags approach with Readability.js heuristics
 */

import { getDomainParser } from './DomainParsers.js'

// Domain-specific overrides: selector to use directly instead of heuristics
// These domains have known content containers that should be used directly
const DOMAIN_OVERRIDES = {
	'github.com': 'article.markdown-body[itemprop="text"], article.markdown-body',
	'medium.com': 'article',
	'dev.to': 'article.crayons-article__body',
	'reddit.com': '[data-test-id="post-content"], .Post',
	'wikipedia.org': '#mw-content-text .mw-parser-output',
	'docs.github.com': 'article.docs-article',
}

// Tag weights for content scoring (PHP approach)
const TAG_WEIGHTS = {
	p: 3,
	br: 0.5,
	h1: 5,
	h2: 4,
	h3: 3,
	h4: 2,
	h5: 1.5,
	h6: 1,
	strong: 1,
	em: 1,
	i: 0.5,
	u: 0.5,
	b: 1,
	blockquote: 2,
	code: 2,
	pre: 2,
	ul: 2,
	ol: 2,
	li: 1,
	table: 2,
	tr: 2,
	td: 1,
	th: 0.5,
	article: 5,
	main: 5,
	section: 2,
}

// Tags to skip entirely
const SKIP_TAGS = ['aside', 'nav', 'header', 'footer', 'script', 'style', 'noscript', 'template', 'svg']

// Tag score bonuses (Readability approach)
const TAG_SCORE_BONUS = {
	DIV: 5,
	ARTICLE: 10,
	MAIN: 10,
	SECTION: 5,
	PRE: 3,
	TD: 3,
	BLOCKQUOTE: 3,
}

// Tag score penalties (Readability approach)
const TAG_SCORE_MALUS = {
	H1: -5,
	H2: -5,
	H3: -5,
	H4: -5,
	H5: -5,
	H6: -5,
	TH: -5,
	ADDRESS: -3,
	FORM: -3,
}

// Regex patterns for class/id scoring
const REGEX_POSITIVE = /article|body|content|entry|main|page|post|text|blog|story|hentry/i
const REGEX_NEGATIVE =
	/comment|sidebar|side-bar|ads?|sponsor|nav|breadcrumb|promo|footer|header|menu|widget|banner|related|share|social|popup|modal/i
const REGEX_UNLIKELY =
	/-ad-|ai2html|banner|breadcrumbs|combx|comment|disqus|extra|gdpr|legends|menu|remark|replies|rss|shoutbox|skyscraper|supplemental|ad-break|agegate|pagination|pager|popup/i

/**
 * Extracts the main content node from the document.
 * @param {Element} root - The element to search (typically document.body clone)
 * @returns {{ element: Element, html: string, text: string }}
 */
export function extractContent(root) {
	const hostname = window.location.hostname

	// Phase 0a: Check for structured domain parser (SO, etc.)
	const structuredResult = _tryStructuredParser(root, hostname)
	if (structuredResult) {
		return structuredResult
	}

	// Phase 0b: Check for domain-specific selector override
	const override = _tryDomainOverride(root, hostname)
	if (override) {
		return override
	}

	// Phase 1: Pre-clean (remove obvious noise)
	_removeUnwantedNodes(root)

	// Phase 2: Score all candidate elements
	const candidates = _scoreAllElements(root)

	// Phase 3: Find best candidate
	const winner = _findBestCandidate(candidates)

	// Phase 4: Extract and return
	if (!winner) {
		return {
			element: root,
			html: root.innerHTML,
			text: root.textContent.trim(),
		}
	}

	return {
		element: winner.node,
		html: winner.node.innerHTML,
		text: winner.node.textContent.trim(),
	}
}

/**
 * Try structured domain parser (returns formatted HTML with metadata)
 * @param {Element} root
 * @param {string} hostname
 * @returns {{ element: Element, html: string, text: string }|null}
 */
function _tryStructuredParser(root, hostname) {
	const parser = getDomainParser(hostname)
	if (!parser) {
		return null
	}

	const posts = parser.parse(root)
	if (!posts || posts.length === 0) {
		return null
	}

	const html = parser.toHtml(posts)
	const wrapper = document.createElement('div')
	wrapper.innerHTML = html

	return {
		element: wrapper,
		html: html,
		text: wrapper.textContent.trim(),
	}
}

/**
 * Try domain-specific selector override
 * @param {Element} root
 * @param {string} hostname
 * @returns {{ element: Element, html: string, text: string }|null}
 */
function _tryDomainOverride(root, hostname) {
	// Find matching domain override
	const domainKeys = Object.keys(DOMAIN_OVERRIDES)
	for (let i = 0; i < domainKeys.length; i++) {
		const domain = domainKeys[i]
		if (hostname.includes(domain)) {
			const selector = DOMAIN_OVERRIDES[domain]
			const elements = root.querySelectorAll(selector)

			if (elements.length > 0) {
				// If multiple elements match, combine them
				if (elements.length === 1) {
					return {
						element: elements[0],
						html: elements[0].innerHTML,
						text: elements[0].textContent.trim(),
					}
				}

				// Multiple elements: create a wrapper with all content
				const combined = document.createElement('div')
				elements.forEach(function (el) {
					combined.appendChild(el.cloneNode(true))
				})
				return {
					element: combined,
					html: combined.innerHTML,
					text: combined.textContent.trim(),
				}
			}
		}
	}

	return null
}

/**
 * Phase 1: Remove nodes that are clearly not content
 * @param {Element} root
 */
function _removeUnwantedNodes(root) {
	// Remove by tag
	SKIP_TAGS.forEach((tag) => {
		root.querySelectorAll(tag).forEach((el) => el.remove())
	})

	// Remove hidden elements
	root.querySelectorAll(
		'[hidden], [aria-hidden="true"], [style*="display:none"], [style*="display: none"], [style*="visibility:hidden"], [style*="visibility: hidden"]',
	).forEach((el) => el.remove())

	// Remove by unlikely class/id patterns (but not main containers)
	const mainTags = ['BODY', 'HTML', 'MAIN', 'ARTICLE']
	root.querySelectorAll('*').forEach((el) => {
		if (mainTags.includes(el.tagName)) {
			return
		}
		const matchStr = (el.className || '') + ' ' + (el.id || '')
		if (REGEX_UNLIKELY.test(matchStr) && !REGEX_POSITIVE.test(matchStr)) {
			el.remove()
		}
	})
}

/**
 * Phase 2: Score all elements using hybrid algorithm
 * @param {Element} root
 * @returns {Array<{node: Element, score: number}>}
 */
function _scoreAllElements(root) {
	const candidates = []

	root.querySelectorAll('*').forEach((el) => {
		const tag = el.tagName.toLowerCase()
		if (SKIP_TAGS.includes(tag)) {
			return
		}

		const score = _calculateScore(el)
		if (score > 0) {
			candidates.push({ node: el, score })
		}
	})

	return candidates
}

/**
 * Calculate hybrid score for an element
 * @param {Element} el
 * @returns {number}
 */
function _calculateScore(el) {
	let score = 0
	const tag = el.tagName

	// 1. Base score from tag type (Readability approach)
	score += TAG_SCORE_BONUS[tag] || 0
	score += TAG_SCORE_MALUS[tag] || 0

	// 2. Weighted tag count (PHP approach)
	let weightedCount = 0
	const tagKeys = Object.keys(TAG_WEIGHTS)
	for (let i = 0; i < tagKeys.length; i++) {
		const t = tagKeys[i]
		const weight = TAG_WEIGHTS[t]
		weightedCount += el.getElementsByTagName(t).length * weight
	}

	// 3. Depth weight (PHP approach) - deeper elements get slight boost
	const depth = _getDepth(el)
	const depthWeight = Math.min(Math.log(depth + 2), 3.0)

	// 4. Text length bonus
	const textLength = el.textContent.trim().length
	if (textLength < 25) {
		return 0 // Too short, skip
	}
	const textBonus = Math.log(textLength + 1)

	// 5. Comma count bonus (Readability) - indicates well-written content
	const commaCount = (el.textContent.match(/[,;:]/g) || []).length
	score += Math.min(commaCount, 10)

	// 6. Length bonus (Readability) - up to 3 points
	score += Math.min(Math.floor(textLength / 100), 3)

	// 7. Class/ID weight (Readability approach)
	score += _getClassIdWeight(el)

	// 8. Link density penalty (critical for nav/footer detection)
	const linkDensity = _getLinkDensity(el)
	const linkPenalty = linkDensity > 0.3 ? 1 - linkDensity : 1

	// Combine scores (PHP formula enhanced with Readability factors)
	const phpScore = weightedCount * depthWeight * (1 + textBonus)
	score = (score + phpScore) * linkPenalty

	return score
}

/**
 * Calculate link density (text in links / total text)
 * @param {Element} el
 * @returns {number}
 */
function _getLinkDensity(el) {
	const totalText = el.textContent.trim().length
	if (totalText === 0) {
		return 0
	}

	let linkText = 0
	el.querySelectorAll('a').forEach((a) => {
		const href = a.getAttribute('href') || ''
		if (!href.startsWith('#')) {
			linkText += a.textContent.trim().length
		}
	})

	return linkText / totalText
}

/**
 * Get class/id weight based on positive/negative patterns
 * @param {Element} el
 * @returns {number}
 */
function _getClassIdWeight(el) {
	let weight = 0
	const matchStr = (el.className || '') + ' ' + (el.id || '')

	if (REGEX_POSITIVE.test(matchStr)) {
		weight += 25
	}
	if (REGEX_NEGATIVE.test(matchStr)) {
		weight -= 25
	}

	return weight
}

/**
 * Calculate depth of element in DOM tree
 * @param {Element} el
 * @returns {number}
 */
function _getDepth(el) {
	let depth = 0
	let current = el
	while (current.parentElement) {
		depth++
		current = current.parentElement
	}
	return depth
}

/**
 * Phase 3: Find best candidate from scored elements
 * @param {Array<{node: Element, score: number}>} candidates
 * @returns {{node: Element, score: number}|null}
 */
function _findBestCandidate(candidates) {
	if (candidates.length === 0) {
		return null
	}

	// Sort by score descending
	candidates.sort((a, b) => b.score - a.score)

	// Return top candidate with sanity check
	const best = candidates[0]
	if (best.node.textContent.trim().length < 100) {
		return candidates[1] || null
	}

	return best
}
