import { Command, Option } from "commander";
import { runAnalysis } from "../config/index.js";

export const program = new Command();

program
  .name("github-issue-analyze")
  .description("Analyze GitHub issues to discover user pain points and needs")
  .version("1.0.0")
  .argument("<repo>", "GitHub repository in owner/name format (e.g., facebook/react)")
  .addOption(
    new Option("-s, --state <states>", "Issue states to include")
      .choices(["open", "closed", "all"])
      .default("open"),
  )
  .option("-l, --labels <labels...>", "Filter by label names")
  .option("--since <date>", "Only issues updated after this date (ISO 8601)")
  .option("--limit <number>", "Maximum number of issues to analyze", "500")
  .option("-o, --output <file>", "Output file path (default: stdout)")
  .option("-m, --model <model>", "OpenAI model to use", "gpt-4o")
  .option("--batch-size <number>", "Issues per LLM batch", "100")
  .option("--no-comments", "Exclude issue comments from analysis")
  .option("-v, --verbose", "Show detailed progress information")
  .option("--dry-run", "Fetch issues but skip LLM analysis")
  .addOption(
    new Option("--github-token <token>", "GitHub PAT (or set GITHUB_TOKEN env)").env(
      "GITHUB_TOKEN",
    ),
  )
  .addOption(
    new Option("--openai-key <key>", "OpenAI API key (or set OPENAI_API_KEY env)").env(
      "OPENAI_API_KEY",
    ),
  )
  .action(async (repo, options) => {
    await runAnalysis(repo, options);
  });
