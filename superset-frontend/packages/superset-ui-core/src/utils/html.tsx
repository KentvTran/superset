/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { FilterXSS, getDefaultWhiteList } from 'xss';

const xssFilter = new FilterXSS({
  whiteList: {
    ...getDefaultWhiteList(),
    span: ['style', 'class', 'title'],
    div: ['style', 'class'],
    a: ['style', 'class', 'href', 'title', 'target'],
    img: ['style', 'class', 'src', 'alt', 'title', 'width', 'height'],
    video: [
      'autoplay',
      'controls',
      'loop',
      'preload',
      'src',
      'height',
      'width',
      'muted',
    ],
  },
  stripIgnoreTag: true,
  css: false,
});

export function sanitizeHtml(htmlString: string) {
  return xssFilter.process(htmlString);
}

export function hasHtmlTagPattern(str: string): boolean {
  const htmlTagPattern =
    /<(html|head|body|div|span|a|p|h[1-6]|title|meta|link|script|style)/i;

  return htmlTagPattern.test(str);
}

export function isProbablyHTML(text: string) {
  const cleanedStr = text.trim().toLowerCase();

  // Only detect HTML for complete documents or obvious HTML patterns
  if (
    cleanedStr.startsWith('<!doctype html>') &&
    hasHtmlTagPattern(cleanedStr)
  ) {
    return true;
  }

  // Check for complete HTML document patterns
  if (
    cleanedStr.startsWith('<html') ||
    cleanedStr.startsWith('<head') ||
    cleanedStr.startsWith('<body')
  ) {
    return true;
  }

  // Check for multiple HTML tags (more likely to be intentional HTML)
  const htmlTagCount = (cleanedStr.match(/<[^>]+>/g) || []).length;
  if (htmlTagCount >= 2) {
    return true;
  }

  // For single tag patterns, be more conservative
  // Only treat as HTML if it looks like a complete, intentional HTML structure
  const singleTagPattern = /^<[a-z][a-z0-9]*[^>]*>.*<\/[a-z][a-z0-9]*>$/i;
  if (singleTagPattern.test(text.trim())) {
    // Additional check: ensure it's not just angle brackets in text
    const tagName = text.trim().match(/^<([a-z][a-z0-9]*)/i)?.[1];
    if (tagName && ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'strong', 'em', 'b', 'i'].includes(tagName.toLowerCase())) {
      return true;
    }
  }

  return false;
}

export function sanitizeHtmlIfNeeded(htmlString: string) {
  return isProbablyHTML(htmlString) ? sanitizeHtml(htmlString) : htmlString;
}

export function safeHtmlSpan(possiblyHtmlString: string) {
  const isHtml = isProbablyHTML(possiblyHtmlString);
  if (isHtml) {
    const sanitizedHtml = sanitizeHtml(possiblyHtmlString);
    
    // Fallback: If sanitization removes all content, treat as plain text
    // This prevents data loss when XSS filter is too aggressive
    if (sanitizedHtml.trim() === '' && possiblyHtmlString.trim() !== '') {
      return possiblyHtmlString;
    }
    
    return (
      <span
        className="safe-html-wrapper"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
  }
  return possiblyHtmlString;
}

export function removeHTMLTags(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

export function isJsonString(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

export function getParagraphContents(
  str: string,
): { [key: string]: string } | null {
  if (!isProbablyHTML(str)) {
    return null;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(str, 'text/html');
  const pTags = doc.querySelectorAll('p');

  if (pTags.length === 0) {
    return null;
  }

  const paragraphContents: { [key: string]: string } = {};

  pTags.forEach((pTag, index) => {
    paragraphContents[`p${index + 1}`] = pTag.textContent || '';
  });

  return paragraphContents;
}
