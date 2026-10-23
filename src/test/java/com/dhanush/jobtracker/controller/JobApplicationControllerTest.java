package com.dhanush.jobtracker.controller;

import com.dhanush.jobtracker.entity.JobApplication;
import com.dhanush.jobtracker.entity.ApplicationStatus;
import com.dhanush.jobtracker.service.JobApplicationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class JobApplicationControllerTest {

    private static final String VALID_REQUEST = """
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
            """;

    @Mock
    private JobApplicationService service;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(new JobApplicationController(service))
                .setControllerAdvice(new ApiExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    void createApplicationReturnsCreatedStatusAndDoesNotAcceptClientId() throws Exception {
        JobApplication savedApplication = sampleApplication();
        savedApplication.setId(1L);
        when(service.createApplication(any())).thenReturn(savedApplication);

        mockMvc.perform(post("/api/applications")
                        .contentType("application/json")
                        .content(VALID_REQUEST.replace(
                                "\"companyName\": \"TCS\"",
                                "\"id\": 99,\n  \"companyName\": \"TCS\"")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.companyName").value("TCS"));

        ArgumentCaptor<JobApplication> applicationCaptor =
                ArgumentCaptor.forClass(JobApplication.class);
        verify(service).createApplication(applicationCaptor.capture());
        assertNull(applicationCaptor.getValue().getId());
    }

    @Test
    void getAllApplicationsReturnsOk() throws Exception {
        when(service.getAllApplications()).thenReturn(List.of(sampleApplication()));

        mockMvc.perform(get("/api/applications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].companyName").value("TCS"));
    }

    @Test
    void getApplicationByIdReturnsOk() throws Exception {
        when(service.getApplicationById(1L)).thenReturn(sampleApplication());

        mockMvc.perform(get("/api/applications/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobTitle").value("Java Developer"));
    }

    @Test
    void applicationApiAllowsTheDocumentedFrontendOrigin() throws Exception {
        when(service.getAllApplications()).thenReturn(List.of());

        mockMvc.perform(get("/api/applications")
                        .header("Origin", "http://localhost:5500"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5500"));
    }

    @Test
    void missingApplicationReturnsNotFound() throws Exception {
        when(service.getApplicationById(42L)).thenThrow(new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Job application not found with ID 42"));

        mockMvc.perform(get("/api/applications/42"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message")
                        .value("Job application not found with ID 42"));
    }

    @Test
    void updateApplicationReturnsOk() throws Exception {
        when(service.updateApplication(eq(1L), any())).thenReturn(sampleApplication());

        mockMvc.perform(put("/api/applications/1")
                        .contentType("application/json")
                        .content(VALID_REQUEST))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPLIED"));
    }

    @Test
    void updateRequiresDateAndStatusForFullReplacement() throws Exception {
        String requestWithoutDateOrStatus = """
                {"companyName":"TCS","jobTitle":"Java Developer"}
                """;

        mockMvc.perform(put("/api/applications/1")
                        .contentType("application/json")
                        .content(requestWithoutDateOrStatus))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("applicationDate and status are required for a full update"));

        verify(service, never()).updateApplication(eq(1L), any());
    }

    @Test
    void deleteApplicationReturnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/applications/1"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        verify(service).deleteApplication(1L);
    }

    @Test
    void invalidRequiredFieldsReturnHelpfulBadRequest() throws Exception {
        String invalidRequest = """
                {"companyName":" ","jobTitle":""}
                """;

        mockMvc.perform(post("/api/applications")
                        .contentType("application/json")
                        .content(invalidRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Request validation failed"))
                .andExpect(jsonPath("$.errors.companyName").exists())
                .andExpect(jsonPath("$.errors.jobTitle").exists());
    }

    @Test
    void invalidJobUrlReturnsBadRequest() throws Exception {
        String invalidUrlRequest = VALID_REQUEST.replace(
                "https://example.com/jobs/123", "not-a-url");

        mockMvc.perform(post("/api/applications")
                        .contentType("application/json")
                        .content(invalidUrlRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.jobUrl").exists());
    }

    @Test
    void malformedJsonValuesReturnSafeBadRequest() throws Exception {
        String invalidDateRequest = VALID_REQUEST.replace(
                "2026-10-23", "not-a-date");

        mockMvc.perform(post("/api/applications")
                        .contentType("application/json")
                        .content(invalidDateRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Request body contains invalid JSON, date, or status values"));
    }

    private JobApplication sampleApplication() {
        JobApplication application = new JobApplication();
        application.setCompanyName("TCS");
        application.setJobTitle("Java Developer");
        application.setApplicationDate(LocalDate.of(2026, 10, 23));
        application.setStatus(ApplicationStatus.APPLIED);
        return application;
    }
}
