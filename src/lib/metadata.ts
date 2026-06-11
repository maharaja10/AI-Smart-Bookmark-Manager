import * as cheerio from 'cheerio';

interface UrlMetadata {
  title?: string;
  description?: string;
  favicon?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogSiteName?: string;
}

export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  try {
    // Special handling for known sites that block scraping
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Handle Instagram specifically
    if (hostname === 'instagram.com' || hostname === 'www.instagram.com') {
      return {
        title: 'Instagram',
        description: 'Instagram is a photo and video sharing platform',
        favicon: 'https://www.instagram.com/favicon.ico',
        ogTitle: 'Instagram',
        ogDescription: 'Instagram is a photo and video sharing platform',
        ogImage: 'https://www.instagram.com/static/images/ico/favicon-192.png/68d99ba29cc8.png',
        ogSiteName: 'Instagram'
      };
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract metadata
    const metadata: UrlMetadata = {};
    
    // Basic metadata
    metadata.title = $('title').text();
    metadata.description = $('meta[name="description"]').attr('content');
    
    // Favicon
    const faviconLink = $('link[rel="icon"]').attr('href') || 
                        $('link[rel="shortcut icon"]').attr('href') ||
                        $('link[rel="apple-touch-icon"]').attr('href');
    
    if (faviconLink) {
      metadata.favicon = new URL(faviconLink, url).toString();
    } else {
      // Try default favicon location
      metadata.favicon = new URL('/favicon.ico', url).toString();
    }
    
    // Open Graph metadata
    metadata.ogTitle = $('meta[property="og:title"]').attr('content');
    metadata.ogDescription = $('meta[property="og:description"]').attr('content');
    metadata.ogImage = $('meta[property="og:image"]').attr('content');
    metadata.ogUrl = $('meta[property="og:url"]').attr('content');
    metadata.ogSiteName = $('meta[property="og:site_name"]').attr('content');
    
    // Convert relative URLs to absolute
    if (metadata.ogImage && !metadata.ogImage.startsWith('http')) {
      metadata.ogImage = new URL(metadata.ogImage, url).toString();
    }
    
    return metadata;
  } catch (error) {
    console.error('Error fetching URL metadata:', error);
    return {};
  }
} 