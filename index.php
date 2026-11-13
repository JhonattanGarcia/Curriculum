<?php
// XAMPP/Apache entry point. index.html remains the shared, content-free shell.
declare(strict_types=1);
require_once __DIR__ . '/Scripts/experience_data.php';
$experienceConfig = json_decode(file_get_contents(__DIR__ . '/Resources/experience.json'), true, 512, JSON_THROW_ON_ERROR);
$experienceConfig['chartLibraryVersion'] = substr(hash_file('sha256', __DIR__ . '/Scripts/vendor/chart.umd.min.js'), 0, 12);
$routes = json_decode(file_get_contents(__DIR__ . '/routes.json'), true, 512, JSON_THROW_ON_ERROR);
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/') . '/';
$request = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
$decodedBase = rawurldecode($base);
$base = implode('/', array_map('rawurlencode', explode('/', $decodedBase)));
$path = trim(substr($request, strlen($decodedBase)), '/');
if ($path === 'index.php' || $path === 'index.html') $path = '';
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
// Set PUBLIC_SITE_URL to the final public origin and project path at deployment.
$publicBase = rtrim(getenv('PUBLIC_SITE_URL') ?: ($scheme . '://' . $_SERVER['HTTP_HOST'] . $base), '/') . '/';
$escape = static fn(string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
if ($path === 'sitemap.xml') {
    header('Content-Type: application/xml; charset=UTF-8');
    echo '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    foreach ($routes as $route) echo '<url><loc>' . $escape($publicBase . $route['path']) . '</loc></url>';
    echo '</urlset>';
    exit;
}
if ($path === 'robots.txt') {
    header('Content-Type: text/plain; charset=UTF-8');
    echo "User-agent: *\nAllow: /\nDisallow: " . $base . "Old/\nSitemap: " . $publicBase . "sitemap.xml\n";
    exit;
}
$index = array_search($path, array_column($routes, 'path'), true);
if ($index === false) {
    http_response_code(404);
    $index = 0;
    $content = '<section class="content-status"><h1>Page not found</h1><p><a href="' . $escape($base) . '">Return to Summary</a></p></section>';
} else {
    // A fragment BOM becomes an anonymous grid item when inserted inside main.
    $content = preg_replace('/^\xEF\xBB\xBF/', '', file_get_contents(__DIR__ . '/' . $routes[$index]['file']));
}
if ($routes[$index]['id'] === 'experience') $content = render_experience($content, $experienceConfig);
// Revalidate HTML so it references the current asset versions after deployment.
header('Cache-Control: no-cache');
if (isset($_GET['fragment'])) {
    header('Content-Type: text/html; charset=UTF-8');
    header('X-Portfolio-Fragment: 1');
    echo $content;
    exit;
}
$route = $routes[$index];
$title = $route['label']['en'] . ' | Jhonattan Garcia — Extended CV';
$schema = [
    '@context' => 'https://schema.org', '@type' => 'ProfilePage',
    'name' => $title, 'url' => $publicBase . $route['path'],
    'mainEntity' => [
        '@type' => 'Person', 'name' => 'Jhonattan Garcia',
        'jobTitle' => 'Cybersecurity and Software Development Professional',
        'email' => 'mailto:jhonattan_garcia@outlook.com',
        'url' => $publicBase,
        'sameAs' => ['https://github.com/JhonattanGarcia', 'https://www.linkedin.com/in/jhonattan-garcia-prieto-33252517b/']
    ]
];
$meta = '<link rel="canonical" href="' . $escape($publicBase . $route['path']) . '">' . "\n" .
    '<meta property="og:title" content="' . $escape($title) . '">' . "\n" .
    '<meta property="og:description" content="' . $escape($route['description']) . '">' . "\n" .
    '<meta property="og:url" content="' . $escape($publicBase . $route['path']) . '">' . "\n" .
    '<meta property="og:type" content="profile">' . "\n" .
    '<script type="application/ld+json" id="profile-schema">' . json_encode($schema, JSON_HEX_TAG | JSON_UNESCAPED_SLASHES) . '</script>';
$html = file_get_contents(__DIR__ . '/index.html');
$html = str_replace('<script id="experience-data" type="application/json">null</script>', '<script id="experience-data" type="application/json">' . json_encode($experienceConfig, JSON_HEX_TAG | JSON_UNESCAPED_SLASHES) . '</script>', $html);
$html = str_replace('<!-- APP_BASE -->', '<base href="' . $escape($base) . '">', $html);
$html = str_replace('<!-- PAGE_META -->', $meta, $html);
$html = preg_replace('/<title>.*?<\/title>/s', '<title>' . $escape($title) . '</title>', $html);
$html = preg_replace('/<meta name="description"[^>]*>/', '<meta name="description" content="' . $escape($route['description']) . '">', $html);
$html = preg_replace('/<!-- PAGE_CONTENT -->.*?<\/main>/s', $content . '</main>', $html);
$html = str_replace('class="notebook" tabindex="-1" aria-busy="true"', 'class="notebook" tabindex="-1" aria-busy="false" data-section="' . $escape($route['id']) . '"', $html);
$controls = '';
foreach ([-1 => 'previous', 1 => 'next'] as $step => $key) {
    $neighborIndex = ($index + $step + count($routes)) % count($routes);
    $neighbor = $routes[$neighborIndex] ?? null;
    if ($neighbor) $controls .= '<a href="' . $escape($neighbor['path'] ?: './') . '" data-route="' . $escape($neighbor['id']) . '" rel="' . ($step === -1 ? 'prev' : 'next') . '"><span class="nav-chevron" aria-hidden="true"></span><span class="sr-only"><span data-i18n="' . $key . '">' . ucfirst($key) . '</span> · <span data-i18n="nav_' . $escape($neighbor['id']) . '">' . $escape($neighbor['label']['en']) . '</span></span></a>';
}
$html = str_replace('<!-- PAGE_CONTROLS -->', $controls, $html);
$html = str_replace('<script id="route-data" type="application/json">null</script>', '<script id="route-data" type="application/json">' . json_encode($routes, JSON_HEX_TAG | JSON_UNESCAPED_SLASHES) . '</script>', $html);
$html = str_replace('data-route="' . $route['id'] . '" data-i18n="nav_', 'data-route="' . $route['id'] . '" aria-current="page" data-i18n="nav_', $html);
// Content hashes also change when a deployment preserves original file timestamps.
$html = preg_replace_callback('/\b(href|src)="((?:Styles|Scripts)\/[^"?]+)(?:\?[^\"]*)?"/', static function (array $match) use ($escape): string {
    $file = __DIR__ . '/' . $match[2];
    if (!is_file($file)) return $match[0];
    $version = substr(hash_file('sha256', $file), 0, 12);
    return $match[1] . '="' . $escape($match[2]) . '?v=' . $version . '"';
}, $html);
header('Content-Type: text/html; charset=UTF-8');

echo $html;
