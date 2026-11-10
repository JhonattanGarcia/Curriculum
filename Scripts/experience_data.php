<?php
declare(strict_types=1);

function experience_months(array $company, string $currentMonth): int {
    $end = min($company['end'] ?? $currentMonth, $currentMonth);
    [$startYear, $startMonth] = array_map('intval', explode('-', $company['start']));
    [$endYear, $endMonth] = array_map('intval', explode('-', $end));
    return max(0, ($endYear - $startYear) * 12 + $endMonth - $startMonth);
}

function experience_duration(int $months): string {
    $years = intdiv($months, 12);
    $remaining = $months % 12;
    $parts = [];
    if ($years) $parts[] = $years . ($years === 1 ? ' year' : ' years');
    if ($remaining || !$years) $parts[] = $remaining . ($remaining === 1 ? ' month' : ' months');
    return implode(' ', $parts);
}

function render_experience(string $content, array $config, ?string $asOf = null): string {
    $currentMonth = $asOf ?? (new DateTimeImmutable('now', new DateTimeZone($config['timeZone'])))->format('Y-m');
    $chartRows = '';
    $total = 0;
    $captions = [];
    foreach ($config['companies'] as $company) {
        $months = experience_months($company, $currentMonth);
        $duration = experience_duration($months);
        $id = preg_quote($company['id'], '/');
        $start = (new DateTimeImmutable($company['start'] . '-01'))->format('M Y');
        $end = $company['end'] ? (new DateTimeImmutable($company['end'] . '-01'))->format('M Y') : 'Present';
        $content = preg_replace('/(<span data-employment-range="' . $id . '">).*?(<\/span>)/s', '${1}' . $start . ' – ' . $end . '${2}', $content);
        $content = preg_replace('/(<span data-tenure="' . $id . '">).*?(<\/span>)/s', '${1}' . $duration . '${2}', $content);
        if (empty($company['tools'])) continue;
        $name = htmlspecialchars($company['company'], ENT_QUOTES, 'UTF-8');
        $chartRows .= '<tr><th scope="row">' . $name . '</th><td>' . $duration . '</td></tr>';
        $captions[] = $name . ': ' . $duration;
        $total += $months;
    }
    $content = preg_replace('/<tbody data-chart-rows>.*?<\/tbody>/s', '<tbody data-chart-rows>' . $chartRows . '</tbody>', $content);
    $content = preg_replace('/<strong data-total>.*?<\/strong>/s', '<strong data-total>' . experience_duration($total) . '</strong>', $content);
    $content = preg_replace('/(<canvas[^>]*>).*?(<\/canvas>)/s', '$1' . implode('; ', $captions) . '$2', $content);
    return $content;
}
