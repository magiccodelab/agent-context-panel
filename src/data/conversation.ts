import type { Localized } from "./mock";

export type Step =
  | { kind: "thinking"; seconds: number }
  | { kind: "shell"; command: string }
  | { kind: "file"; action: "edit" | "write"; path: string; added: number; removed: number };

export const conversation = {
  prompt: { en: "Update the issue body with the screenshot links", zh: "更新 Issue 正文，附上截图链接" } satisfies Localized,
  toolSummary: { count: 46, kinds: ["shell", "read", "search", "write", "edit"] as const },
  steps: [
    { kind: "thinking", seconds: 1 },
    { kind: "shell", command: "cd ~/workspace/app && sed -n 300,330p packages/ui/src/tabs.tsx" },
    { kind: "thinking", seconds: 2 },
    { kind: "shell", command: 'cd ~/workspace/app && rg -n "command" packages/app/src' },
    { kind: "thinking", seconds: 5 },
    { kind: "shell", command: 'gh issue list -R example-org/app --search "tab overflow"' },
    { kind: "thinking", seconds: 19 },
    { kind: "file", action: "write", path: "/tmp/demo/issue-draft.md", added: 57, removed: 0 },
    { kind: "thinking", seconds: 1 },
    { kind: "shell", command: 'gh issue create -R example-org/app --title "Tab bar overflows" --body-file /tmp/demo/issue-draft.md' },
    { kind: "thinking", seconds: 1 },
    { kind: "shell", command: "gh repo view example-org/issue-assets --json name,isPrivate" },
    { kind: "thinking", seconds: 1 },
    { kind: "shell", command: 'gh repo create example-org/issue-assets --public --description "Issue screenshots"' },
    { kind: "thinking", seconds: 2 },
    { kind: "file", action: "write", path: "/tmp/demo/upload-images.sh", added: 9, removed: 0 },
    { kind: "shell", command: "bash /tmp/demo/upload-images.sh 2>&1" },
    { kind: "thinking", seconds: 1 },
    { kind: "shell", command: "curl -sSI https://raw.example.com/example-org/issue-assets/main/01.png" },
    { kind: "thinking", seconds: 2 },
    { kind: "file", action: "edit", path: "/tmp/demo/issue-draft.md", added: 2, removed: 2 },
  ] satisfies Step[] as Step[],
};

export const AGENT_IDS = ["build", "plan"] as const;
export const EFFORT_IDS = ["low", "medium", "high"] as const;
export const MODEL_OPTIONS = [
  { value: "model-x-flash", label: "Provider-A / Model-X 4.1 Flash" },
  { value: "model-x-pro", label: "Provider-A / Model-X 4.1 Pro" },
  { value: "model-y", label: "Provider-B / Model-Y 2" },
];
