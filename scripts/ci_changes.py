"""Select CI jobs from a complete git diff; unknown paths run every check."""

import argparse
import os
import subprocess
import sys


def classify(paths, event):
    result = dict.fromkeys(("frontend", "backend", "docker", "full_browser"), False)
    if event != "pull_request":
        return dict.fromkeys(result, True)
    for path in paths:
        if path.startswith(("docs/", "archive/")) or path in {
            "README.md", "LICENSE", "AGENTS.md", ".github/PULL_REQUEST_TEMPLATE.md",
        } or path.startswith(".github/ISSUE_TEMPLATE/"):
            continue
        if path.startswith("frontend/"):
            result["frontend"] = result["docker"] = True
            # Shared identity, routing and build changes warrant the full suite pre-merge.
            if path.startswith((
                "frontend/e2e/", "frontend/src/core/", "frontend/src/app/",
                "frontend/src/services/", "frontend/src/lib/", "frontend/src/hooks/",
                "frontend/src/contexts/", "frontend/src/stores/",
                "frontend/src/utils/",
                "frontend/src/components/auth/", "frontend/src/components/shell/",
                "frontend/src/features/settings/", "frontend/src/features/marketplace/",
            )) or not path.startswith(("frontend/src/", "frontend/public/")):
                result["full_browser"] = True
            if path.rsplit("/", 1)[-1] in {
                "AuthCallbackPage.jsx", "OAuthCallbackPage.jsx", "LoginPage.jsx",
                "ResetPasswordPage.jsx", "SignupPage.jsx", "EndUserSignupPage.jsx",
                "PermissionGate.jsx",
                "proxy.ts", "instrumentation.ts",
            }:
                result["full_browser"] = True
        elif path.startswith("backend/"):
            # Backend changes can affect sessions and the unified production ingress.
            result["backend"] = result["docker"] = result["full_browser"] = True
        else:
            # CI, Docker, env, scripts and unfamiliar root paths are deliberately broad.
            return dict.fromkeys(result, True)
    return result


def changed_paths(base, head):
    if not base or not head or set(base) == {"0"}:
        raise ValueError("Missing diff revision")
    diff = subprocess.run(
        ["git", "diff", "--name-only", "--no-renames", "-z", base, head, "--"],
        check=True, stdout=subprocess.PIPE,
    )
    # No rename detection means both the deleted and added paths are classified.
    return diff.stdout.decode("utf-8").rstrip("\0").split("\0") if diff.stdout else []


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--event", required=True)
    parser.add_argument("--base")
    parser.add_argument("--head")
    args = parser.parse_args()
    try:
        paths = changed_paths(args.base, args.head) if args.event == "pull_request" else []
        result = classify(paths, args.event)
    except (ValueError, UnicodeError, subprocess.CalledProcessError) as error:
        print(f"::warning::Cannot determine changed paths; running all checks: {error}", file=sys.stderr)
        result = classify([], "workflow_dispatch")
    lines = [f"{key}={str(value).lower()}" for key, value in result.items()]
    print("\n".join(lines))
    if output := os.environ.get("GITHUB_OUTPUT"):
        with open(output, "a", encoding="utf-8") as stream:
            stream.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
