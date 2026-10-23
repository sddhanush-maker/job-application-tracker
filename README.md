# Job Application Tracker

A full-stack job search workspace for keeping application details, progress, and follow-ups in one place. The responsive browser dashboard is built with vanilla HTML, CSS, and JavaScript; a Java 25 and Spring Boot 4 REST API validates and manages records stored in MySQL.

| Backend | Frontend | Database |
| --- | --- | --- |
| Java 25 · Spring Boot 4.0.8 · Maven · REST | Vanilla JavaScript · HTML · CSS | MySQL · Spring Data JPA |

The backend runs at `http://localhost:8080`; serve the frontend at `http://localhost:5500` so browser requests match the API's configured CORS origin.

## Features

- Create a job application and default its date and status when they are omitted.
- List all applications or retrieve one by its ID.
- Fully update or delete an application.
- Validate required fields, text lengths, and supplied job URLs.
- Return HTTP 404 when an application ID does not exist.
- View real application statistics and manage saved applications in a responsive browser dashboard.
- Search, filter, and sort records locally in the browser.

## Technology stack

- Java 25
- Spring Boot 4.0.8
- Maven
- Spring Web MVC
- Spring Data JPA
- MySQL
- Jakarta Bean Validation
- JUnit 5, Mockito, and Spring MVC test support
- HTML5, CSS3, and vanilla JavaScript (no frontend package manager)

## Prerequisites

- JDK 25
- MySQL running locally
- A MySQL account with permission to use the `job_tracker` database

## Project structure

```text
src/main/java/com/dhanush/jobtracker/
├── JobTrackerApplication.java
├── controller/
│   ├── ApiExceptionHandler.java
│   ├── JobApplicationController.java
│   └── WelcomeController.java
├── entity/
│   ├── ApplicationStatus.java
│   └── JobApplication.java
├── repository/
│   └── JobApplicationRepository.java
└── service/
    └── JobApplicationService.java

frontend/
├── index.html
├── css/styles.css
└── js/
    ├── api.js
    └── app.js

run-all.bat
```

The controller handles HTTP requests, the service contains application operations, the repository handles database access, and the entity maps application records to database rows. The frontend calls the REST API directly; no frontend framework or package manager is required.

## Configure MySQL locally

The application uses the database name `job_tracker`. Create that database in MySQL before starting the backend. The datasource URL and username are configured in `src/main/resources/application.properties`; supply the database password through the `SPRING_DATASOURCE_PASSWORD` environment variable. Never commit credentials or paste them into this README.

For a PowerShell session, set the datasource settings using environment variables. Enter the password at the secure prompt; it will not be echoed:

```powershell
$env:SPRING_DATASOURCE_URL = "jdbc:mysql://localhost:3306/job_tracker"
$env:SPRING_DATASOURCE_USERNAME = "your-local-mysql-username"
$securePassword = Read-Host "MySQL password" -AsSecureString
$env:SPRING_DATASOURCE_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password
```

The frontend uses `http://localhost:8080/api/applications` by default. The application controller permits browser requests from exactly `http://localhost:5500`, the static-server origin in the instructions below. Do not switch to a wildcard CORS origin for local development.

## Start the full stack

From the project root, run:

```powershell
.\run-all.bat
```

The launcher starts the Spring Boot backend in a new terminal and opens the project in VS Code. It does **not** start the frontend server automatically: in VS Code, start Live Server and confirm the page is served from `http://localhost:5500`. The script currently changes directory to `D:\job tracking`; update that path if you cloned the repository elsewhere. Alternatively, use the manual startup steps below.

### Terminal 1 — start the backend

```powershell
cd "D:\job tracking"
.\mvnw.cmd spring-boot:run
```

The API is available at `http://localhost:8080`. The existing welcome endpoint is `GET /`.

### Terminal 2 — start the frontend

No npm install or frontend build is required. In a second PowerShell terminal:

```powershell
cd "D:\job tracking\frontend"
python -m http.server 5500
```

Open **http://localhost:5500** in your browser. Use `http://localhost:5500`, not a `file://` URL, so browser requests have the expected CORS origin. The API base URL is configured in `frontend/js/api.js`; change its default only if your backend uses a different local address.

## API endpoints

Base URL: `http://localhost:8080/api/applications`

| Method | Endpoint | Description | Success status |
|---|---|---|---|
| POST | `/api/applications` | Create an application | 201 Created |
| GET | `/api/applications` | List all applications | 200 OK |
| GET | `/api/applications/{id}` | Retrieve one application | 200 OK |
| PUT | `/api/applications/{id}` | Replace an existing application | 200 OK |
| DELETE | `/api/applications/{id}` | Delete an application | 204 No Content |

### Example JSON

```json
{
  "companyName": "TCS",
  "jobTitle": "Java Developer",
  "jobDescription": "Entry-level Java development role",
  "applicationDate": "2026-10-23",
  "status": "APPLIED",
  "jobLocation": "Chennai",
  "jobUrl": "https://example.com/jobs/123",
  "notes": "Applied through the company website"
}
```

For POST, `companyName` and `jobTitle` are required and cannot be blank. If `applicationDate` or `status` is omitted, they default to today's date and `APPLIED`. The status must be one of `SAVED`, `APPLIED`, `ASSESSMENT`, `INTERVIEWING`, `OFFERED`, `REJECTED`, or `WITHDRAWN`. The URL is optional; when provided, it must be a valid HTTP or HTTPS URL. Optional text fields may be omitted or set to `null`.

PUT uses full-update semantics: provide `companyName`, `jobTitle`, `applicationDate`, and `status` in each request. Optional fields omitted from the request are cleared. The ID comes from the URL and is not replaced by an ID in the JSON body.

### Test the API with PowerShell

Run these commands while both the backend and frontend are running:

```powershell
$baseUrl = "http://localhost:8080/api/applications"

$application = @{
    companyName = "TCS"
    jobTitle = "Java Developer"
    jobDescription = "Entry-level Java development role"
    applicationDate = "2026-10-23"
    status = "APPLIED"
    jobLocation = "Chennai"
    jobUrl = "https://example.com/jobs/123"
    notes = "Applied through the company website"
}

$created = Invoke-RestMethod -Method Post -Uri $baseUrl `
    -ContentType "application/json" `
    -Body ($application | ConvertTo-Json)
$created

Invoke-RestMethod -Method Get -Uri $baseUrl
Invoke-RestMethod -Method Get -Uri "$baseUrl/$($created.id)"

$updatedApplication = $application.Clone()
$updatedApplication.notes = "Recruiter follow-up planned"
Invoke-RestMethod -Method Put -Uri "$baseUrl/$($created.id)" `
    -ContentType "application/json" `
    -Body ($updatedApplication | ConvertTo-Json)

Invoke-RestMethod -Method Delete -Uri "$baseUrl/$($created.id)"
```

Expected success statuses are 201 for creation, 200 for retrieval and update, and 204 for deletion. Invalid request bodies return 400 with a safe validation message; an unknown ID returns 404.

## Run tests and package

From the project root:

```powershell
.\mvnw.cmd clean test
.\mvnw.cmd clean package
```

The automated service and controller tests use mocks and do not need a running MySQL server.

## Design notes

- `JobApplication` is a JPA entity mapped to the `job_applications` table. Its ID is generated by the database.
- `ApplicationStatus` is stored as text so its meaning does not depend on enum order.
- Bean Validation rejects blank company names and job titles, values exceeding their field limits, and malformed job URLs.
- The service looks up records before update or delete and reports a missing record as HTTP 404.
- The controller returns 201 after creation and 204 after deletion. It takes the ID from the URL for updates, keeping the stored ID unchanged.
- The exception handler returns useful 400 responses without exposing stack traces or internal exception details.
- Hibernate schema generation is configured for local development in `application.properties`; keep database credentials private and do not use this setup as a production migration strategy.

## Use the dashboard

- **Dashboard** shows counts calculated from records returned by the API, plus the five most recent applications.
- **My applications** lists all loaded records. Search checks company and job title; status filtering and sorting are applied in the browser, not on the server. Use **Clear filters** to restore the complete loaded list.
- **Add application** opens a form. Company and job title are required; the date defaults to today and status defaults to `APPLIED`. Optional fields can be left blank.
- **View**, **Edit**, and **Delete** are available for each record. Editing first loads the current record from the API, then sends a full PUT body with the record ID, date, status, and current form fields. Deletion asks for confirmation.
- Status labels use the backend's exact enum values. A posting link is shown only when it is a valid HTTP or HTTPS URL and opens in a protected new tab.
- The page displays loading, validation, success, empty-list, no-match, and backend connection states. Refresh reloads the records and statistics from the server.

### Troubleshooting

- **The dashboard says it cannot reach the backend:** make sure the Spring Boot process is still running at `http://localhost:8080`, then use **Try again** or the refresh button.
- **CORS or browser network error:** use the exact frontend URL `http://localhost:5500`. The backend allows this origin for the applications API. If you change the static-server host or port, update the narrowly scoped `@CrossOrigin` origin on `JobApplicationController` to match; do not allow every origin.
- **Port 5500 is already in use:** start Python's server on another port, then update the controller's allowed origin to the matching exact origin and reopen that URL. Alternatively, use the VS Code Live Server extension and configure the backend to allow its exact origin.
- **Python is unavailable:** open the project in VS Code, install/use the Live Server extension if available, then right-click `frontend/index.html` and choose **Open with Live Server**. Its usual default is port 5500; verify the displayed origin and match the controller's CORS origin if it differs. This does not add a dependency to the project.
- **Changes do not appear:** reload the page with `Ctrl+F5` to clear cached static files.
