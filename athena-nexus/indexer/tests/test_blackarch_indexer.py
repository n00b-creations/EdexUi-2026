import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

from blackarch_indexer import dedupe, parse_category, validate_tools


HTML = '''
<html><body>
<table>
<tr><th>Name</th><th>Version</th><th>Description</th><th>Homepage</th></tr>
<tr><td>nmap</td><td>7.95</td><td>Network scanner.</td><td><a href="https://nmap.org/">homepage</a></td></tr>
<tr><td>masscan</td><td>1.3</td><td>Fast scanner.</td><td></td></tr>
</table>
</body></html>
'''


def test_parse_category():
    tools = parse_category(
        HTML,
        "scanner",
        "https://blackarch.org/scanner.html",
    )
    assert [tool.name for tool in tools] == ["nmap", "masscan"]
    assert tools[0].id == "blackarch:nmap"
    assert tools[0].categories == ["scanner"]


def test_dedupe_merges_categories():
    first = parse_category(HTML, "scanner", "https://blackarch.org/scanner.html")
    second = parse_category(HTML, "networking", "https://blackarch.org/networking.html")
    merged = dedupe(first + second)
    nmap = next(tool for tool in merged if tool.id == "blackarch:nmap")
    assert nmap.categories == ["networking", "scanner"]
    assert len(merged) == 2


def test_validation_passes():
    tools = parse_category(HTML, "scanner", "https://blackarch.org/scanner.html")
    assert validate_tools(tools) == []
