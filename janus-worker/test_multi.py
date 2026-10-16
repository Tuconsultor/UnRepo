"""Offline guardrail tests: do not call the API or GitHub."""
import importlib.util
import pathlib
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).parent
spec = importlib.util.spec_from_file_location("multi_analyze", ROOT / "multi_analyze.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class TestLimits(unittest.TestCase):
    def test_budgets(self):
        self.assertEqual(module.MAX_FILES, 3)
        self.assertEqual(module.MAX_CALLS, 3)
        self.assertLessEqual(module.MAX_TOTAL_OUTPUT_TOKENS, 1500)
        self.assertLessEqual(module.MAX_INPUT_TOKENS_EST, 8000)
        self.assertLessEqual(module.MAX_BYTES_PER_FILE, 4500)

    def test_file_selection_rejects_binaries_and_vendor(self):
        tree = [
            {"path":"src/app.py","type":"blob","size":500,"sha":"a"},
            {"path":"src/util.ts","type":"blob","size":500,"sha":"b"},
            {"path":"node_modules/a.js","type":"blob","size":500,"sha":"c"},
            {"path":"vendor/b.py","type":"blob","size":500,"sha":"d"},
            {"path":"picture.png","type":"blob","size":500,"sha":"e"},
        ]
        self.assertEqual([f["path"] for f in module.plan_files(tree)], ["src/app.py","src/util.ts"])

    def test_estimate_grows_with_bytes(self):
        self.assertGreater(module.estimated_tokens("hola"*200), module.estimated_tokens("hola"))

    def test_missing_secret_stops_before_network(self):
        with patch.object(module, "KEY", ""), patch.object(module, "github_json") as get:
            with self.assertRaisesRegex(RuntimeError, "missing"):
                module.main()
            get.assert_not_called()

    def test_html_contains_report_ids(self):
        html=(ROOT.parent/"intelligence.html").read_text(encoding="utf8")
        for phrase in ('id="report"','id="details"','latest.json','data.schema===2','textContent'):
            self.assertIn(phrase,html)

if __name__ == "__main__":
    unittest.main()
