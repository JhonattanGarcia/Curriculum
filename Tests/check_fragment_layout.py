"""Run against XAMPP: python Tests/check_fragment_layout.py [base-url]."""
import json
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import urlopen

class ViewportParser(HTMLParser):
    def __init__(self, fragment=False):
        super().__init__()
        self.depth = 0 if fragment else None
        self.text = []
        self.children = []
    def handle_starttag(self, tag, attrs):
        if tag == 'main' and dict(attrs).get('id') == 'contenido':
            self.depth = 0
        elif self.depth is not None:
            if self.depth == 0:
                self.children.append(tag)
            if tag not in ('br', 'img', 'input', 'hr', 'meta', 'link'):
                self.depth += 1
    def handle_endtag(self, tag):
        if tag == 'main':
            self.depth = None
        elif self.depth is not None:
            self.depth -= 1
    def handle_data(self, data):
        if self.depth == 0 and data.strip():
            self.text.append(data)

base = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost/SitioWeb%202025/'
routes = json.loads((Path(__file__).resolve().parent.parent / 'routes.json').read_text(encoding='utf-8'))
for route in routes:
    for fragment in (False, True):
        url = base.rstrip('/') + '/' + route['path'] + ('?fragment=1' if fragment else '')
        with urlopen(url, timeout=10) as response:
            # Keep any BOM: utf-8-sig would hide this regression in fragments.
            parser = ViewportParser(fragment)
            parser.feed(response.read().decode('utf-8'))
        assert not parser.text, (route['id'], 'unexpected grid text', parser.text)
        assert len(parser.children) == 2, (route['id'], parser.children)
    print('Grid structure OK:', route['id'])
