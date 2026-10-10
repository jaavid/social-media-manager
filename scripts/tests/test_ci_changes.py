import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("ci_changes", Path(__file__).parents[1] / "ci_changes.py")
ci = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ci)


class ChangeSelectionTests(unittest.TestCase):
    def test_documentation_and_archive_only_skip_expensive_jobs(self):
        result = ci.classify(["docs/DEPLOYMENT.md", "README.md", "archive/legacy-frontend/src/App.js"], "pull_request")
        self.assertFalse(any(result.values()))

    def test_feature_changes_keep_full_jest_and_browser_smoke(self):
        result = ci.classify(["frontend/src/features/posts/Post.jsx"], "pull_request")
        self.assertEqual(result, {"frontend": True, "backend": False, "docker": True, "full_browser": False})

    def test_backend_only_still_tests_browser_integration(self):
        result = ci.classify(["backend/social_stats/views.py"], "pull_request")
        self.assertEqual(result, {"frontend": False, "backend": True, "docker": True, "full_browser": True})

    def test_high_risk_frontend_paths_require_full_browser(self):
        for path in ["frontend/package-lock.json", "frontend/next.config.mjs", "frontend/e2e/new.spec.js", "frontend/src/core/session/Auth.jsx", "frontend/src/services/api.js", "frontend/src/app/layout.tsx", "frontend/src/lib/session.ts", "frontend/src/contexts/AuthContext.js", "frontend/src/features/LoginPage.jsx", "frontend/src/components/ui/PermissionGate.jsx", "frontend/src/proxy.ts", "frontend/src/instrumentation.ts"]:
            with self.subTest(path=path):
                self.assertTrue(ci.classify([path], "pull_request")["full_browser"])

    def test_unknown_and_ci_paths_run_all_jobs(self):
        for path in [".github/workflows/tests.yml", "Dockerfile", "compose.yml", "scripts/ci_changes.py", "new-root-config"]:
            with self.subTest(path=path):
                self.assertTrue(all(ci.classify([path], "pull_request").values()))

    def test_mixed_changes_are_combined(self):
        self.assertTrue(all(ci.classify(["docs/a.md", "frontend/src/features/a.jsx", "backend/a.py"], "pull_request").values()))

    def test_push_schedule_and_manual_run_all_jobs(self):
        for event in ["push", "schedule", "workflow_dispatch"]:
            self.assertTrue(all(ci.classify([], event).values()))

    def test_git_diff_covers_deletion_and_rename_into_docs(self):
        with tempfile.TemporaryDirectory() as tmp:
            def git(*args):
                return subprocess.check_output(["git", "-C", tmp, *args], text=True).strip()
            git("init", "-q")
            git("config", "user.name", "CI test")
            git("config", "user.email", "ci@example.invalid")
            source = Path(tmp, "frontend/src/core/session.js")
            source.parent.mkdir(parents=True)
            source.write_text("identity\n")
            git("add", ".")
            git("commit", "-qm", "base")
            base = git("rev-parse", "HEAD")
            Path(tmp, "docs").mkdir()
            git("mv", "frontend/src/core/session.js", "docs/session.js")
            git("commit", "-qm", "move")
            # Resolve commits in the temporary repository without changing process cwd.
            from unittest.mock import patch
            run = subprocess.run
            with patch.object(ci.subprocess, "run", side_effect=lambda args, **kwargs: run(args, cwd=tmp, **kwargs)):
                paths = ci.changed_paths(base, git("rev-parse", "HEAD"))
            self.assertIn("frontend/src/core/session.js", paths)
            self.assertIn("docs/session.js", paths)
            self.assertTrue(ci.classify(paths, "pull_request")["full_browser"])

    def test_missing_revision_falls_back_to_all_checks(self):
        script = Path(__file__).parents[1] / "ci_changes.py"
        proc = subprocess.run(["python3", str(script), "--event", "pull_request"], capture_output=True, text=True, check=True)
        self.assertIn("full_browser=true", proc.stdout)
        self.assertIn("frontend=true", proc.stdout)
        self.assertIn("running all checks", proc.stderr)


if __name__ == "__main__":
    unittest.main()
