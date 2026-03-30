# 🔧 Making LiveScriptor’s AI a True Pair Programmer

## The Problem

Currently, LiveScriptor’s built‑in AI is just a **chat interface**.  
It cannot:

- See the code you’re currently editing  
- Read or write files directly  
- Insert, replace, or delete code in the editor  
- Run your project or capture terminal output  
- Read lint errors, test failures, or console logs  

This turns the AI into a **brain without hands** – it can advise, but not act.

---

## The Goal

Transform LiveScriptor’s AI into a **fully interactive pair programmer** that can:

- **Observe** – read the current file, selection, cursor position, diagnostics  
- **Act** – edit code, create/delete files, run commands, apply fixes  
- **Iterate** – see results (output, errors) and adjust its behaviour  

All without copying and pasting code back and forth.

---

## Solution Overview – Tool‑Enabled AI

Modern LLM APIs (OpenAI, Anthropic, Gemini, Grok) support **function calling** (tools).  
The idea:

1. LiveScriptor exposes a set of **editor & system actions** as callable tools.  
2. When you ask the AI something, the backend sends the **tool definitions** alongside your prompt.  
3. If the AI decides it needs to act (e.g., “fix this error”), it returns a `tool_call`.  
4. LiveScriptor executes the tool (read a file, edit the editor, run the project).  
5. The result is sent back to the AI, which then continues the conversation or performs further actions.

The AI becomes **active** – it can read your code, write changes, run the program, see the output, and fix issues in a loop.

---

## Required Capabilities (Tools to Implement)

### Editor & File Tools

| Tool Name | What It Does |
|-----------|---------------|
| `get_current_file` | Returns full content of the active editor tab, plus its file path |
| `get_selection` | Returns selected text + cursor position (line, column) |
| `write_file(path, content)` | Writes content to a file (if no path, replaces current file) |
| `insert_at_cursor(text)` | Inserts text at the current cursor position |
| `replace_range(start, end, text)` | Replaces a specific range (lines/columns) with new text |
| `create_file(path, content)` | Creates a new file in the workspace |
| `delete_file(path)` | Moves file to trash (with confirmation) |
| `list_directory(path)` | Lists files/folders in workspace |

### Execution & Debugging Tools

| Tool Name | What It Does |
|-----------|---------------|
| `run_current_file` | Triggers LiveScriptor’s “Run” button (or equivalent) |
| `run_command(command)` | Executes a terminal command in the workspace (PowerShell, node, etc.) |
| `get_terminal_output` | Returns the last terminal output (stdout/stderr) |
| `get_lint_errors` | Returns current Monaco diagnostics (errors, warnings) |
| `get_console_logs` | Captures browser/Node console output (if applicable) |

### Workspace & Project Tools

| Tool Name | What It Does |
|-----------|---------------|
| `get_project_structure` | Returns a tree view of the opened workspace |
| `search_in_files(query)` | Searches all files for a string/regex |
| `install_package(package_name)` | Runs `npm install` or equivalent in the workspace |

---

## Integration Architecture (High‑Level)

1. **Frontend (React + Monaco)**  
   - Exposes a global `window.LiveScriptorAPI` that contains functions for each tool.  
   - These functions directly manipulate the editor (read content, insert text, etc.).

2. **Backend (Express server inside LiveScriptor)**  
   - Adds a new endpoint: `/api/chat/tools` or extends existing chat endpoint.  
   - When user sends a message, the backend builds the OpenAI/Anthropic request including tool definitions.  
   - If the AI returns a `tool_call`, the backend executes the corresponding frontend API (via WebSocket, IPC, or `fetch` to a local frontend endpoint).  
   - The tool result is fed back to the AI, and the final answer is streamed to the chat UI.

3. **Security & Confirmation**  
   - Destructive actions (delete file, run shell commands) should trigger a confirmation dialog inside LiveScriptor.  
   - Optionally, a “sandbox mode” can limit which tools are available.

---

## User Experience Flow

**Example:** You have a bug in `app.js` (line 12). You type:

> “Fix the undefined variable error on line 12”

**Behind the scenes:**

1. AI calls `get_current_file` → sees the code.  
2. AI calls `get_lint_errors` → sees “variable ‘x’ is not defined”.  
3. AI determines the fix: declare `let x = 0;` before using it.  
4. AI calls `insert_at_cursor("let x = 0;\n")` at line 11.  
5. AI calls `run_current_file` → executes the code.  
6. AI calls `get_terminal_output` → sees no errors.  
7. AI responds: “✅ Fixed! I added the missing variable declaration on line 11. The script now runs without errors.”

The user sees **no copy‑paste** – just the result.

---

## Roadmap to Implement

### Phase 1 – Read‑Only Tools
- `get_current_file`, `get_selection`, `get_lint_errors`, `list_directory`  
- Proves the AI can “see” the editor.

### Phase 2 – Edit Tools
- `write_file`, `insert_at_cursor`, `replace_range`, `create_file`  
- AI can now modify code directly.

### Phase 3 – Execution & Feedback
- `run_current_file`, `run_command`, `get_terminal_output`  
- AI becomes a full loop: read → edit → run → verify → iterate.

### Phase 4 – Advanced Tools
- `search_in_files`, `install_package`, project‑aware refactoring  
- AI can manage the entire development workflow.

---

## Benefits Over Current Chat

| Current Chat | Tool‑Enabled AI |
|--------------|------------------|
| Manually copy code to AI | AI reads code automatically |
| Manually paste fixes back | AI writes changes directly |
| No way to run and see output | AI can run, see errors, and self‑correct |
| Passive advice | Active pair programming |
| Breaks flow | Seamless integration |

---

## Conclusion

By adding **tool calling** to LiveScriptor’s AI integration, you turn a simple chat into a **true pair programmer** that lives *inside* your editor.  
The AI can read, write, run, and debug – just like a human sitting next to you.  

This is the difference between a “copilot” that only suggests and a **driver** that actually does the work.  

**Implement this, and LiveScriptor becomes the most powerful self‑hosted IDE on Windows.** 🚀