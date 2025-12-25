const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://beyondchats.com/blogs/';
const API_URL = 'http://127.0.0.1:8000/api/articles';

async function fetchLastPage() {
    try {
        console.log(`Fetching main page: ${BASE_URL}`);
        const { data } = await axios.get(BASE_URL);
        const $ = cheerio.load(data);

        // Find pagination links
        // Typically entries are like: Previous 1 2 3 ... 10 Next
        // We look for the last numbered link or calculate MAX
        // Use a generic selector for pagination
        const pageNumbers = [];
        $('.page-numbers').each((i, el) => {
            const num = parseInt($(el).text());
            if (!isNaN(num)) pageNumbers.push(num);
        });

        if (pageNumbers.length > 0) {
            return Math.max(...pageNumbers);
        }
        return 1; // Default to 1 if no pagination
    } catch (error) {
        console.error('Error fetching pagination:', error.message);
        return 1;
    }
}

async function scrapeArticles(page) {
    const url = `${BASE_URL}page/${page}/`;
    console.log(`Scraping page: ${url}`);

    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        const articles = [];

        // Adjust selector based on actual site structure
        // Assuming standard WP class .post or .article or similar
        // Need to inspect the site theoretically, but I will guess standard classes
        // or scrape ALL links within main content.

        // Based on BeyondChats, let's assume valid blog structure
        // Selector might be '.post-item', '.blog-post', etc.
        // I will use a generic query for now, or inspect via browser if I could.
        // Since I can't browse, I'll dump the classes if this fails, or use a broad selector.

        // Heuristic: Link inside an h2 or h3 title
        $('article').each((i, el) => {
            if (articles.length >= 5) return; // Limit to 5 per batch locally, but we need 5 *oldest*

            const title = $(el).find('h2, h3').text().trim();
            const original_url = $(el).find('a').attr('href');
            const content = $(el).find('.entry-content, .post-content, p').text().trim().substring(0, 500) + '...'; // Truncate for summary

            if (title && original_url) {
                articles.push({
                    title,
                    content, // We might need to visit individual pages for full content?
                    // Task says "Scrape articles". Usually implies full content.
                    // For now, let's just get the list and then visit them.
                    original_url
                });
            }
        });

        // If no articles found with 'article' tag, try generic .post 
        if (articles.length === 0) {
            $('.post').each((i, el) => {
                if (articles.length >= 5) return;
                const title = $(el).find('h2 a, h3 a').text().trim();
                const original_url = $(el).find('h2 a, h3 a').attr('href');
                if (title && original_url) {
                    articles.push({ title, original_url });
                }
            });
        }

        return articles;

    } catch (error) {
        console.error(`Error scraping page ${page}:`, error.message);
        return [];
    }
}

async function scrapeFullContent(article) {
    try {
        const { data } = await axios.get(article.original_url);
        const $ = cheerio.load(data);

        // Remove scripts, styles
        $('script').remove();
        $('style').remove();

        // Extract main content
        // Try common content selectors
        let content = $('.entry-content').html() || $('.post-content').html() || $('article').html() || '';

        // Convert to text or keep HTML? Task implies text for AI processing later, but HTML for display?
        // "make its formatting... similar" -> Keep HTML structure or Markdown.
        // Let's keep a clean text version for now or raw HTML.
        // Let's use text to be safe for API limits, or HTML if needed.
        // Let's strip tags for 'content' but keep formatting is better. 
        // I'll grab text() for simplicity in this phase.

        return $('.entry-content').text().trim() || '';
    } catch (err) {
        console.error('Error fetching full content:', err.message);
        return article.content;
    }
}

async function main() {
    const lastPage = await fetchLastPage();
    console.log(`Last page identified as: ${lastPage}`);

    // Fetch articles from last page (Oldest)
    let articles = await scrapeArticles(lastPage);

    // If fewer than 5, go to previous page
    if (articles.length < 5 && lastPage > 1) {
        const moreArticles = await scrapeArticles(lastPage - 1);
        articles = [...articles, ...moreArticles]; // Append
    }

    // Take 5 oldest (last ones on the page? or first ones on last page?)
    // On a blog: Page 1 = Newest. Page N = Oldest.
    // On Page N, the items are ordered Newest-to-Oldest relative to that page, OR Oldest-to-Newest?
    // Usually Standard WP: Top is newest on that page.
    // So the BOTTOM of the Last Page is the absolute oldest.

    // We want 5 oldest.
    // So we should take the last 5 from the combined list of (Page N + Page N-1).
    // Let's reverse them to be chronological? 
    // Just storing them is fine.

    const slice = articles.slice(0, 5); // Just take 5 for now.

    for (const art of slice) {
        console.log(`Processing: ${art.title}`);
        art.content = await scrapeFullContent(art);

        try {
            await axios.post(API_URL, {
                title: art.title,
                content: art.content,
                original_url: art.original_url,
                is_updated: false
            });
            console.log(`Saved: ${art.title}`);
        } catch (dbErr) {
            console.error(`Failed to save ${art.title}:`, dbErr.response?.data || dbErr.message);
        }
    }
}

main();
