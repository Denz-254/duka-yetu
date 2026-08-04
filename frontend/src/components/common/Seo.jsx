import { Helmet } from 'react-helmet-async';

/**
 * Page-level SEO tags for Google Search Console / ranking.
 */
export default function Seo({
  title = 'Duka Yetu',
  description = 'Duka Yetu — POS, inventory, and DukaMall online shop for Kenyan businesses.',
  path = '/',
  image,
  noIndex = false,
}) {
  const site = typeof window !== 'undefined' ? window.location.origin : 'https://dukamall.example.com';
  const url = `${site}${path.startsWith('/') ? path : `/${path}`}`;
  const fullTitle = title.includes('Duka') ? title : `${title} | Duka Yetu`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
