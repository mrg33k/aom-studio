#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PROJECT_ROOT = process.argv[2];
const OUTPUT_FILE = process.argv[3];

if (!PROJECT_ROOT || !OUTPUT_FILE) {
  console.error(
    "Usage: node ua-project-scan.js <project-root> <output-file>"
  );
  process.exit(1);
}

if (!fs.existsSync(PROJECT_ROOT)) {
  console.error(`Error: Project root does not exist: ${PROJECT_ROOT}`);
  process.exit(1);
}

// Step 1: File Discovery via git ls-files or fallback to recursive listing
function discoverFiles(root) {
  let files = [];
  try {
    const result = execSync(`cd "${root}" && git ls-files`, {
      encoding: "utf-8",
    });
    files = result
      .split("\n")
      .filter((f) => f.trim())
      .map((f) => path.join(root, f))
      .filter((f) => fs.existsSync(f) && fs.statSync(f).isFile());
  } catch (e) {
    console.error("git ls-files failed, falling back to recursive listing");
    function walk(dir) {
      if (!fs.existsSync(dir)) return [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      let result = [];
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (
            ![".git", "node_modules", ".idea", ".vscode"].includes(
              entry.name
            )
          ) {
            result = result.concat(walk(fullPath));
          }
        } else {
          result.push(fullPath);
        }
      }
      return result;
    }
    files = walk(root);
  }
  return files;
}

// Step 2: Hardcoded Exclusion Filter
function applyHardcodedFilter(files) {
  const patterns = [
    "node_modules/",
    ".git/",
    "vendor/",
    "venv/",
    ".venv/",
    "__pycache__/",
    "dist/",
    "build/",
    "out/",
    "coverage/",
    ".next/",
    ".cache/",
    ".turbo/",
    "target/",
    "obj/",
    /\.(lock|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp3|mp4|pdf|zip|tar|gz)$/,
    /\.min\.(js|css)$/,
    /\.map$/,
    /\.generated\..+$/,
    "LICENSE",
    ".gitignore",
    ".editorconfig",
    ".prettierrc",
    /\.eslintrc/,
    /\.log$/,
  ];

  return files.filter((file) => {
    const rel = path.relative(PROJECT_ROOT, file);
    for (const pattern of patterns) {
      if (typeof pattern === "string") {
        if (rel.includes(pattern) || rel.endsWith(pattern)) return false;
      } else if (pattern instanceof RegExp) {
        if (pattern.test(rel)) return false;
      }
    }
    return true;
  });
}

// Step 3: Language Detection
function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const name = path.basename(filePath);

  const langMap = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".py": "python",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".rb": "ruby",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".h": "cpp",
    ".hpp": "cpp",
    ".c": "c",
    ".cs": "csharp",
    ".swift": "swift",
    ".kt": "kotlin",
    ".php": "php",
    ".vue": "vue",
    ".svelte": "svelte",
    ".sh": "shell",
    ".bash": "shell",
    ".ps1": "powershell",
    ".bat": "batch",
    ".cmd": "batch",
    ".md": "markdown",
    ".rst": "markdown",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".json": "json",
    ".jsonc": "jsonc",
    ".toml": "toml",
    ".sql": "sql",
    ".graphql": "graphql",
    ".gql": "graphql",
    ".proto": "protobuf",
    ".tf": "terraform",
    ".tfvars": "terraform",
    ".html": "html",
    ".htm": "html",
    ".css": "css",
    ".scss": "css",
    ".sass": "css",
    ".less": "css",
    ".xml": "xml",
  };

  if (langMap[ext]) return langMap[ext];
  if (name === "Dockerfile") return "dockerfile";
  if (name === "Makefile") return "makefile";
  if (name === "Jenkinsfile") return "jenkinsfile";
  if (ext === ".env") return "config";
  if (ext) return ext.substring(1).toLowerCase();
  return "unknown";
}

// Step 4: File Category Detection
function detectFileCategory(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const name = path.basename(filePath);
  const rel = path.relative(PROJECT_ROOT, filePath);

  const docsExts = [".md", ".rst", ".txt"];
  if (docsExts.includes(ext) && name !== "LICENSE") return "docs";

  const configExts = [".yaml", ".yml", ".json", ".jsonc", ".toml", ".xml", ".cfg", ".ini", ".env"];
  const configNames = [
    "tsconfig.json",
    "package.json",
    "pyproject.toml",
    "Cargo.toml",
    "go.mod",
  ];
  if (configExts.includes(ext) || configNames.includes(name))
    return "config";

  const infraNames = [
    "Dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
    "Makefile",
    "Jenkinsfile",
    "Procfile",
    "Vagrantfile",
  ];
  const infraExts = [".tf", ".tfvars"];
  if (infraNames.includes(name) || infraExts.includes(ext)) return "infra";
  if (rel.includes(".github/workflows/") || rel.endsWith(".yml")) {
    if (rel.includes(".github/") || rel.includes(".gitlab-ci")) return "infra";
  }

  const dataExts = [".sql", ".graphql", ".gql", ".proto", ".prisma", ".csv"];
  if (dataExts.includes(ext)) return "data";
  if (name.endsWith(".schema.json")) return "data";

  const scriptExts = [".sh", ".bash", ".ps1", ".bat"];
  if (scriptExts.includes(ext)) return "script";

  const markupExts = [".html", ".htm", ".css", ".scss", ".sass", ".less"];
  if (markupExts.includes(ext)) return "markup";

  return "code";
}

// Step 5: Line Counting
function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return content.split("\n").length;
  } catch (e) {
    return 0;
  }
}

// Step 6: Framework Detection
function detectFrameworks(files, pkgJsonPath) {
  const frameworks = [];

  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const depNames = Object.keys(deps);

      const fwkMap = {
        react: "React",
        vue: "Vue",
        svelte: "Svelte",
        "@angular/core": "Angular",
        express: "Express",
        fastify: "Fastify",
        koa: "Koa",
        next: "Next.js",
        nuxt: "Nuxt",
        vite: "Vite",
        vitest: "Vitest",
        jest: "Jest",
        mocha: "Mocha",
        tailwindcss: "Tailwind CSS",
        prisma: "Prisma",
        typeorm: "TypeORM",
        sequelize: "Sequelize",
        mongoose: "Mongoose",
        redux: "Redux",
        zustand: "Zustand",
        mobx: "MobX",
      };

      for (const dep of depNames) {
        if (fwkMap[dep] && !frameworks.includes(fwkMap[dep])) {
          frameworks.push(fwkMap[dep]);
        }
      }

      if (fs.existsSync(path.join(PROJECT_ROOT, "tsconfig.json"))) {
        if (!frameworks.includes("TypeScript"))
          frameworks.push("TypeScript");
      }
    } catch (e) {
      console.error("Error reading package.json:", e.message);
    }
  }

  // Infrastructure detection
  const rel_files = files.map((f) => path.relative(PROJECT_ROOT, f));
  if (rel_files.some((f) => f === "Dockerfile"))
    if (!frameworks.includes("Docker")) frameworks.push("Docker");
  if (
    rel_files.some((f) => f === "docker-compose.yml" || f === "docker-compose.yaml")
  )
    if (!frameworks.includes("Docker Compose"))
      frameworks.push("Docker Compose");
  if (rel_files.some((f) => f.startsWith(".github/workflows/")))
    if (!frameworks.includes("GitHub Actions"))
      frameworks.push("GitHub Actions");
  if (rel_files.some((f) => f.endsWith(".tf")))
    if (!frameworks.includes("Terraform")) frameworks.push("Terraform");

  return frameworks;
}

// Step 7: Import Resolution (TypeScript/JavaScript focus for aom-studio)
function resolveImports(filePath, allFiles, fileMap) {
  const relPath = path.relative(PROJECT_ROOT, filePath);
  const content = fs.readFileSync(filePath, "utf-8");
  const imports = [];

  // TypeScript/JavaScript import patterns
  const importPatterns = [
    /import\s+[^'"]*from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of importPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const importPath = match[1];
      if (!importPath.startsWith(".") || importPath.includes("node_modules"))
        continue;

      const resolvedPath = path.resolve(
        path.dirname(filePath),
        importPath
      );
      let relResolved = path.relative(PROJECT_ROOT, resolvedPath);
      relResolved = relResolved.replace(/\\/g, "/");

      // Probe extensions
      const probes = [
        relResolved,
        relResolved + ".ts",
        relResolved + ".tsx",
        relResolved + ".js",
        relResolved + ".jsx",
        relResolved + "/index.ts",
        relResolved + "/index.tsx",
        relResolved + "/index.js",
        relResolved + "/index.jsx",
      ];

      for (const probe of probes) {
        if (fileMap[probe]) {
          imports.push(probe);
          break;
        }
      }
    }
  }

  return [...new Set(imports)];
}

// Main execution
try {
  console.log(`Discovering files from ${PROJECT_ROOT}...`);
  let allFiles = discoverFiles(PROJECT_ROOT);
  console.log(`Found ${allFiles.length} files initially`);

  const beforeFilter = allFiles.length;
  allFiles = applyHardcodedFilter(allFiles);
  console.log(
    `After hardcoded filter: ${allFiles.length} files (filtered ${beforeFilter - allFiles.length})`
  );

  // Create relative path map for quick lookup
  const fileMap = {};
  const fileList = allFiles.map((f) => {
    const rel = path.relative(PROJECT_ROOT, f).replace(/\\/g, "/");
    fileMap[rel] = f;
    return { fullPath: f, relPath: rel };
  });

  console.log(`Detecting languages and categories...`);
  const filesWithMeta = fileList.map(({ fullPath, relPath }) => {
    const language = detectLanguage(fullPath);
    const fileCategory = detectFileCategory(fullPath);
    const sizeLines = countLines(fullPath);
    return {
      path: relPath,
      language,
      sizeLines,
      fileCategory,
    };
  });

  console.log(`Detecting frameworks...`);
  const pkgJsonPath = path.join(PROJECT_ROOT, "package.json");
  const frameworks = detectFrameworks(
    filesWithMeta.map((f) => path.join(PROJECT_ROOT, f.path)),
    pkgJsonPath
  );

  console.log(`Resolving imports...`);
  const importMap = {};
  for (const fileMeta of filesWithMeta) {
    const fullPath = path.join(PROJECT_ROOT, fileMeta.path);
    if (fileMeta.fileCategory === "code") {
      importMap[fileMeta.path] = resolveImports(fullPath, allFiles, fileMap);
    } else {
      importMap[fileMeta.path] = [];
    }
  }

  console.log(`Extracting project metadata...`);
  let projectName = "unknown";
  let rawDescription = "";
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
      projectName = pkg.name || projectName;
      rawDescription = pkg.description || "";
    } catch (e) {
      console.error("Error parsing package.json");
    }
  }

  const estimatedComplexity =
    filesWithMeta.length <= 30
      ? "small"
      : filesWithMeta.length <= 150
        ? "moderate"
        : filesWithMeta.length <= 500
          ? "large"
          : "very-large";

  const languages = [
    ...new Set(filesWithMeta.map((f) => f.language)),
  ].sort();

  // Sort files by path
  filesWithMeta.sort((a, b) => a.path.localeCompare(b.path));

  const result = {
    scriptCompleted: true,
    name: projectName,
    rawDescription,
    readmeHead: "",
    languages,
    frameworks,
    files: filesWithMeta,
    totalFiles: filesWithMeta.length,
    filteredByIgnore: 0,
    estimatedComplexity,
    importMap,
  };

  console.log(`Writing results to ${OUTPUT_FILE}...`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log(`SUCCESS: Phase 1 scanner complete. ${result.totalFiles} files scanned.`);
  process.exit(0);
} catch (error) {
  console.error(`FATAL ERROR: ${error.message}`);
  process.exit(1);
}
