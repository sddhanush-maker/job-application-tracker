# Job Application Tracker — Project Instructions

## Project goal

Build a backend-only Job Application Tracker using Java,
Spring Boot, Maven, and MySQL. Expose functionality through REST APIs.

## Working rules

- Inspect existing files before proposing or making changes.
- Implement one feature at a time.
- Do not rewrite unrelated files or regenerate the entire project.
- Explain which files will change and why before making significant changes.
- Ask before deleting files, changing dependencies, or changing the agreed API contract.
- Never claim a build or test passed unless it was actually run and passed.
- Do not leave compilation errors or ignore failing tests.

## Architecture

- Controller: handles HTTP requests and responses.
- Service: contains business logic.
- Repository: handles database access.
- Entity: represents persistent data.
- DTO: represents request and response data where appropriate.
- Keep responsibilities separate and use constructor injection.

## Database and API consistency

- MySQL is the application's database.
- Agree on entity fields, database columns, and REST endpoints before implementation.
- Keep Java field names, mappings, DTOs, and database columns consistent.
- Validate incoming requests and return suitable HTTP status codes.
- Never silently rename an existing field or endpoint.

## Testing and version control

- Use Maven for builds and tests.
- Run relevant tests after each feature.
- Review Git diffs before committing.
- Never commit passwords, tokens, or other secrets.
- Update README.md when project setup or API behavior changes.

## Communication

- Explain code in beginner-friendly language.
- Provide exact terminal commands and expected results.
- If a command fails, diagnose the actual error before continuing.
- Do not proceed to the next milestone until the current milestone is verified.
