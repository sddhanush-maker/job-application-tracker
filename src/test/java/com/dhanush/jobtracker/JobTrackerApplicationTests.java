package com.dhanush.jobtracker;

import com.dhanush.jobtracker.entity.JobApplication;
import com.dhanush.jobtracker.repository.JobApplicationRepository;
import com.dhanush.jobtracker.service.JobApplicationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JobTrackerApplicationTests {

	@Mock
	private JobApplicationRepository repository;

	@InjectMocks
	private JobApplicationService service;

	@Test
	void createApplicationSavesAndReturnsApplication() {
		JobApplication application = new JobApplication();
		when(repository.save(application)).thenReturn(application);

		JobApplication result = service.createApplication(application);

		assertEquals(application, result);
		verify(repository).save(application);
	}

	@Test
	void getAllApplicationsReturnsRepositoryResults() {
		List<JobApplication> applications = List.of(new JobApplication());
		when(repository.findAll()).thenReturn(applications);

		assertEquals(applications, service.getAllApplications());
	}

	@Test
	void getApplicationByIdReturnsMatchingApplication() {
		JobApplication application = new JobApplication();
		when(repository.findById(1L)).thenReturn(Optional.of(application));

		assertEquals(application, service.getApplicationById(1L));
	}

	@Test
	void updateApplicationCopiesFieldsWithoutReplacingExistingId() {
		JobApplication existing = new JobApplication();
		existing.setId(1L);
		JobApplication updated = new JobApplication();
		updated.setId(99L);
		updated.setCompanyName("Updated Company");
		updated.setJobTitle("Developer");
		when(repository.findById(1L)).thenReturn(Optional.of(existing));
		when(repository.save(existing)).thenReturn(existing);

		JobApplication result = service.updateApplication(1L, updated);

		assertEquals(1L, result.getId());
		assertEquals("Updated Company", result.getCompanyName());
		assertEquals("Developer", result.getJobTitle());
		verify(repository).save(existing);
	}

	@Test
	void missingApplicationRaisesNotFound() {
		when(repository.findById(42L)).thenReturn(Optional.empty());

		ResponseStatusException exception = assertThrows(
				ResponseStatusException.class,
				() -> service.getApplicationById(42L));

		assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
	}

	@Test
	void deleteApplicationDeletesExistingApplication() {
		JobApplication application = new JobApplication();
		when(repository.findById(1L)).thenReturn(Optional.of(application));

		service.deleteApplication(1L);

		verify(repository).delete(application);
	}
}
