import type OpenAI from "openai";

/**
 * All tool definitions that will be sent alongside user prompts to the LLM.
 * Uses the OpenAI function-calling format (compatible with all major providers).
 */
export const TOOL_DEFINITIONS: OpenAI.Chat.ChatCompletionTool[] = [
    // ── Read-Only Tools ──────────────────────────────────────────────
    {
        type: "function",
        function: {
            name: "get_file_content",
            description:
                "Read the full content of a file in the user's project workspace. Use this to understand what code the user has written.",
            parameters: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description:
                            "Relative file path from project root, e.g. 'src/app.js' or 'index.html'",
                    },
                },
                required: ["path"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "list_directory",
            description:
                "List files and subdirectories in a given directory of the project. Returns names, types (file/directory), sizes, and extensions.",
            parameters: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description:
                            "Relative directory path from project root. Use '/' or '' for the root.",
                    },
                },
                required: ["path"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_project_structure",
            description:
                "Returns the entire recursive file tree of the project. Useful to understand the overall project layout before diving into specific files.",
            parameters: {
                type: "object",
                properties: {},
            },
        },
    },
    {
        type: "function",
        function: {
            name: "search_in_files",
            description:
                "Search for a text pattern across all files in the project. Returns matching file paths, line numbers, and line content.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The text or pattern to search for",
                    },
                    caseSensitive: {
                        type: "boolean",
                        description: "Whether the search should be case-sensitive (default: false)",
                    },
                    filePattern: {
                        type: "string",
                        description:
                            "Optional glob pattern to filter files, e.g. '*.ts' or '*.html'",
                    },
                },
                required: ["query"],
            },
        },
    },

    // ── Edit Tools ───────────────────────────────────────────────────
    {
        type: "function",
        function: {
            name: "write_file",
            description:
                "Write (overwrite) the entire content of a file. If the file exists it will be replaced. If it does not exist it will be created along with any missing parent directories.",
            parameters: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "Relative file path from project root",
                    },
                    content: {
                        type: "string",
                        description: "The full new content of the file",
                    },
                },
                required: ["path", "content"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "create_file",
            description:
                "Create a new file in the project workspace with the given content. Parent directories will be created automatically.",
            parameters: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "Relative file path from project root",
                    },
                    content: {
                        type: "string",
                        description: "Initial content for the new file",
                    },
                },
                required: ["path", "content"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "delete_file",
            description:
                "Delete a file from the project workspace. Use with caution.",
            parameters: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "Relative file path to delete",
                    },
                },
                required: ["path"],
            },
        },
    },

    // ── Execution & Debugging Tools ──────────────────────────────────
    {
        type: "function",
        function: {
            name: "run_command",
            description:
                "Execute a shell command (PowerShell on Windows) in the project directory. Returns stdout, stderr, and exit code. Use for running scripts, installing packages, building, testing, etc.",
            parameters: {
                type: "object",
                properties: {
                    command: {
                        type: "string",
                        description:
                            "The shell command to execute, e.g. 'node index.js' or 'npm install express'",
                    },
                },
                required: ["command"],
            },
        },
    },
];
