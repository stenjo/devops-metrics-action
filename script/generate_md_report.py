"""Generate MD report based on a json report"""

import json
import os
import sys
from collections import defaultdict
from urllib.parse import quote


def load_json_file(file_path: str) -> dict:
    """Load JSON data from a file."""
    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)


def count_mutation_statuses(report: dict) -> dict:
    """Count the mutation statuses"""
    status_counts = {}
    total_counts: dict = defaultdict(int)

    for file_name, file_data in report["files"].items():
        counts: dict = defaultdict(int)

        for mutant in file_data["mutants"]:
            counts[mutant["status"]] += 1
            total_counts[mutant["status"]] += 1

        # Calculate the mutation score as the percentage of killed mutants over
        # all mutants that are either killed, survived, or timed out.
        killed = counts["Killed"]
        survived = counts["Survived"]
        timeout = counts["Timeout"]
        total_relevant = killed + survived + timeout

        score = (killed / total_relevant * 100) if total_relevant > 0 else 0

        # Store the filename (without the path) and the mutation statistics
        status_counts[os.path.basename(file_name)] = {
            "score": score,
            "killed": killed,
            "timeout": timeout,
            "survived": survived,
            "no_cov": counts["NoCoverage"],
            "errors": counts["CompileError"],
            "file_name": file_name,  # Store full path for linking
        }

    # Calculate overall totals
    total_counts["Timeout"] = total_counts["Timeout"]
    total_relevant = (
        total_counts["Killed"] + total_counts["Survived"] + total_counts["Timeout"]
    )

    total_score = (
        (total_counts["Killed"] / total_relevant * 100) if total_relevant > 0 else 0
    )

    status_counts["All"] = {
        "score": total_score,
        "killed": total_counts["Killed"],
        "timeout": total_counts["Timeout"],
        "survived": total_counts["Survived"],
        "no_cov": total_counts["NoCoverage"],
        "errors": total_counts["CompileError"],
        "file_name": None,  # No link for the total row
    }

    return status_counts


def generate_markdown_report(status_counts: dict, url: str) -> str:
    """Generate a Markdown report summarizing
    mutation status counts per file."""
    markdown = "# Stryker report\n\n"
    markdown += "| File                  | % score | # killed \
        | # timeout | # survived | # no cov | # errors |\n"
    markdown += "|-----------------------|---------|----------\
        |-----------|------------|----------|----------|\n"

    for file_name, counts in status_counts.items():
        if counts["file_name"]:
            # Remove 'src/' from the file path and create
            # a URL link to the mutation report
            relative_path = counts["file_name"].replace("src/", "")
            link = f"{url}#mutant/{quote(relative_path)}"
            file_link = f"[{file_name}]({link})"
        else:
            file_link = file_name

        markdown += f"| {file_link:<22} | {counts['score']:7.2f} | \
            {counts['killed']:8} | {counts['timeout']:9} | \
            {counts['survived']:10} | {counts['no_cov']:8} | \
            {counts['errors']:8} |\n"

    return markdown


def save_markdown_file(markdown: str, output_path: str) -> None:
    """Save the generated Markdown report to a file."""
    with open(output_path, "w", encoding="utf-8") as file:
        file.write(markdown)
    print(f"Markdown report generated at {output_path}")


def main(file: str, out_file: str, url: str):
    """Main function to process the mutation report and generate a summary."""
    # Load the JSON data
    mutation_report = load_json_file(file)

    # Count the mutation statuses per file and calculate scores
    status_counts = count_mutation_statuses(mutation_report)

    # Generate the Markdown report
    markdown_report = generate_markdown_report(status_counts, url)

    # Save the Markdown report to a file
    save_markdown_file(markdown_report, out_file)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(
            "Usage: python generate_stryker_report.py \
            <input_json_file> <output_md_file> <base_url>"
        )
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]
    base_url = sys.argv[3]

    main(input_file, output_file, base_url)
