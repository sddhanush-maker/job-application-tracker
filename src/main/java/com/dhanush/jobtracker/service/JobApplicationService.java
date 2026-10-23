package com.dhanush.jobtracker.service;

import com.dhanush.jobtracker.entity.JobApplication;
import com.dhanush.jobtracker.repository.JobApplicationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class JobApplicationService {

    private final JobApplicationRepository repository;

    public JobApplicationService(JobApplicationRepository repository) {
        this.repository = repository;
    }

    public JobApplication createApplication(JobApplication application) {
        return repository.save(application);
    }

    public List<JobApplication> getAllApplications() {
        return repository.findAll();
    }

    public JobApplication getApplicationById(Long id) {
        return findApplicationById(id);
    }

    public JobApplication updateApplication(Long id, JobApplication updatedApplication) {
        JobApplication existingApplication = findApplicationById(id);

        existingApplication.setCompanyName(updatedApplication.getCompanyName());
        existingApplication.setJobTitle(updatedApplication.getJobTitle());
        existingApplication.setJobDescription(updatedApplication.getJobDescription());
        existingApplication.setApplicationDate(updatedApplication.getApplicationDate());
        existingApplication.setStatus(updatedApplication.getStatus());
        existingApplication.setJobLocation(updatedApplication.getJobLocation());
        existingApplication.setJobUrl(updatedApplication.getJobUrl());
        existingApplication.setNotes(updatedApplication.getNotes());

        return repository.save(existingApplication);
    }

    public void deleteApplication(Long id) {
        repository.delete(findApplicationById(id));
    }

    private JobApplication findApplicationById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Job application not found with ID " + id));
    }
}
