"""Check versioned assets against the current checkout: python Tests/check_asset_versions.py [base-url]."""
import hashlib
import json
import re
import sys
from pathlib import Path
from urllib.request import urlopen

base = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost/SitioWeb%202025/'
root = Path(__file__).resolve().parent.parent
with urlopen(base.rstrip('/') + '/experiencia', timeout=20) as response:
    html = response.read().decode('utf-8')
    assert response.headers.get('Cache-Control') == 'no-cache'
assets = re.findall(r'(?:href|src)="((?:Styles|Scripts)/[^"?]+)([^\"]*)"', html)
assert assets
for name, query in assets:
    expected = hashlib.sha256((root / name).read_bytes()).hexdigest()[:12]
    assert query == '?v=' + expected, (name, query)
assert any(name == 'Styles/variables.css' for name, _ in assets)
config = json.loads(re.search(r'<script id="experience-data"[^>]*>(.*?)</script>', html, re.S).group(1))
expected = hashlib.sha256((root / 'Scripts/vendor/chart.umd.min.js').read_bytes()).hexdigest()[:12]
assert config['chartLibraryVersion'] == expected
print(f'PASS: {len(assets)} versioned CSS/JS assets, current chart-library hash and revalidated HTML')
